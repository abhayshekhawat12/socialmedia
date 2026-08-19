"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Compass, Plus, MessageCircle, User } from "lucide-react";
import { useAuth } from "../lib/authContext";
import { audioHaptics } from "../lib/audioHaptics";
import { CreateActionSheet } from "./CreateActionSheet";
import { CreatePostModal } from "./CreatePostModal";
import { GlassBottomSheet } from "./ui/GlassBottomSheet";

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { account } = useAuth();
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const profileHref = account ? `/profile/${account}` : "/profile";

  const isHome = pathname === "/feed" || pathname === "/";
  const isExplore = pathname.startsWith("/explore");
  const isChats = pathname.startsWith("/chats");
  const isProfile = pathname.startsWith("/profile");

  const handleSelectCreateType = (type: "post" | "reel" | "story") => {
    setIsActionSheetOpen(false);
    if (type === "reel") {
      router.push("/pulse?create=true");
    } else if (type === "story") {
      router.push("/feed?create_story=true");
    } else {
      setIsCreateModalOpen(true);
    }
  };

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 p-3 pb-safe select-none">
        <div className="glass-dock rounded-[32px] px-3 py-2 flex items-center justify-around gap-1 shadow-glass border border-white/80 dark:border-white/12">
          {/* 1. Home */}
          <Link
            href="/feed"
            onClick={() => audioHaptics.playNav()}
            className={`flex flex-col items-center justify-center p-2.5 rounded-2xl transition-all btn-tactile ${
              isHome
                ? "bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 font-black shadow-md shadow-cyan-500/25 scale-105"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
            title="Home"
          >
            <Home className={`w-5 h-5 ${isHome ? "stroke-[2.8]" : "stroke-[2.2]"}`} />
          </Link>

          {/* 2. Explore */}
          <Link
            href="/explore"
            onClick={() => audioHaptics.playNav()}
            className={`flex flex-col items-center justify-center p-2.5 rounded-2xl transition-all btn-tactile ${
              isExplore
                ? "bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 font-black shadow-md shadow-cyan-500/25 scale-105"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
            title="Explore"
          >
            <Compass className={`w-5 h-5 ${isExplore ? "stroke-[2.8]" : "stroke-[2.2]"}`} />
          </Link>

          {/* 3. Create (Emphasized Center Action Button) */}
          <button
            onClick={() => {
              audioHaptics.playTap();
              setIsActionSheetOpen(true);
            }}
            aria-label="Create Content"
            className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00B7FF] via-[#7EDBE8] to-[#F45AA8] text-slate-950 shadow-md shadow-cyan-500/30 btn-tactile hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>

          {/* 4. Messages (Direct Chat Access in Bottom Nav) */}
          <Link
            href="/chats"
            onClick={() => audioHaptics.playNav()}
            className={`flex flex-col items-center justify-center p-2.5 rounded-2xl transition-all btn-tactile relative ${
              isChats
                ? "bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 font-black shadow-md shadow-cyan-500/25 scale-105"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
            title="Messages"
          >
            <MessageCircle className={`w-5 h-5 ${isChats ? "stroke-[2.8]" : "stroke-[2.2]"}`} />
          </Link>

          {/* 5. Profile */}
          <Link
            href={profileHref}
            onClick={() => audioHaptics.playNav()}
            className={`flex flex-col items-center justify-center p-2.5 rounded-2xl transition-all btn-tactile ${
              isProfile
                ? "bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 font-black shadow-md shadow-cyan-500/25 scale-105"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
            title="Profile"
          >
            <User className={`w-5 h-5 ${isProfile ? "stroke-[2.8]" : "stroke-[2.2]"}`} />
          </Link>
        </div>
      </nav>

      {/* Mobile Create Action Bottom Sheet */}
      <CreateActionSheet
        isOpen={isActionSheetOpen}
        onClose={() => setIsActionSheetOpen(false)}
        onSelectOption={handleSelectCreateType}
      />

      {/* Mobile Create Post Modal */}
      <GlassBottomSheet
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Post"
      >
        <CreatePostModal />
      </GlassBottomSheet>
    </>
  );
};
