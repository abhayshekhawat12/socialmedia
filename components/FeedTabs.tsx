"use client";

import React, { useState } from "react";
import { audioHaptics } from "../lib/audioHaptics";

interface FeedTabsProps {
  activeTab?: "posts" | "stories" | "reels";
  onTabChange?: (tab: "posts" | "stories" | "reels") => void;
}

export const FeedTabs: React.FC<FeedTabsProps> = ({ activeTab: controlledTab, onTabChange }) => {
  const [internalTab, setInternalTab] = useState<"posts" | "stories" | "reels">("posts");
  const activeTab = controlledTab || internalTab;

  const handleSelect = (tab: "posts" | "stories" | "reels") => {
    audioHaptics.playTap();
    setInternalTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  return (
    <div className="w-full glass-panel p-1 rounded-full flex items-center justify-between text-xs font-black select-none mb-4 shadow-sm border border-white/80 dark:border-white/10">
      <button
        onClick={() => handleSelect("posts")}
        className={`flex-1 py-2 px-3 rounded-full transition-all duration-200 text-center cursor-pointer btn-tactile ${
          activeTab === "posts"
            ? "bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 shadow-md shadow-cyan-500/20"
            : "text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white"
        }`}
      >
        Feed
      </button>

      <button
        onClick={() => handleSelect("reels")}
        className={`flex-1 py-2 px-3 rounded-full transition-all duration-200 text-center cursor-pointer btn-tactile ${
          activeTab === "reels"
            ? "bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 shadow-md shadow-cyan-500/20"
            : "text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white"
        }`}
      >
        Reels
      </button>

      <button
        onClick={() => handleSelect("stories")}
        className={`flex-1 py-2 px-3 rounded-full transition-all duration-200 text-center cursor-pointer btn-tactile ${
          activeTab === "stories"
            ? "bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 shadow-md shadow-cyan-500/20"
            : "text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white"
        }`}
      >
        Stories
      </button>
    </div>
  );
};
