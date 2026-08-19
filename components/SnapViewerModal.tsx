"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Send, Heart, Flame, Sparkles } from "lucide-react";
import { audioHaptics } from "../lib/audioHaptics";

interface SnapItem {
  id: string;
  senderAddress: string;
  mediaUrl: string;
  mediaType: string;
  caption?: string | null;
  duration?: number;
  streakCount?: number;
  sender: {
    displayName: string;
    username: string;
    avatarUrl: string;
  };
}

interface SnapViewerModalProps {
  snap: SnapItem;
  onClose: () => void;
  onSnapOpened: (snapId: string) => void;
  onReplySnap?: (recipientAddress: string) => void;
}

export function SnapViewerModal({
  snap,
  onClose,
  onSnapOpened,
  onReplySnap,
}: SnapViewerModalProps) {
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const durationMs = (snap.duration || 6) * 1000;
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1. Mark as opened immediately in backend
    fetch(`/api/snaps/${snap.id}/view`, { method: "POST" })
      .then(() => onSnapOpened(snap.id))
      .catch((e) => console.warn("Failed to mark snap opened:", e));

    audioHaptics.playTap();
  }, [snap.id]);

  useEffect(() => {
    if (isPaused) return;

    const intervalMs = 50;
    const increment = (intervalMs / durationMs) * 100;

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev + increment >= 100) {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
          onClose();
          return 100;
        }
        return prev + increment;
      });
    }, intervalMs);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isPaused, durationMs, onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 select-none animate-in fade-in"
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div className="relative w-full max-w-[440px] h-[100dvh] sm:h-[94vh] sm:max-h-[900px] flex flex-col justify-between overflow-hidden sm:rounded-[36px] bg-slate-950">
        
        {/* Top Header & Countdown Bar */}
        <div className="absolute top-0 inset-x-0 z-30 p-4 pt-5 bg-gradient-to-b from-black/80 via-black/40 to-transparent space-y-3">
          
          {/* Animated Countdown Progress Bar */}
          <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#00B7FF] via-[#7EDBE8] to-[#F45AA8] transition-all duration-75 ease-linear rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Sender Details */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-[#00B7FF] to-[#F45AA8] shadow-md shrink-0">
                <img
                  src={snap.sender.avatarUrl}
                  alt={snap.sender.displayName}
                  className="w-full h-full rounded-full object-cover bg-slate-900"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-extrabold text-xs text-white truncate max-w-[140px]">
                    {snap.sender.displayName}
                  </h4>
                  {snap.streakCount !== undefined && snap.streakCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-black text-amber-300 flex items-center gap-1 border border-amber-300/20">
                      👻 {snap.streakCount}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-300 font-medium">@{snap.sender.username}</p>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white/80 hover:text-white hover:bg-black/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Media Canvas */}
        <div className="w-full h-full flex items-center justify-center bg-black relative">
          {snap.mediaType === "video" ? (
            <video
              src={snap.mediaUrl}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={snap.mediaUrl}
              alt="Snap"
              className="w-full h-full object-cover"
            />
          )}

          {/* Caption Overlay */}
          {snap.caption && (
            <div className="absolute inset-x-0 bottom-24 p-4 flex justify-center pointer-events-none">
              <div className="bg-black/60 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/20 text-white font-black text-sm tracking-wide text-center max-w-[90%] shadow-2xl">
                {snap.caption}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions Bar */}
        <div className="absolute bottom-0 inset-x-0 z-30 p-4 pb-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center gap-3">
          <button
            onClick={() => {
              if (onReplySnap) {
                onReplySnap(snap.senderAddress);
              }
              onClose();
            }}
            className="flex-1 py-3 px-4 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-white/30 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4 text-[#00B7FF]" />
            <span>Snap Back</span>
          </button>
        </div>

      </div>
    </div>
  );
}
