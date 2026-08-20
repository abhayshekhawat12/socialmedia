'use client';

import React, { useState, useEffect, useRef } from 'react';
import { callService, CallState } from '../lib/services/callService';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Volume2, 
  VolumeX, 
  Phone, 
  PhoneOff, 
  Minimize2, 
  Maximize2, 
  ShieldCheck,
  AlertTriangle,
  Radio
} from 'lucide-react';
import { audioHaptics } from '../lib/audioHaptics';

export const CallModal: React.FC = () => {
  const [callState, setCallState] = useState<CallState | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    callService.subscribe((state) => {
      setCallState(state);
    });
  }, []);

  // Bind local media stream to local video element
  useEffect(() => {
    if (callState && callState.type === 'video' && localVideoRef.current) {
      const stream = callService.getLocalStream();
      if (stream && localVideoRef.current.srcObject !== stream) {
        localVideoRef.current.srcObject = stream;
      }
    }
  }, [callState?.type, callState?.status, callState?.isCameraOff]);

  // Bind remote media stream to remote video and audio elements
  useEffect(() => {
    if (!callState || callState.status === 'idle') return;

    const rStream = callService.getRemoteStream();

    // Bind to audio element so voice is heard
    if (remoteAudioRef.current && rStream) {
      if (remoteAudioRef.current.srcObject !== rStream) {
        remoteAudioRef.current.srcObject = rStream;
        remoteAudioRef.current.play().catch(() => {});
      }
    }

    // Bind to video element for video calls
    if (callState.type === 'video' && remoteVideoRef.current && rStream) {
      if (remoteVideoRef.current.srcObject !== rStream) {
        remoteVideoRef.current.srcObject = rStream;
        remoteVideoRef.current.play().catch(() => {});
      }
    }
  }, [callState?.type, callState?.status, callState?.durationSeconds]);

  if (!callState || callState.status === 'idle') return null;

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // 1. INCOMING CALL MODAL (Rings on receiver's screen)
  if (callState.status === 'incoming') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-lg animate-fadeIn">
        <div className="w-full max-w-sm rounded-[36px] glass-card border border-white/20 p-7 text-center space-y-6 text-white shadow-2xl bg-slate-900/95 relative overflow-hidden">
          {/* Top glowing ambient pill */}
          <div className="flex items-center justify-center gap-1.5 text-xs font-black text-cyan-400 bg-cyan-500/10 py-1.5 px-3 rounded-full w-fit mx-auto border border-cyan-500/20">
            <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span>Incoming {callState.type === 'video' ? 'HD Video' : 'Voice'} Call</span>
          </div>

          {/* Glowing Avatar */}
          <div className="relative inline-block mx-auto mt-2">
            <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-[#00B7FF] via-purple-500 to-[#F45AA8] shadow-2xl animate-pulse">
              <img
                src={callState.contactAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(callState.contactName)}`}
                alt={callState.contactName}
                className="w-full h-full rounded-full object-cover bg-slate-900"
              />
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-ping opacity-60" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-black text-white truncate">{callState.contactName}</h3>
            <p className="text-xs font-mono font-semibold text-slate-400">
              Pulse Encrypted {callState.type === 'video' ? 'Live Video' : 'Voice Stream'}
            </p>
          </div>

          {/* Accept / Decline Action Buttons */}
          <div className="flex items-center justify-center gap-8 pt-4">
            <button
              onClick={() => {
                audioHaptics.playTap();
                callService.rejectCall();
              }}
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="w-16 h-16 rounded-full bg-rose-500 hover:bg-rose-600 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 transition-transform">
                <PhoneOff className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold text-slate-400 group-hover:text-rose-400">Decline</span>
            </button>

            <button
              onClick={() => {
                audioHaptics.playTap();
                callService.acceptCall();
              }}
              className="flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-transform animate-bounce">
                <Phone className="w-7 h-7" />
              </div>
              <span className="text-xs font-bold text-slate-400 group-hover:text-emerald-400">Accept</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. MINIMIZED PICTURE-IN-PICTURE CALL WIDGET
  if (callState.isMinimized) {
    return (
      <div className="fixed top-16 right-4 z-[100] p-3 rounded-2xl glass-card bg-slate-900/95 border border-[#00B7FF]/40 shadow-2xl flex items-center gap-3 animate-fadeIn text-white text-xs">
        {/* Hidden Remote Audio Element */}
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

        <img
          src={callState.contactAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(callState.contactName)}`}
          alt={callState.contactName}
          className="w-10 h-10 rounded-full object-cover border-2 border-[#00B7FF]"
        />
        <div>
          <div className="font-extrabold text-xs truncate max-w-[120px]">{callState.contactName}</div>
          <div className="text-[10px] text-emerald-400 font-mono font-bold">
            {callState.status === 'connected' ? formatDuration(callState.durationSeconds) : `${callState.status}...`}
          </div>
        </div>
        <button
          onClick={() => callService.toggleMinimize()}
          className="p-2 rounded-full text-slate-400 hover:text-white btn-tactile cursor-pointer"
          title="Maximize Call"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            audioHaptics.playTap();
            callService.endCall();
          }}
          className="p-2 rounded-full bg-rose-500 text-white hover:bg-rose-600 btn-tactile cursor-pointer"
          title="End Call"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // 3. FULL SCREEN / MODAL CALL WINDOW
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
      {/* Hidden Remote Audio Stream Element for guaranteed voice output */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      <div className="w-full max-w-sm sm:max-w-md rounded-[36px] glass-card bg-slate-900/95 border border-white/20 p-6 text-center space-y-5 text-white relative shadow-2xl overflow-hidden">
        
        {/* Top Header */}
        <div className="flex justify-between items-center text-slate-400">
          <span className="flex items-center gap-1.5 text-xs font-black text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Encrypted WebRTC {callState.type === 'video' ? 'HD Video' : 'Voice'}</span>
          </span>
          <button
            onClick={() => callService.toggleMinimize()}
            className="p-1.5 rounded-full hover:text-white hover:bg-white/10 btn-tactile cursor-pointer transition-colors"
            title="Minimize Call"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Permission warning banner */}
        {callState.hasPermissionError && (
          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-left text-amber-300 text-[11px]">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Microphone/Camera permission restricted in browser.</span>
          </div>
        )}

        {/* Video stream container (for Video calls) */}
        {callState.type === 'video' ? (
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shadow-inner">
            {/* 1. Remote Video (Big Screen) */}
            {callState.status === 'connected' ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 space-y-2">
                <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-[#00B7FF] to-purple-500">
                  <img
                    src={callState.contactAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(callState.contactName)}`}
                    alt={callState.contactName}
                    className="w-full h-full rounded-full object-cover bg-slate-900"
                  />
                </div>
                <span className="text-xs font-bold text-slate-400 animate-pulse">
                  {callState.status === 'calling' ? 'Ringing...' : 'Establishing WebRTC Link...'}
                </span>
              </div>
            )}

            {/* 2. Local Video PiP preview (small corner box) */}
            <div className="absolute top-3 right-3 w-24 h-32 rounded-xl overflow-hidden bg-slate-900/90 border border-white/20 shadow-lg">
              {!callState.isCameraOff ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900">
                  <VideoOff className="w-5 h-5 text-slate-500" />
                  <span className="text-[9px] font-bold mt-1">Off</span>
                </div>
              )}
            </div>

            {/* Remote contact label */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 p-1.5 pr-3 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
              <img
                src={callState.contactAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(callState.contactName)}`}
                alt={callState.contactName}
                className="w-6 h-6 rounded-full object-cover border border-cyan-400"
              />
              <span className="text-xs font-bold truncate max-w-[100px]">{callState.contactName}</span>
            </div>

            <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/70 text-[10px] font-mono text-emerald-400 border border-white/10">
              HD 720p P2P
            </div>
          </div>
        ) : (
          /* Voice Call Avatar & Sound Waves */
          <div className="space-y-5 py-3">
            <div className="relative inline-block mx-auto">
              <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-[#00B7FF] via-purple-500 to-[#7EDBE8] shadow-2xl">
                <img
                  src={callState.contactAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(callState.contactName)}`}
                  alt={callState.contactName}
                  className="w-full h-full rounded-full object-cover bg-slate-900 border-2 border-slate-900"
                />
              </div>
              {callState.status === 'calling' && (
                <div className="absolute inset-0 rounded-full border-2 border-[#00B7FF] animate-ping opacity-75" />
              )}
            </div>

            {/* Audio Wave animation when connected */}
            {callState.status === 'connected' && !callState.isMuted && (
              <div className="flex items-center justify-center gap-1.5 h-8">
                {[0.4, 0.8, 1, 0.6, 0.9, 0.5, 0.7, 0.9, 0.6].map((h, i) => (
                  <span
                    key={i}
                    className="w-1.5 bg-gradient-to-t from-cyan-500 to-emerald-400 rounded-full animate-pulse"
                    style={{ height: `${h * 26}px`, animationDelay: `${i * 100}ms` }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Contact Name & Status */}
        <div className="space-y-1">
          <h3 className="text-lg font-black text-white">{callState.contactName}</h3>
          <p className="text-xs font-mono font-bold text-emerald-400 capitalize">
            {callState.status === 'connected' ? (
              <span className="flex items-center justify-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Connected • {formatDuration(callState.durationSeconds)}
              </span>
            ) : (
              <span className="text-cyan-400 animate-pulse">
                {callState.status === 'calling' ? 'Ringing...' : `${callState.status}...`}
              </span>
            )}
          </p>
        </div>

        {/* Call Controls Bar */}
        <div className="flex items-center justify-center gap-4 pt-2">
          {/* Mute Mic Button */}
          <button
            onClick={() => {
              audioHaptics.playTap();
              callService.toggleMute();
            }}
            className={`p-4 rounded-full transition-all btn-tactile cursor-pointer ${
              callState.isMuted
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white'
            }`}
            title={callState.isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {callState.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Camera Toggle Button (for Video Calls) */}
          {callState.type === 'video' && (
            <button
              onClick={() => {
                audioHaptics.playTap();
                callService.toggleCamera();
              }}
              className={`p-4 rounded-full transition-all btn-tactile cursor-pointer ${
                callState.isCameraOff
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white'
              }`}
              title={callState.isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              {callState.isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          )}

          {/* Speaker Toggle */}
          <button
            onClick={() => {
              audioHaptics.playTap();
              callService.toggleSpeaker();
            }}
            className={`p-4 rounded-full transition-all btn-tactile cursor-pointer ${
              callState.isSpeakerOn
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                : 'bg-slate-800 text-slate-300'
            }`}
            title="Toggle Speaker"
          >
            {callState.isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* End Call Button */}
          <button
            onClick={() => {
              audioHaptics.playTap();
              callService.endCall();
            }}
            className="p-4 rounded-full bg-rose-500 hover:bg-rose-600 active:scale-95 text-white shadow-xl shadow-rose-500/40 transition-transform btn-tactile cursor-pointer"
            title="End Call"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>

      </div>
    </div>
  );
};

