"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { audioHaptics } from "../../lib/audioHaptics";

export interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "glass" | "danger" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
  haptic?: boolean;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  haptic = true,
  className = "",
  onClick,
  disabled,
  ...props
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (haptic && !disabled && !isLoading) {
      audioHaptics.playTap();
    }
    if (onClick) onClick(e);
  };

  const variantStyles = {
    primary:
      "bg-gradient-to-r from-[#00B7FF] via-[#7EDBE8] to-[#38BDF8] text-slate-950 font-black shadow-md shadow-cyan-500/20 hover:opacity-95",
    secondary:
      "bg-gradient-to-r from-[#9B6CFF] via-[#B588FF] to-[#F45AA8] text-white font-black shadow-md shadow-purple-500/20 hover:opacity-95",
    glass:
      "glass-pill text-slate-800 dark:text-slate-100 hover:bg-white/80 dark:hover:bg-slate-800/80 font-bold border border-white/70 dark:border-white/10",
    danger:
      "bg-rose-500 text-white font-black shadow-md shadow-rose-500/20 hover:bg-rose-600",
    ghost:
      "text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800/50 font-bold",
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-[11px] rounded-xl",
    md: "px-4 py-2.5 text-xs rounded-2xl",
    lg: "px-6 py-3 text-sm rounded-2xl",
    icon: "p-2.5 rounded-full flex items-center justify-center",
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 btn-tactile cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
      {children}
    </button>
  );
};
