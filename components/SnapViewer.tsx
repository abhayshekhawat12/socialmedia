'use client';

import React, { useState, useEffect } from 'react';
import { X, Send, Eye } from 'lucide-react';

interface SnapViewerProps {
  isOpen: boolean;
  onClose: () => void;
  snapMediaUrl?: string;
  senderName?: string;
}

export const SnapViewer: React.FC<SnapViewerProps> = ({
  isOpen,
  onClose,
  snapMediaUrl = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
  senderName = 'Alex_Sky',
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!isOpen) return;
    setProgress(100);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fadeIn">
      <div className="relative max-w-sm w-full h-[85vh] rounded-3xl overflow-hidden bg-slate-950 text-white shadow-2xl flex flex-col justify-between">
        
        {/* Top Progress Indicator */}
        <div className="absolute top-3 left-4 right-4 z-20 space-y-2">
          <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-400 transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center text-xs font-bold">
                {senderName.slice(0, 1)}
              </div>
              <span className="font-extrabold text-xs text-white">{senderName}</span>
            </div>

            <button onClick={onClose} className="p-1 rounded-full bg-black/40 text-white hover:bg-black/60">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Media Background Image */}
        <img src={snapMediaUrl} alt="Snap Media" className="w-full h-full object-cover" />

        {/* Bottom Reply Control */}
        <div className="absolute bottom-4 left-4 right-4 z-20">
          <div className="p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center gap-2">
            <input
              type="text"
              placeholder="Send a Snap reply..."
              className="flex-1 px-3 text-xs bg-transparent text-white outline-none placeholder-white/60"
            />
            <button className="p-2 rounded-full bg-sky-500 text-white">
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
