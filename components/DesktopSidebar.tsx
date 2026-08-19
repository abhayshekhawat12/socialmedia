"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Compass, 
  PlaySquare, 
  Bell, 
  Mail, 
  User, 
  PlusSquare, 
  ShoppingBag, 
  Settings, 
  Sparkles,
  LogOut,
  Moon,
  Sun
} from "lucide-react";
import { useAuth } from "../lib/authContext";
import { useTheme } from "../lib/themeContext";
import { audioHaptics } from "../lib/audioHaptics";
import { CreatePostModal } from "./CreatePostModal";
import { GlassModal } from "./ui/GlassModal";

export const DesktopSidebar: React.FC = () => {
  const pathname = usePathname();
  const { account, profile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const profileHref = account ? `/profile/${account}` : "/profile";

  const navItems = [
    { label: "Home", href: "/feed", icon: Home },
    { label: "Explore", href: "/explore", icon: Compass },
    { label: "Reels", href: "/pulse", icon: PlaySquare },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Messages", href: "/chats", icon: Mail },
    { label: "Marketplace", href: "/hiring", icon: ShoppingBag },
    { label: "Settings", href: "/settings", icon: Settings },
    { label: "Profile", href: profileHref, icon: User },
  ];

  return (
    <>
      <aside className="hidden md:flex flex-col col-span-3 sticky top-6 h-[calc(100vh-48px)] p-5 rounded-[32px] glass-panel border border-white/80 dark:border-white/10 shadow-glass select-none">
        {/* Brand Logo */}
        <Link 
          href="/feed" 
          onClick={() => audioHaptics.playNav()}
          className="flex items-center gap-3 mb-6 group btn-tactile"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#00B7FF] via-[#7EDBE8] to-[#F45AA8] p-0.5 shadow-md shadow-cyan-500/25 group-hover:scale-105 transition-transform duration-200">
            <div className="w-full h-full rounded-[14px] bg-white dark:bg-[#131b2e] flex items-center justify-center text-[#00B7FF]">
              <Sparkles className="w-5 h-5 fill-current" />
            </div>
          </div>
          <span className="font-black text-2xl tracking-tight bg-gradient-to-r from-[#0F172A] to-[#00B7FF] dark:from-white dark:to-[#7EDBE8] bg-clip-text text-transparent">
            Pulse
          </span>
        </Link>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5 flex-grow">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href === "/feed" && pathname === "/") ||
              (item.href !== "/feed" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => audioHaptics.playNav()}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-200 font-bold text-xs btn-tactile ${
                  isActive
                    ? "bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 font-black shadow-md shadow-cyan-500/20"
                    : "text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-white"
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? "stroke-[2.8] text-slate-950" : "stroke-[2.2]"
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Create Post Action Button */}
        <div className="mt-4 mb-4">
          <button
            onClick={() => {
              audioHaptics.playTap();
              setIsCreateOpen(true);
            }}
            className="w-full bg-gradient-to-r from-[#00B7FF] via-[#7EDBE8] to-[#F45AA8] hover:opacity-95 text-slate-950 py-3.5 px-4 rounded-2xl font-black text-xs transition-all shadow-md shadow-cyan-500/25 btn-tactile flex items-center justify-center gap-2"
          >
            <PlusSquare className="w-4.5 h-4.5 stroke-[2.5]" />
            <span>Create Post</span>
          </button>
        </div>

        {/* User Account / Profile Card at Bottom */}
        <div className="pt-3 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between">
          {account ? (
            <Link
              href={profileHref}
              className="flex items-center gap-2.5 flex-1 min-w-0 group hover:opacity-85 transition"
            >
              <div className="w-9 h-9 rounded-full overflow-hidden border border-white/80 p-0.5 bg-gradient-to-tr from-[#00B7FF] to-[#F45AA8] shrink-0 shadow-sm">
                <img
                  src={
                    profile?.avatarUrl ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${account}`
                  }
                  alt="User Avatar"
                  className="w-full h-full object-cover rounded-full bg-white dark:bg-slate-900"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                  {profile?.displayName || profile?.username || "Creator"}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  @{profile?.username || account.slice(0, 8)}
                </span>
              </div>
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-xs font-black text-[#00B7FF] hover:underline"
            >
              Sign In to Pulse
            </Link>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              title="Toggle theme"
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-white/10 rounded-full transition btn-tactile cursor-pointer"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
            {account && (
              <button
                onClick={logout}
                title="Logout"
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-full transition btn-tactile cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Desktop Glass Create Modal */}
      <GlassModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Post"
        maxWidth="2xl"
      >
        <CreatePostModal />
      </GlassModal>
    </>
  );
};
