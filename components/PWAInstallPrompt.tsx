"use client";

import React, { useState, useEffect } from "react";
import { Download, X, Sparkles, Share, PlusSquare, CheckCircle, ShieldCheck } from "lucide-react";
import { audioHaptics } from "../lib/audioHaptics";

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if already running as installed standalone app
    const standaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(standaloneMode);
    if (standaloneMode) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 1. Capture beforeinstallprompt for Chrome / Android / Edge
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    const handleOpenCustom = () => {
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("pulse_open_install_prompt", handleOpenCustom);

    // 2. Show install popup after 1.5 seconds if not in standalone
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 1500);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("pulse_open_install_prompt", handleOpenCustom);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    audioHaptics.playTap();

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
      return;
    }

    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    // Fallback guide for desktop / android if prompt already dismissed
    setShowIOSModal(true);
  };

  const handleDismiss = () => {
    audioHaptics.playTap();
    setShowPrompt(false);
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <>
      {/* FLOATING GLASS DOWNLOAD / INSTALL POPUP */}
      <div className="fixed bottom-20 md:bottom-8 inset-x-3 sm:inset-x-auto sm:right-8 max-w-md mx-auto z-50 animate-slideUp pointer-events-auto select-none">
        <div className="glass-card rounded-[32px] p-5 border border-white/90 dark:border-white/15 shadow-glass bg-white/85 dark:bg-slate-900/90 relative overflow-hidden backdrop-blur-2xl">
          {/* Top subtle highlight */}
          <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-[#00B7FF] to-transparent" />

          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3.5">
              {/* App Icon Capsule */}
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#00B7FF] via-[#7EDBE8] to-[#F45AA8] p-0.5 shrink-0 shadow-glow-cyan">
                <div className="w-full h-full rounded-[14px] bg-[#090d16] flex items-center justify-center text-[#00B7FF]">
                  <Sparkles className="w-6 h-6 fill-current" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                    Pulse Mobile App
                  </h3>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/15 text-[#00B7FF] border border-cyan-500/25">
                    PWA 2026
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                  Install for full-screen native experience & offline mode.
                </p>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="w-7 h-7 rounded-full glass-pill flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white btn-tactile cursor-pointer shrink-0"
              aria-label="Close download popup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Feature Badges */}
          <div className="flex items-center gap-2 mb-4 text-[10px] font-extrabold text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-500" /> Fast Reels
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-500" /> Push Alerts
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#00B7FF]" /> 0MB Storage
            </span>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-[#00B7FF] via-[#7EDBE8] to-[#9B6CFF] text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-cyan-500/25 hover:opacity-95 transition btn-tactile cursor-pointer"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Download & Install App</span>
            </button>
            <button
              onClick={handleDismiss}
              className="py-3 px-4 rounded-2xl glass-pill font-bold text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition btn-tactile cursor-pointer"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>

      {/* iOS / Safari Step-by-Step Installation Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-sm glass-card rounded-[32px] p-6 border border-white/80 dark:border-white/15 shadow-glass bg-white/90 dark:bg-slate-900/90 text-left relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                How to Install Pulse
              </h3>
              <button
                onClick={() => setShowIOSModal(false)}
                className="w-8 h-8 rounded-full glass-pill flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300 font-semibold mb-6">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-cyan-500/20 text-[#00B7FF] flex items-center justify-center shrink-0 font-black">
                  1
                </div>
                <div>
                  Tap the <span className="font-black text-slate-900 dark:text-white">Share</span> button <Share className="w-3.5 h-3.5 inline mx-1 text-[#00B7FF]" /> at the bottom of Safari.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-cyan-500/20 text-[#00B7FF] flex items-center justify-center shrink-0 font-black">
                  2
                </div>
                <div>
                  Scroll down and select <span className="font-black text-slate-900 dark:text-white">&quot;Add to Home Screen&quot;</span> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-purple-400" />.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-cyan-500/20 text-[#00B7FF] flex items-center justify-center shrink-0 font-black">
                  3
                </div>
                <div>
                  Tap <span className="font-black text-slate-900 dark:text-white">&quot;Add&quot;</span> in the top right to open Pulse as a standalone app!
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 font-black text-xs shadow-md btn-tactile cursor-pointer"
            >
              Got it, thanks!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
