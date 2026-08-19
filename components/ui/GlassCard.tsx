"use client";

import React from "react";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: "card" | "panel" | "dock" | "subtle";
  hoverable?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = "",
  variant = "card",
  hoverable = false,
  ...props
}) => {
  const baseClass =
    variant === "panel"
      ? "glass-panel"
      : variant === "dock"
      ? "glass-dock"
      : variant === "subtle"
      ? "glass-pill"
      : "glass-card";

  return (
    <div
      className={`${baseClass} rounded-[28px] ${hoverable ? "card-hover cursor-pointer" : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
