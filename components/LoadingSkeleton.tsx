'use client';

import React from 'react';

export const LoadingSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-dark-card border border-dark-border rounded-3xl p-5 space-y-4 animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-dark-hover" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-32 bg-dark-hover rounded-md" />
              <div className="h-3 w-20 bg-dark-hover rounded-md" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-dark-hover rounded-md" />
            <div className="h-4 w-3/4 bg-dark-hover rounded-md" />
          </div>
          <div className="h-48 w-full bg-dark-hover rounded-2xl" />
        </div>
      ))}
    </div>
  );
};
