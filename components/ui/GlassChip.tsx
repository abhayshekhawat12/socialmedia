"use client";

import React from "react";
import { audioHaptics } from "../../lib/audioHaptics";

export interface GlassChipProps {
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export const GlassChip: React.FC<GlassChipProps> = ({
  label,
  isActive = false,
  onClick,
  icon,
  className = "",
}) => {
  const handleClick = () => {
    audioHaptics.playTap();
    if (onClick) onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={`px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 btn-tactile cursor-pointer ${
        isActive
          ? "bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 shadow-md shadow-cyan-500/20"
          : "glass-pill text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white"
      } ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{label}</span>
    </button>
  );
};
