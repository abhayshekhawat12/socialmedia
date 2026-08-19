"use client";

import React from "react";
import { PlusCircle, Film, Sparkles, X, Camera, Music, Image as ImageIcon } from "lucide-react";
import { audioHaptics } from "../lib/audioHaptics";

interface CreateActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (type: "post" | "reel" | "story") => void;
}

export const CreateActionSheet: React.FC<CreateActionSheetProps> = ({
  isOpen,
  onClose,
  onSelectOption,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      {/* Backdrop touch dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Floating Bottom Sheet */}
      <div className="w-full max-w-lg mx-auto glass-card rounded-t-[36px] rounded-b-[24px] sm:rounded-[36px] p-6 border border-white/80 dark:border-white/15 shadow-glass z-10 animate-slideUp relative mb-safe select-none">
        {/* Grab bar */}
        <div className="w-12 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-4" />

        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Create Content
            </h3>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Share moments with the Pulse community
            </p>
          </div>
          <button
            onClick={() => {
              audioHaptics.playTap();
              onClose();
            }}
            className="w-8 h-8 rounded-full glass-pill flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white btn-tactile cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Large Action Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* 1. Post */}
          <button
            onClick={() => {
              audioHaptics.playTap();
              onSelectOption("post");
            }}
            className="flex flex-col items-center gap-2.5 p-4 rounded-3xl glass-panel border border-white/80 dark:border-white/10 hover:border-[#00B7FF] transition-all group btn-tactile cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00B7FF] to-[#7EDBE8] text-slate-950 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <ImageIcon className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="text-center">
              <span className="text-xs font-black text-slate-900 dark:text-white block">Post</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Photo / Art</span>
            </div>
          </button>

          {/* 2. Reel / Short */}
          <button
            onClick={() => {
              audioHaptics.playTap();
              onSelectOption("reel");
            }}
            className="flex flex-col items-center gap-2.5 p-4 rounded-3xl glass-panel border border-white/80 dark:border-white/10 hover:border-[#9B6CFF] transition-all group btn-tactile cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#9B6CFF] to-[#F45AA8] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <Film className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="text-center">
              <span className="text-xs font-black text-slate-900 dark:text-white block">Reel</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Short Video</span>
            </div>
          </button>

          {/* 3. Story */}
          <button
            onClick={() => {
              audioHaptics.playTap();
              onSelectOption("story");
            }}
            className="flex flex-col items-center gap-2.5 p-4 rounded-3xl glass-panel border border-white/80 dark:border-white/10 hover:border-[#F45AA8] transition-all group btn-tactile cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#F45AA8] to-[#FFA07A] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="text-center">
              <span className="text-xs font-black text-slate-900 dark:text-white block">Story</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">24h Expire</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
