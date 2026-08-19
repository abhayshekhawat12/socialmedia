"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, Check, TrendingUp, Search, MessageCircle } from "lucide-react";
import { useAuth } from "../lib/authContext";
import { audioHaptics } from "../lib/audioHaptics";
import { creatorService } from "../lib/services/dataService";

interface SuggestedUser {
  walletAddress: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio?: string;
  isFollowing?: boolean;
}

export const RightSidebar: React.FC = () => {
  const { account } = useAuth();
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadSuggestions() {
      try {
        const creators = await creatorService.getSuggestedCreators(4);
        if (creators && creators.length > 0) {
          setSuggestions(creators);
        }
      } catch (e) {
        console.warn("Failed to load suggested creators from Supabase:", e);
      }
    }
    loadSuggestions();
  }, []);

  const handleToggleFollow = async (targetAddress: string) => {
    audioHaptics.playTap();
    const isNowFollowing = !followingMap[targetAddress];
    setFollowingMap((prev) => ({ ...prev, [targetAddress]: isNowFollowing }));

    if (account) {
      try {
        await fetch("/api/users/follow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            followerAddress: account,
            followingAddress: targetAddress,
          }),
        });
      } catch (err) {
        console.error("Follow error:", err);
      }
    }
  };

  return (
    <aside className="hidden lg:flex flex-col col-span-3 sticky top-6 h-[calc(100vh-48px)] p-5 rounded-[32px] glass-panel border border-white/80 dark:border-white/10 shadow-glass select-none">
      {/* Search Field */}
      <div className="relative mb-5">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search creators & tags"
          className="w-full glass-input text-xs text-slate-900 dark:text-white rounded-2xl pl-9 pr-3.5 py-2.5 outline-none transition font-semibold"
        />
      </div>

      {/* Suggested Creators */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-black text-slate-800 dark:text-slate-200">
            Suggested for you
          </span>
          <Link
            href="/explore"
            className="text-[11px] font-black text-[#00B7FF] hover:underline"
          >
            See All
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          {suggestions.map((creator) => {
            const isFollowing = followingMap[creator.walletAddress];

            return (
              <div
                key={creator.walletAddress}
                className="flex items-center justify-between gap-3 group"
              >
                <Link
                  href={`/profile/${creator.walletAddress}`}
                  className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-85 transition"
                >
                  <div className="w-9 h-9 rounded-full overflow-hidden border border-white/80 p-0.5 bg-gradient-to-tr from-[#00B7FF] to-[#7EDBE8] shrink-0 shadow-sm">
                    <img
                      src={creator.avatarUrl}
                      alt={creator.displayName}
                      className="w-full h-full object-cover rounded-full bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {creator.username}
                      </span>
                      <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 flex items-center justify-center shrink-0">
                        <Check className="w-2 h-2 stroke-[3]" />
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {creator.bio || "Creator on Pulse"}
                    </span>
                  </div>
                </Link>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Link
                    href={`/chats?targetAddress=${creator.walletAddress}`}
                    className="p-1.5 rounded-full glass-pill text-[#00B7FF] hover:bg-cyan-500/10 transition cursor-pointer"
                    title="Direct Message"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    onClick={() => handleToggleFollow(creator.walletAddress)}
                    className={`px-3 py-1 rounded-full text-[11px] font-black transition btn-tactile cursor-pointer ${
                      isFollowing
                        ? "glass-pill text-slate-500 hover:text-rose-500"
                        : "bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 shadow-sm"
                    }`}
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trending Topics */}
      <div className="mb-auto p-4 rounded-3xl glass-card border border-white/70 dark:border-white/10 shadow-sm">
        <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white mb-2.5">
          <TrendingUp className="w-3.5 h-3.5 text-[#00B7FF]" />
          <span>Trending on Pulse</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["#architecture", "#minimalism", "#design", "#photography", "#cinema", "#future"].map(
            (tag) => (
              <Link
                key={tag}
                href={`/explore?tag=${tag.replace("#", "")}`}
                className="px-2.5 py-1 glass-pill rounded-full text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:text-[#00B7FF] transition btn-tactile"
              >
                {tag}
              </Link>
            )
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="pt-4 text-slate-400 text-[10px] leading-relaxed border-t border-slate-200/60 dark:border-white/10">
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-1.5 font-semibold">
          <Link href="/development" className="hover:underline">About</Link>
          <Link href="/settings" className="hover:underline">Help</Link>
          <Link href="/hiring" className="hover:underline">Marketplace</Link>
          <Link href="/settings" className="hover:underline">Privacy</Link>
          <Link href="/settings" className="hover:underline">Terms</Link>
        </div>
        <p>© 2026 Pulse — Modern Social Experience</p>
      </footer>
    </aside>
  );
};
