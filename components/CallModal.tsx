'use client';

import React, { useState, useEffect } from 'react';
import { callService, CallState } from '../lib/services/callService';
import { Mic, MicOff, Video, VideoOff, Volume2, VolumeX, PhoneOff, Minimize2, Maximize2, ShieldCheck } from 'lucide-react';

export const CallModal: React.FC = () => {
  const [callState, setCallState] = useState<CallState | null>(null);

  useEffect(() => {
    callService.subscribe((state) => {
      setCallState(state);
    });
  }, []);

  if (!callState || callState.status === 'idle') return null;

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Minimized Call Widget
  if (callState.isMinimized) {
    return (
      <div className="fixed top-14 right-4 z-50 p-2.5 rounded-2xl bg-[#131b2e]/95 border border-[#00B7FF]/40 shadow-2xl flex items-center gap-3 animate-in fade-in text-white text-xs">
        <img src={callState.contactAvatar} alt={callState.contactName} className="w-8 h-8 rounded-full object-cover border border-[#00B7FF]" />
        <div>
          <div className="font-extrabold text-[11px] truncate max-w-[100px]">{callState.contactName}</div>
          <div className="text-[10px] text-emerald-400 font-mono">
            {callState.status === 'connected' ? formatDuration(callState.durationSeconds) : callState.status}
          </div>
        </div>
        <button onClick={() => callService.toggleMinimize()} className="p-1 rounded-full text-slate-400 hover:text-white">
          <Maximize2 className="w-4 h-4" />
        </button>
        <button onClick={() => callService.endCall()} className="p-1.5 rounded-full bg-rose-500 text-white">
          <PhoneOff className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-sm rounded-3xl bg-[#131b2e] border border-slate-800 p-6 text-center space-y-6 text-white relative shadow-2xl">
        
        {/* Top Control Header */}
        <div className="flex justify-between items-center text-slate-400">
          <span className="flex items-center gap-1 text-[11px] font-bold text-[#00B7FF]">
            <ShieldCheck className="w-4 h-4" />
            <span>Encrypted WebRTC {callState.type === 'video' ? 'Video' : 'Voice'} Call</span>
          </span>
          <button onClick={() => callService.toggleMinimize()} className="p-1 rounded-full hover:text-white" title="Minimize Call">
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Contact Avatar & Call State */}
        <div className="space-y-3">
          <div className="relative inline-block">
            <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-[#00B7FF] to-purple-600 shadow-2xl mx-auto">
              <img
                src={callState.contactAvatar}
                alt={callState.contactName}
                className="w-full h-full rounded-full object-cover border-2 border-slate-900"
              />
            </div>
            {callState.status === 'calling' && (
              <div className="absolute inset-0 rounded-full border-2 border-[#00B7FF] animate-ping" />
            )}
          </div>

          <div>
            <h3 className="text-lg font-extrabold text-white">{callState.contactName}</h3>
            <p className="text-xs font-mono font-bold text-emerald-400 capitalize pt-1">
              {callState.status === 'connected' ? (
                <span>Connected • {formatDuration(callState.durationSeconds)}</span>
              ) : (
                <span className="animate-pulse">{callState.status}...</span>
              )}
            </p>
          </div>
        </div>

        {/* Video stream container simulation */}
        {callState.type === 'video' && !callState.isCameraOff && (
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-800">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80"
              alt="Video Feed"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/60 text-[9px] font-mono text-emerald-400">
              HD 1080p WebRTC
            </div>
          </div>
        )}

        {/* Call Controls Bar */}
        <div className="flex items-center justify-center gap-4 pt-2">
          {/* Mute Mic */}
          <button
            onClick={() => callService.toggleMute()}
            className={`p-3.5 rounded-full transition-all ${
              callState.isMuted ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
            title="Mute Microphone"
          >
            {callState.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Camera Toggle (Video Call) */}
          {callState.type === 'video' && (
            <button
              onClick={() => callService.toggleCamera()}
              className={`p-3.5 rounded-full transition-all ${
                callState.isCameraOff ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              title="Toggle Camera"
            >
              {callState.isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          )}

          {/* Speaker */}
          <button
            onClick={() => callService.toggleSpeaker()}
            className={`p-3.5 rounded-full transition-all ${
              callState.isSpeakerOn ? 'bg-[#00B7FF]/20 text-[#00B7FF] border border-[#00B7FF]/40' : 'bg-slate-800 text-slate-200'
            }`}
            title="Toggle Speaker"
          >
            {callState.isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* End Call */}
          <button
            onClick={() => callService.endCall()}
            className="p-3.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow-lg hover:scale-105 transition-transform"
            title="End Call"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>

      </div>
    </div>
  );
};
