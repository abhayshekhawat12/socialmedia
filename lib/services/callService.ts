export type CallType = "voice" | "video";
export type CallStatus = "idle" | "calling" | "connecting" | "connected" | "ended";

export interface CallState {
  id: string;
  type: CallType;
  status: CallStatus;
  contactName: string;
  contactAvatar: string;
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeakerOn: boolean;
  isMinimized: boolean;
  durationSeconds: number;
}

export class CallService {
  private listener: ((state: CallState) => void) | null = null;
  private timerInterval: any = null;

  private state: CallState = {
    id: "",
    type: "voice",
    status: "idle",
    contactName: "",
    contactAvatar: "",
    isMuted: false,
    isCameraOff: false,
    isSpeakerOn: true,
    isMinimized: false,
    durationSeconds: 0,
  };

  subscribe(callback: (state: CallState) => void) {
    this.listener = callback;
    callback(this.state);
  }

  private notify() {
    if (this.listener) {
      this.listener({ ...this.state });
    }
  }

  startCall(contactName: string, contactAvatar: string, type: CallType = "voice") {
    this.state = {
      id: `call_${Date.now()}`,
      type,
      status: "calling",
      contactName,
      contactAvatar,
      isMuted: false,
      isCameraOff: false,
      isSpeakerOn: true,
      isMinimized: false,
      durationSeconds: 0,
    };
    this.notify();

    // Transition to Connecting after 1.5s
    setTimeout(() => {
      if (this.state.status === "calling") {
        this.state.status = "connecting";
        this.notify();
      }
    }, 1500);

    // Transition to Connected after 3.5s
    setTimeout(() => {
      if (this.state.status === "connecting") {
        this.state.status = "connected";
        this.startTimer();
        this.notify();
      }
    }, 3500);
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
    this.notify();
  }

  toggleCamera() {
    this.state.isCameraOff = !this.state.isCameraOff;
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

  endCall() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.state.status = "ended";
    this.notify();
    setTimeout(() => {
      this.state.status = "idle";
      this.notify();
    }, 1500);
  }
}

export const callService = new CallService();
