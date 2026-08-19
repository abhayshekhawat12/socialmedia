"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { audioHaptics } from "../../lib/audioHaptics";

export interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
  showClose?: boolean;
}

export const GlassModal: React.FC<GlassModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "md",
  showClose = true,
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

  const maxWidths = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  };

  const handleClose = () => {
    audioHaptics.playTap();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn select-none">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={handleClose} />

      {/* Modal Content */}
      <div
        className={`relative z-10 w-full ${maxWidths[maxWidth]} rounded-[32px] glass-panel border border-white/80 dark:border-white/10 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto hide-scrollbar animate-in zoom-in-95`}
      >
        {(title || showClose) && (
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
            {title && typeof title === "string" ? (
              <h3 className="font-black text-sm text-slate-900 dark:text-white">{title}</h3>
            ) : (
              title
            )}
            {showClose && (
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full glass-pill flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition btn-tactile cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        )}

        <div>{children}</div>
      </div>
    </div>
  );
};
