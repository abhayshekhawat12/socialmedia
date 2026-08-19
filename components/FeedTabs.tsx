'use client';

import React, { useState } from 'react';
import { audioHaptics } from '../lib/audioHaptics';

interface FeedTabsProps {
  activeTab?: 'posts' | 'stories' | 'reels';
  onTabChange?: (tab: 'posts' | 'stories' | 'reels') => void;
}

export const FeedTabs: React.FC<FeedTabsProps> = ({ activeTab: controlledTab, onTabChange }) => {
  const [internalTab, setInternalTab] = useState<'posts' | 'stories' | 'reels'>('posts');
  const activeTab = controlledTab || internalTab;

  const handleSelect = (tab: 'posts' | 'stories' | 'reels') => {
    audioHaptics.playTap();
    setInternalTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  return (
    <div className="w-full glass-panel p-1 rounded-full flex items-center justify-between text-xs font-black shadow-sm border border-white/60 dark:border-white/10">
      <button
        onClick={() => handleSelect('posts')}
        className={`flex-1 py-2 rounded-full transition-all duration-200 text-center cursor-pointer btn-tactile ${
          activeTab === 'posts'
            ? 'bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 font-black shadow-md shadow-cyan-500/20'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
        }`}
      >
        Social Posts
      </button>

      <button
        onClick={() => handleSelect('stories')}
        className={`flex-1 py-2 rounded-full transition-all duration-200 text-center cursor-pointer btn-tactile ${
          activeTab === 'stories'
            ? 'bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 font-black shadow-md shadow-cyan-500/20'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
        }`}
      >
        Stories
      </button>

      <button
        onClick={() => handleSelect('reels')}
        className={`flex-1 py-2 rounded-full transition-all duration-200 text-center cursor-pointer btn-tactile ${
          activeTab === 'reels'
            ? 'bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 font-black shadow-md shadow-cyan-500/20'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
        }`}
      >
        Reels
      </button>
    </div>
  );
};
