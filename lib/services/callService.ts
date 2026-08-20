import { supabase } from "../supabase";

export type CallType = "voice" | "video";
export type CallStatus =
  | "idle"
  | "calling"
  | "incoming"
  | "connecting"
  | "connected"
  | "ended"
  | "rejected"
  | "missed";

export interface CallState {
  id: string;
  type: CallType;
  status: CallStatus;
  contactName: string;
  contactAvatar: string;
  contactAddress?: string;
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeakerOn: boolean;
  isMinimized: boolean;
  durationSeconds: number;
  errorMessage?: string | null;
  hasPermissionError?: boolean;
}

// Helper to normalize user channel name safely
export function callChannelName(identifier: string) {
  const clean = (identifier || "").toLowerCase().trim().replace(/[^a-z0-9_]/g, "_");
  return `call_sig_${clean || "anon"}`;
}

// Shared Call Session Room channel
export function callRoomChannelName(callId: string) {
  const clean = (callId || "").toLowerCase().trim().replace(/[^a-z0-9_]/g, "_");
  return `call_room_${clean}`;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
  iceCandidatePoolSize: 10,
};

export class CallService {
  private listener: ((state: CallState) => void) | null = null;
  private timerInterval: any = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private iceCandidateQueue: RTCIceCandidateInit[] = [];

  private _ringTimeout: any = null;
  private _ringtoneInterval: any = null;
  private _ringtoneCtx: AudioContext | null = null;
  private _callerDialToneInterval: any = null;

  // Identity
  private myUserId: string = "";
  private myAliases: string[] = [];
  private myDisplayName: string = "Pulse Member";
  private myAvatarUrl: string = "";

  // Supabase channels
  private personalChannels: any[] = [];
  private activeRoomChannel: any = null;

  private state: CallState = {
    id: "",
    type: "voice",
    status: "idle",
    contactName: "",
    contactAvatar: "",
    contactAddress: "",
    isMuted: false,
    isCameraOff: false,
    isSpeakerOn: true,
    isMinimized: false,
    durationSeconds: 0,
    errorMessage: null,
    hasPermissionError: false,
  };

  // ─── State Subscription ────────────────────────────────────────────

  subscribe(callback: (state: CallState) => void) {
    this.listener = callback;
    callback({ ...this.state });
  }

  private notify() {
    if (this.listener) this.listener({ ...this.state });
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  // ─── Identity & Multi-Alias Registration ───────────────────────────

  setIdentity(
    userId: string,
    displayName: string,
    avatarUrl: string,
    aliases: string[] = []
  ) {
    const allAliases = Array.from(
      new Set([userId, ...aliases].filter(Boolean).map((a) => a.toLowerCase().trim()))
    );

    const isSame =
      this.myUserId === userId &&
      this.myAliases.length === allAliases.length &&
      this.myAliases.every((a, i) => a === allAliases[i]);

    this.myUserId = userId;
    this.myDisplayName = displayName || "Pulse Member";
    this.myAvatarUrl = avatarUrl || "";
    this.myAliases = allAliases;

    if (!isSame) {
      this.subscribeToPersonalChannels();
    }
  }

  // ─── Personal Realtime Channel Subscriptions (for incoming calls) ───

  private subscribeToPersonalChannels() {
    this.personalChannels.forEach((ch) => {
      try {
        supabase.removeChannel(ch);
      } catch {}
    });
    this.personalChannels = [];

    if (this.myAliases.length === 0) return;

    this.myAliases.forEach((alias) => {
      const channelName = callChannelName(alias);
      const ch = supabase
        .channel(channelName)
        .on("broadcast", { event: "incoming_call" }, ({ payload }: any) => {
          if (this.state.status !== "idle") return; // Busy
          // Don't ring self
          if (payload.callerId && this.myAliases.includes(payload.callerId.toLowerCase())) return;
          this._handleIncomingCallSignal(payload);
        })
        .subscribe();

      this.personalChannels.push(ch);
    });
  }

  // ─── Join Shared Call Room Channel ─────────────────────────────────

  private joinCallRoom(callId: string) {
    if (this.activeRoomChannel) {
      try {
        supabase.removeChannel(this.activeRoomChannel);
      } catch {}
      this.activeRoomChannel = null;
    }

    const roomName = callRoomChannelName(callId);
    const room = supabase.channel(roomName);

    room
      .on("broadcast", { event: "call_accepted" }, ({ payload }: any) => {
        if (payload.senderId && payload.senderId !== this.myUserId) {
          this._handleRemoteAccept();
        }
      })
      .on("broadcast", { event: "call_rejected" }, ({ payload }: any) => {
        if (payload.senderId && payload.senderId !== this.myUserId) {
          this._handleRemoteReject();
        }
      })
      .on("broadcast", { event: "call_ended" }, ({ payload }: any) => {
        if (payload.senderId && payload.senderId !== this.myUserId) {
          this._handleRemoteEnd();
        }
      })
      .on("broadcast", { event: "sdp_offer" }, async ({ payload }: any) => {
        if (payload.senderId && payload.senderId !== this.myUserId && payload.sdp) {
          await this._handleRemoteOffer(payload.sdp);
        }
      })
      .on("broadcast", { event: "sdp_answer" }, async ({ payload }: any) => {
        if (payload.senderId && payload.senderId !== this.myUserId && payload.sdp) {
          await this._handleRemoteAnswer(payload.sdp);
        }
      })
      .on("broadcast", { event: "ice_candidate" }, async ({ payload }: any) => {
        if (payload.senderId && payload.senderId !== this.myUserId && payload.candidate) {
          await this._handleRemoteIceCandidate(payload.candidate);
        }
      })
      .subscribe();

    this.activeRoomChannel = room;
  }

  // Send message inside active shared call room
  private broadcastInRoom(event: string, payload: Record<string, any>) {
    if (!this.activeRoomChannel) return;
    try {
      this.activeRoomChannel.send({
        type: "broadcast",
        event,
        payload: {
          ...payload,
          callId: this.state.id,
          senderId: this.myUserId,
        },
      });
    } catch (err) {
      console.warn(`[CallService] broadcastInRoom '${event}' error:`, err);
    }
  }

  // ─── START OUTGOING CALL (Caller) ──────────────────────────────────

  async startCall(
    contactName: string,
    contactAvatar: string,
    type: CallType = "voice",
    contactAddress?: string
  ) {
    this.cleanupPeer();
    this.cleanupStream();
    this._clearAllTones();

    const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    this.state = {
      id: callId,
      type,
      status: "calling",
      contactName,
      contactAvatar,
      contactAddress: contactAddress || "",
      isMuted: false,
      isCameraOff: false,
      isSpeakerOn: true,
      isMinimized: false,
      durationSeconds: 0,
      errorMessage: null,
      hasPermissionError: false,
    };
    this.notify();

    // 1. Join the shared room
    this.joinCallRoom(callId);

    // 2. Start outgoing dial tone
    this.startCallerDialTone();

    // 3. Acquire local audio/video media
    await this.acquireLocalMedia(type);

    // 4. Send incoming_call invitation to recipient's personal channel
    if (contactAddress && this.myUserId) {
      const recipientChannel = callChannelName(contactAddress);
      const ch = supabase.channel(recipientChannel);
      ch.subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          ch.send({
            type: "broadcast",
            event: "incoming_call",
            payload: {
              callId,
              callerId: this.myUserId,
              callerName: this.myDisplayName,
              callerAvatar: this.myAvatarUrl,
              callType: type,
            },
          }).finally(() => {
            setTimeout(() => {
              try {
                supabase.removeChannel(ch);
              } catch {}
            }, 600);
          });
        }
      });
    }

    // 45s Ring Timeout
    this._ringTimeout = setTimeout(() => {
      if (
        this.state.id === callId &&
        (this.state.status === "calling" || this.state.status === "connecting")
      ) {
        this.endCall();
      }
    }, 45000);
  }

  // ─── INCOMING CALL RECEIVED (Callee) ───────────────────────────────

  private _handleIncomingCallSignal(payload: any) {
    this.cleanupPeer();
    this.cleanupStream();
    this._clearAllTones();

    const callId = payload.callId || `call_in_${Date.now()}`;

    this.state = {
      id: callId,
      type: payload.callType || "voice",
      status: "incoming",
      contactName: payload.callerName || "Pulse Member",
      contactAvatar: payload.callerAvatar || "",
      contactAddress: payload.callerId || "",
      isMuted: false,
      isCameraOff: false,
      isSpeakerOn: true,
      isMinimized: false,
      durationSeconds: 0,
      errorMessage: null,
      hasPermissionError: false,
    };
    this.notify();

    // Join the shared room immediately
    this.joinCallRoom(callId);

    // Play incoming ringtone sound
    this.startIncomingRingtone();
  }

  // ─── ACCEPT CALL (Callee) ──────────────────────────────────────────

  async acceptCall() {
    if (this.state.status !== "incoming") return;

    this.stopIncomingRingtone();
    this.state.status = "connecting";
    this.notify();

    // 1. Acquire local audio/video media
    await this.acquireLocalMedia(this.state.type);

    // 2. Setup RTCPeerConnection for Callee
    this.setupPeerConnection();

    // 3. Broadcast accept in shared room
    this.broadcastInRoom("call_accepted", {});
  }

  // ─── REJECT CALL (Callee) ──────────────────────────────────────────

  rejectCall() {
    this.stopIncomingRingtone();

    this.broadcastInRoom("call_rejected", {});

    this.cleanupPeer();
    this.cleanupStream();

    this.state.status = "rejected";
    this.notify();
    setTimeout(() => {
      this.state.status = "idle";
      this.notify();
    }, 1200);
  }

  // ─── END CALL (Both sides) ─────────────────────────────────────────

  endCall() {
    this._clearAllTones();

    this.broadcastInRoom("call_ended", {});

    this.cleanupPeer();
    this.cleanupStream();

    this.state.status = "ended";
    this.notify();

    setTimeout(() => {
      this.state.status = "idle";
      this.notify();
    }, 1200);
  }

  // ─── WEBRTC PEER CONNECTION & SIGNALING ────────────────────────────

  private setupPeerConnection() {
    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch {}
    }

    try {
      this.peerConnection = new RTCPeerConnection(RTC_CONFIG);
      this.iceCandidateQueue = [];

      // Add local audio and video tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          if (this.peerConnection && this.localStream) {
            this.peerConnection.addTrack(track, this.localStream);
          }
        });
      }

      // Handle incoming remote media tracks
      this.peerConnection.ontrack = (event) => {
        try {
          if (event.streams && event.streams[0]) {
            this.remoteStream = event.streams[0];
          } else {
            if (!this.remoteStream) {
              this.remoteStream = new MediaStream();
            }
            this.remoteStream.addTrack(event.track);
          }
          if (this.remoteStream) {
            this.remoteStream.getTracks().forEach((t) => {
              t.enabled = true;
            });
          }
        } catch (err) {
          console.warn("[WebRTC] ontrack error:", err);
        }
        this.notify();
      };

      // Handle ICE Candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.broadcastInRoom("ice_candidate", {
            candidate: event.candidate.toJSON(),
          });
        }
      };

      // Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        if (!this.peerConnection) return;
        const connState = this.peerConnection.connectionState;
        if (connState === "connected") {
          this.state.status = "connected";
          this.startTimer();
          this.notify();
        } else if (
          connState === "disconnected" ||
          connState === "failed" ||
          connState === "closed"
        ) {
          if (this.state.status === "connected") {
            this.endCall();
          }
        }
      };
    } catch (e) {
      console.warn("RTCPeerConnection initialization error:", e);
    }
  }

  // Caller receives "call_accepted" -> creates SDP offer
  private async _handleRemoteAccept() {
    this._clearAllTones();
    this.state.status = "connecting";
    this.notify();

    // 1. Setup peer connection on Caller side
    this.setupPeerConnection();

    if (!this.peerConnection) {
      this.state.status = "connected";
      this.startTimer();
      this.notify();
      return;
    }

    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: this.state.type === "video",
      });
      await this.peerConnection.setLocalDescription(offer);

      // Broadcast SDP Offer in shared room
      this.broadcastInRoom("sdp_offer", { sdp: offer });

      setTimeout(() => {
        if (this.state.status === "connecting") {
          this.state.status = "connected";
          this.startTimer();
          this.notify();
        }
      }, 800);
    } catch (err) {
      console.warn("Create SDP offer error:", err);
      this.state.status = "connected";
      this.startTimer();
      this.notify();
    }
  }

  // Callee receives "sdp_offer" -> sets remote description & sends SDP answer
  private async _handleRemoteOffer(sdpOffer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) {
      this.setupPeerConnection();
    }
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(sdpOffer)
      );

      // Process any queued ICE candidates
      while (this.iceCandidateQueue.length > 0) {
        const candidate = this.iceCandidateQueue.shift();
        if (candidate) {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
      }

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      // Broadcast SDP Answer in shared room
      this.broadcastInRoom("sdp_answer", { sdp: answer });

      this.state.status = "connected";
      this.startTimer();
      this.notify();
    } catch (err) {
      console.warn("Handle SDP offer error:", err);
      this.state.status = "connected";
      this.startTimer();
      this.notify();
    }
  }

  // Caller receives "sdp_answer" -> sets remote description
  private async _handleRemoteAnswer(sdpAnswer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) return;
    try {
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(sdpAnswer)
      );

      // Process any queued ICE candidates
      while (this.iceCandidateQueue.length > 0) {
        const candidate = this.iceCandidateQueue.shift();
        if (candidate) {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
      }
    } catch (err) {
      console.warn("Handle SDP answer error:", err);
    }
  }

  // Handle incoming ICE candidate
  private async _handleRemoteIceCandidate(candidateInit: RTCIceCandidateInit) {
    if (this.peerConnection && this.peerConnection.remoteDescription) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateInit));
      } catch (err) {
        console.warn("Add ICE candidate error:", err);
      }
    } else {
      this.iceCandidateQueue.push(candidateInit);
    }
  }

  private _handleRemoteReject() {
    this._clearAllTones();
    this.cleanupPeer();
    this.cleanupStream();
    this.state.status = "rejected";
    this.notify();
    setTimeout(() => {
      this.state.status = "idle";
      this.notify();
    }, 1500);
  }

  private _handleRemoteEnd() {
    this._clearAllTones();
    this.cleanupPeer();
    this.cleanupStream();
    this.state.status = "ended";
    this.notify();
    setTimeout(() => {
      this.state.status = "idle";
      this.notify();
    }, 1200);
  }

  // ─── TONES & AUDIO EFFECTS (Web Audio API) ─────────────────────────

  private startIncomingRingtone() {
    if (typeof window === "undefined") return;
    this.stopIncomingRingtone();
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this._ringtoneCtx = ctx;

      const playRing = () => {
        try {
          if (!this._ringtoneCtx) return;
          const gain = this._ringtoneCtx.createGain();
          gain.gain.value = 0.15;
          gain.connect(this._ringtoneCtx.destination);

          // Dual tone phone ring
          const osc1 = this._ringtoneCtx.createOscillator();
          const osc2 = this._ringtoneCtx.createOscillator();
          osc1.frequency.value = 440;
          osc2.frequency.value = 480;
          osc1.connect(gain);
          osc2.connect(gain);

          osc1.start();
          osc2.start();
          osc1.stop(this._ringtoneCtx.currentTime + 0.6);
          osc2.stop(this._ringtoneCtx.currentTime + 0.6);
        } catch {}
      };

      playRing();
      this._ringtoneInterval = setInterval(playRing, 2000);
    } catch {}
  }

  private stopIncomingRingtone() {
    if (this._ringtoneInterval) {
      clearInterval(this._ringtoneInterval);
      this._ringtoneInterval = null;
    }
    if (this._ringtoneCtx) {
      try {
        this._ringtoneCtx.close();
      } catch {}
      this._ringtoneCtx = null;
    }
  }

  private startCallerDialTone() {
    if (typeof window === "undefined") return;
    this.stopCallerDialTone();
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playDialBeep = () => {
        try {
          const gain = ctx.createGain();
          gain.gain.value = 0.08;
          gain.connect(ctx.destination);

          const osc = ctx.createOscillator();
          osc.frequency.value = 440;
          osc.connect(gain);
          osc.start();
          osc.stop(ctx.currentTime + 0.8);
        } catch {}
      };

      playDialBeep();
      this._callerDialToneInterval = setInterval(playDialBeep, 2400);
    } catch {}
  }

  private stopCallerDialTone() {
    if (this._callerDialToneInterval) {
      clearInterval(this._callerDialToneInterval);
      this._callerDialToneInterval = null;
    }
  }

  private _clearAllTones() {
    this.stopIncomingRingtone();
    this.stopCallerDialTone();
    if (this._ringTimeout) {
      clearTimeout(this._ringTimeout);
      this._ringTimeout = null;
    }
  }

  // ─── MEDIA CONTROLS ────────────────────────────────────────────────

  private async acquireLocalMedia(type: CallType) {
    try {
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        const constraints: MediaStreamConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video:
            type === "video"
              ? {
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                  facingMode: "user",
                }
              : false,
        };
        this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      }
    } catch (err: any) {
      console.warn("Media access warning:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        this.state.hasPermissionError = true;
        this.notify();
      }
    }
  }

  private startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.state.status === "connected") {
        this.state.durationSeconds += 1;
        this.notify();
      } else {
        clearInterval(this.timerInterval);
      }
    }, 1000);
  }

  toggleMute() {
    this.state.isMuted = !this.state.isMuted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((t) => (t.enabled = !this.state.isMuted));
    }
    this.notify();
  }

  toggleCamera() {
    this.state.isCameraOff = !this.state.isCameraOff;
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((t) => (t.enabled = !this.state.isCameraOff));
    }
    this.notify();
  }

  toggleSpeaker() {
    this.state.isSpeakerOn = !this.state.isSpeakerOn;
    this.notify();
  }

  toggleMinimize() {
    this.state.isMinimized = !this.state.isMinimized;
    this.notify();
  }

  private cleanupStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((t) => t.stop());
      this.remoteStream = null;
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private cleanupPeer() {
    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch {}
      this.peerConnection = null;
    }
    this.iceCandidateQueue = [];
    if (this.activeRoomChannel) {
      try {
        supabase.removeChannel(this.activeRoomChannel);
      } catch {}
      this.activeRoomChannel = null;
    }
  }

  destroy() {
    this.cleanupPeer();
    this.cleanupStream();
    this._clearAllTones();
    this.personalChannels.forEach((ch) => {
      try {
        supabase.removeChannel(ch);
      } catch {}
    });
    this.personalChannels = [];
  }
}

export const callService = new CallService();

