"use client";

import React, { useState, useEffect } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { audioHaptics } from "../lib/audioHaptics";

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
    };
  }, []);

  if (!isOffline) return null;

  const handleRetry = () => {
    audioHaptics.playTap();
    setIsRetrying(true);
    setTimeout(() => {
      setIsRetrying(false);
      if (typeof window !== "undefined") {
        setIsOffline(!navigator.onLine);
        if (navigator.onLine) {
          window.location.reload();
        }
      }
    }, 600);
  };

  return (
    <div className="fixed top-16 sm:top-20 inset-x-4 max-w-md mx-auto z-50 animate-slideDown pointer-events-auto select-none">
      <div className="glass-card rounded-2xl p-3.5 border border-amber-500/30 bg-amber-950/40 dark:bg-amber-950/60 shadow-glass flex items-center justify-between gap-3 text-amber-200">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-400">
            <WifiOff className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-black block leading-tight">You&apos;re Offline</span>
            <span className="text-[10px] text-amber-300/80 leading-tight block truncate">
              Showing cached shell. Connect to refresh data.
            </span>
          </div>
        </div>

        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs shrink-0 flex items-center gap-1.5 shadow-sm hover:opacity-90 btn-tactile cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isRetrying ? "animate-spin" : ""}`} />
          <span>Retry</span>
        </button>
      </div>
    </div>
  );
};
