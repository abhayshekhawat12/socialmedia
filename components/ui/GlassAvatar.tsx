"use client";

import React from "react";
import { Check } from "lucide-react";

export interface GlassAvatarProps {
  src?: string;
  alt?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  verified?: boolean;
  online?: boolean;
  hasStory?: boolean;
  onClick?: () => void;
  className?: string;
}

export const GlassAvatar: React.FC<GlassAvatarProps> = ({
  src,
  alt = "Avatar",
  size = "md",
  verified = false,
  online = false,
  hasStory = false,
  onClick,
  className = "",
}) => {
  const sizeMap = {
    xs: "w-7 h-7",
    sm: "w-9 h-9",
    md: "w-11 h-11",
    lg: "w-16 h-16",
    xl: "w-20 h-20",
    "2xl": "w-24 h-24",
  };

  const badgeSizeMap = {
    xs: "w-3 h-3",
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
    xl: "w-5 h-5",
    "2xl": "w-6 h-6",
  };

  return (
    <div
      onClick={onClick}
      className={`relative inline-block shrink-0 ${onClick ? "cursor-pointer btn-tactile hover:scale-105" : ""} ${className}`}
    >
      <div
        className={`${sizeMap[size]} rounded-full p-[2.5px] ${
          hasStory
            ? "bg-gradient-to-tr from-[#00B7FF] via-[#9B6CFF] to-[#F45AA8] shadow-glow-cyan animate-pulse"
            : "bg-gradient-to-tr from-[#00B7FF] to-[#7EDBE8] shadow-sm"
        }`}
      >
        <div className="w-full h-full rounded-full overflow-hidden border border-white dark:border-slate-900 bg-white dark:bg-slate-900">
          <img
            src={src || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120"}
            alt={alt}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      </div>

      {online && (
        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
      )}

      {verified && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 ${badgeSizeMap[size]} rounded-full bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-sm`}
        >
          <Check className="w-2.5 h-2.5 stroke-[3]" />
        </span>
      )}
    </div>
  );
};
