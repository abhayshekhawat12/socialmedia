'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { SnapViewer } from '../../components/SnapViewer';
import { Camera, X, Zap, RefreshCw, Sparkles, Image, ArrowRight } from 'lucide-react';

export default function CameraPage() {
  const [activeMode, setActiveMode] = useState<'story' | 'snap' | 'post'>('snap');
  const [isSnapViewerOpen, setIsSnapViewerOpen] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  return (
    <div className="max-w-md mx-auto space-y-4 pb-20 relative">
      
      {/* Camera Viewport Container */}
      <div className="relative w-full h-[75vh] rounded-3xl overflow-hidden bg-slate-950 shadow-2xl border border-slate-800 flex flex-col justify-between p-4">
        
        {/* Live Camera Background Preview Placeholder */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-black flex items-center justify-center">
          <img
            src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80"
            alt="Camera Preview"
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-black/20" />
        </div>

        {/* Top Controls Bar */}
        <div className="relative z-10 flex items-center justify-between">
          <Link href="/feed" className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60">
            <X className="w-5 h-5" />
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFlashOn(!flashOn)}
              className={`p-2.5 rounded-full backdrop-blur-md border border-white/10 transition-colors ${
                flashOn ? 'bg-amber-400 text-slate-950' : 'bg-black/40 text-white'
              }`}
            >
              <Zap className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsSnapViewerOpen(true)}
              className="px-3 py-1.5 rounded-full bg-sky-500/80 backdrop-blur-md text-white font-extrabold text-xs flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" /> View New Snap
            </button>
          </div>
        </div>

        {/* Bottom Controls Bar & Capture Button */}
        <div className="relative z-10 space-y-6 text-center">
          
          {/* Main Controls */}
          <div className="flex items-center justify-around">
            <button className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10">
              <Image className="w-5 h-5" />
            </button>

            {/* Circular Capture Button */}
            <button
              onClick={() => setIsSnapViewerOpen(true)}
              className="w-20 h-20 rounded-full border-4 border-white bg-sky-500/80 hover:bg-sky-400 shadow-float flex items-center justify-center transition-transform hover:scale-105"
            >
              <div className="w-14 h-14 rounded-full bg-white shadow-inner" />
            </button>

            <button className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10">
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="inline-flex items-center p-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-xs font-bold text-white">
            <button
              onClick={() => setActiveMode('story')}
              className={`px-4 py-1.5 rounded-full transition-all ${
                activeMode === 'story' ? 'bg-white text-slate-950 shadow-sm' : 'text-white/70 hover:text-white'
              }`}
            >
              Story
            </button>

            <button
              onClick={() => setActiveMode('snap')}
              className={`px-4 py-1.5 rounded-full transition-all ${
                activeMode === 'snap' ? 'bg-sky-500 text-white shadow-sm' : 'text-white/70 hover:text-white'
              }`}
            >
              Snap
            </button>

            <button
              onClick={() => setActiveMode('post')}
              className={`px-4 py-1.5 rounded-full transition-all ${
                activeMode === 'post' ? 'bg-white text-slate-950 shadow-sm' : 'text-white/70 hover:text-white'
              }`}
            >
              Post
            </button>
          </div>

        </div>

      </div>

      {/* Snap Viewer Popup */}
      <SnapViewer
        isOpen={isSnapViewerOpen}
        onClose={() => setIsSnapViewerOpen(false)}
      />

    </div>
  );
}
