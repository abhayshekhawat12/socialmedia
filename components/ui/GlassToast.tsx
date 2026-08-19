"use client";

import React from "react";
import { Zap, CheckCircle2, AlertTriangle, Info } from "lucide-react";

export interface GlassToastProps {
  message: string;
  type?: "success" | "info" | "warning";
  isVisible: boolean;
}

export const GlassToast: React.FC<GlassToastProps> = ({
  message,
  type = "info",
  isVisible,
}) => {
  if (!isVisible) return null;

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-current text-slate-950" />,
    info: <Zap className="w-4 h-4 text-slate-950 fill-current" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  };

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-gradient-to-r from-[#00B7FF] via-[#7EDBE8] to-[#38BDF8] text-slate-950 font-black text-xs shadow-glass animate-fadeIn flex items-center gap-2 border border-white/80 select-none">
      {icons[type]}
      <span>{message}</span>
    </div>
  );
};
