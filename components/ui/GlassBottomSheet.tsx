"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { audioHaptics } from "../../lib/audioHaptics";

export interface GlassBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
}

export const GlassBottomSheet: React.FC<GlassBottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    audioHaptics.playTap();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn select-none">
      <div className="absolute inset-0" onClick={handleClose} />

      <div className="relative z-10 w-full max-w-lg rounded-t-[36px] sm:rounded-[36px] glass-panel border border-white/80 dark:border-white/10 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto hide-scrollbar animate-slideUp">
        {/* Drag Pill Handle for Mobile */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto sm:hidden" />

        {title && (
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
            {typeof title === "string" ? (
              <h3 className="font-black text-sm text-slate-900 dark:text-white">{title}</h3>
            ) : (
              title
            )}
            <button
              onClick={handleClose}
              className="w-7 h-7 rounded-full glass-pill flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition btn-tactile cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div>{children}</div>
      </div>
    </div>
  );
};
