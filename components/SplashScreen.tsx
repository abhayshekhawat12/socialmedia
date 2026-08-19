"use client";

import React from "react";
import { Sparkles, Loader2 } from "lucide-react";

export const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F3F7FA] dark:bg-[#070b14] select-none animate-fadeIn">
      {/* Background Soft Aurora Blobs */}
      <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-[#C8F2F8] dark:bg-cyan-950/40 blur-[90px] opacity-80" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-[#FFD6EA] dark:bg-pink-950/40 blur-[90px] opacity-80" />

      {/* Floating Glass Brand Capsule */}
      <div className="relative z-10 flex flex-col items-center gap-5">
        <div className="w-20 h-20 rounded-[32px] bg-gradient-to-tr from-[#00B7FF] via-[#7EDBE8] to-[#F45AA8] p-1 shadow-glow-cyan animate-pulse">
          <div className="w-full h-full rounded-[28px] bg-[#090d16] flex items-center justify-center text-[#00B7FF]">
            <Sparkles className="w-9 h-9 fill-current" />
          </div>
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Pulse
          </h1>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono">
            Verifying secure session...
          </p>
        </div>

        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel border border-white/80 dark:border-white/10 mt-2 shadow-sm">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00B7FF]" />
          <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">
            Connecting to Pulse 2026
          </span>
        </div>
      </div>
    </div>
  );
};
