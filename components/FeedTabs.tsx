'use client';

import React, { useState } from 'react';

interface FeedTabsProps {
  onTabChange?: (tab: string) => void;
}

export const FeedTabs: React.FC<FeedTabsProps> = ({ onTabChange }) => {
  const [activeTab, setActiveTab] = useState<'posts' | 'stories' | 'reels'>('posts');

  const handleSelect = (tab: 'posts' | 'stories' | 'reels') => {
    setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  return (
    <div className="w-full bg-[#EBF0F5] dark:bg-slate-800/80 p-1 rounded-full flex items-center justify-between text-xs font-extrabold shadow-inner">
      <button
        onClick={() => handleSelect('posts')}
        className={`flex-1 py-2.5 rounded-full transition-all duration-200 text-center cursor-pointer ${
          activeTab === 'posts'
            ? 'bg-[#00B7FF] text-white shadow-md shadow-[#00B7FF]/20'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
        }`}
      >
        Social Posts
      </button>

      <button
        onClick={() => handleSelect('stories')}
        className={`flex-1 py-2.5 rounded-full transition-all duration-200 text-center cursor-pointer ${
          activeTab === 'stories'
            ? 'bg-[#00B7FF] text-white shadow-md shadow-[#00B7FF]/20'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
        }`}
      >
        Stories
      </button>

      <button
        onClick={() => handleSelect('reels')}
        className={`flex-1 py-2.5 rounded-full transition-all duration-200 text-center cursor-pointer ${
          activeTab === 'reels'
            ? 'bg-[#00B7FF] text-white shadow-md shadow-[#00B7FF]/20'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
        }`}
      >
        Short Videos
      </button>
    </div>
  );
};
