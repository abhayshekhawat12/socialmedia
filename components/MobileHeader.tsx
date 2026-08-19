"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, Search, Bell } from "lucide-react";
import { useAuth } from "../lib/authContext";
import { audioHaptics } from "../lib/audioHaptics";

export const MobileHeader: React.FC = () => {
  const { account, profile } = useAuth();
  const profileHref = account ? `/profile/${account}` : "/profile";

  return (
    <header className="md:hidden fixed top-0 inset-x-0 z-40 px-3 pt-2 select-none">
      <div className="glass-dock rounded-[24px] px-4 h-13 flex items-center justify-between shadow-glass border border-white/80 dark:border-white/10 transition-colors">
        {/* Brand Logo */}
        <Link
          href="/feed"
          onClick={() => audioHaptics.playNav()}
          className="flex items-center gap-2.5 group btn-tactile"
        >
          <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-[#00B7FF] via-[#7EDBE8] to-[#F45AA8] p-0.5 shadow-md shadow-cyan-500/20">
            <div className="w-full h-full rounded-[14px] bg-white dark:bg-[#131b2e] flex items-center justify-center text-[#00B7FF]">
              <Sparkles className="w-4 h-4 fill-current" />
            </div>
          </div>
          <span className="font-black text-xl tracking-tight bg-gradient-to-r from-[#0F172A] to-[#00B7FF] dark:from-white dark:to-[#7EDBE8] bg-clip-text text-transparent">
            Pulse
          </span>
        </Link>

        {/* Right Action Badges: Install App, Search, Notifications, Avatar */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              audioHaptics.playTap();
              window.dispatchEvent(new CustomEvent("pulse_open_install_prompt"));
            }}
            className="px-2.5 py-1.5 rounded-full bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 font-black text-[10px] flex items-center gap-1 shadow-sm btn-tactile cursor-pointer"
            title="Download App"
          >
            <Sparkles className="w-3 h-3 stroke-[3]" />
            <span>App</span>
          </button>

          <Link
            href="/explore"
            onClick={() => audioHaptics.playTap()}
            className="p-2 rounded-full glass-pill text-slate-700 dark:text-slate-200 btn-tactile hover:bg-white/80 dark:hover:bg-slate-800"
            title="Search"
          >
            <Search className="w-4 h-4 stroke-[2.4]" />
          </Link>

          <Link
            href="/notifications"
            onClick={() => audioHaptics.playTap()}
            className="p-2 rounded-full glass-pill text-slate-700 dark:text-slate-200 btn-tactile hover:bg-white/80 dark:hover:bg-slate-800 relative"
            title="Notifications"
          >
            <Bell className="w-4.5 h-4.5 stroke-[2.4]" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#F45AA8] rounded-full ring-2 ring-white dark:ring-[#131b2e] shadow-glow-pink" />
          </Link>

          <Link
            href={profileHref}
            onClick={() => audioHaptics.playTap()}
            className="w-8 h-8 rounded-full overflow-hidden p-0.5 bg-gradient-to-tr from-[#00B7FF] via-[#7EDBE8] to-[#F45AA8] shrink-0 btn-tactile shadow-sm hover:scale-105 transition-transform"
          >
            <img
              src={
                profile?.avatarUrl ||
                (account
                  ? `https://api.dicebear.com/7.x/bottts/svg?seed=${account}`
                  : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120")
              }
              alt="Profile"
              className="w-full h-full object-cover rounded-full bg-white dark:bg-slate-900"
            />
          </Link>
        </div>
      </div>
    </header>
  );
};
