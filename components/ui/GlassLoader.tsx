"use client";

import React from "react";

export interface GlassLoaderProps {
  count?: number;
  type?: "feed" | "grid" | "avatar";
}

export const GlassLoader: React.FC<GlassLoaderProps> = ({
  count = 2,
  type = "feed",
}) => {
  if (type === "avatar") {
    return (
      <div className="flex gap-4 overflow-x-hidden py-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2 shrink-0">
            <div className="w-16 h-16 rounded-full glass-card skeleton-shimmer" />
            <div className="w-12 h-2.5 rounded-full glass-card skeleton-shimmer" />
          </div>
        ))}
      </div>
    );
  }

  if (type === "grid") {
    return (
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-2xl glass-card skeleton-shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card rounded-[32px] p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full glass-pill skeleton-shimmer" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 w-32 rounded-full glass-pill skeleton-shimmer" />
              <div className="h-2.5 w-20 rounded-full glass-pill skeleton-shimmer" />
            </div>
          </div>
          {/* Media box */}
          <div className="aspect-square w-full rounded-2xl glass-pill skeleton-shimmer" />
          {/* Actions & Caption */}
          <div className="space-y-2 pt-1">
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full glass-pill skeleton-shimmer" />
              <div className="w-8 h-8 rounded-full glass-pill skeleton-shimmer" />
              <div className="w-8 h-8 rounded-full glass-pill skeleton-shimmer" />
            </div>
            <div className="h-3 w-3/4 rounded-full glass-pill skeleton-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
};
