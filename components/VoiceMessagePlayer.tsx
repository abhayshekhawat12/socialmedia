'use client';

import React, { useState } from 'react';
import { Play, Pause, Mic, CheckCheck } from 'lucide-react';

interface VoiceMessagePlayerProps {
  duration?: string;
  isUser?: boolean;
}

export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({
  duration = '0:14',
  isUser = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<'1x' | '1.5x' | '2x'>('1x');

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (speed === '1x') setSpeed('1.5x');
    else if (speed === '1.5x') setSpeed('2x');
    else setSpeed('1x');
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex items-center gap-2.5 py-1">
      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm cursor-pointer transition-transform active:scale-95 ${
          isUser ? 'bg-white text-[#00B7FF]' : 'bg-[#00B7FF] text-white'
        }`}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>

      {/* Voice Waveform Simulation */}
      <div className="flex-1 flex items-center gap-0.5 h-6">
        {[40, 70, 30, 90, 50, 80, 100, 60, 40, 80, 50, 30, 90, 60, 40, 70].map((h, i) => (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-300 ${
              isPlaying && i % 3 === 0
                ? 'bg-amber-300 animate-pulse'
                : isUser
                ? 'bg-white/80'
                : 'bg-[#00B7FF]/70'
            }`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>

      {/* Speed Selector Toggle */}
      <button
        onClick={cycleSpeed}
        className={`px-1.5 py-0.5 rounded-md font-mono text-[9px] font-extrabold cursor-pointer border transition-colors ${
          isUser
            ? 'bg-white/20 border-white/40 text-white hover:bg-white/30'
            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-700 dark:text-slate-200'
        }`}
      >
        {speed}
      </button>

      <span className={`text-[10px] font-mono font-bold ${isUser ? 'text-sky-100' : 'text-slate-400'}`}>
        {duration}
      </span>
    </div>
  );
};
