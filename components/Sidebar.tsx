"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Compass, 
  PlayCircle,
  PlusCircle, 
  Bell, 
  BarChart3, 
  User, 
  Settings, 
  Sparkles,
  Flame,
  MessageCircle,
  Globe,
  Camera,
  Briefcase
} from "lucide-react";
import { useAuth } from "../lib/authContext";

export function Sidebar() {
  const pathname = usePathname();
  const { account, profile } = useAuth();

  const navItems = [
    { label: "Home Feed", href: "/feed", icon: Home },
    { label: "Snap", href: "/snap", icon: Camera, badge: "👻" },
    { label: "Explore", href: "/explore", icon: Compass },
    { label: "Trending", href: "/trending", icon: Flame, badge: "🔥" },
    { label: "Pulse", href: "/pulse", icon: PlayCircle, badge: "⚡" },
    { label: "Hiring / Collabs", href: "/hiring", icon: Briefcase, badge: "Collab" },
    { label: "Community", href: "/community", icon: Globe },
    { label: "Chats", href: "/chats", icon: MessageCircle, badge: "1" },
    { label: "Create Post", href: "/create", icon: PlusCircle },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Analytics", href: "/dashboard", icon: BarChart3 },
    { label: "Profile", href: "/profile", icon: User },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  const displayName = profile?.displayName || (account ? `User ${account.slice(0, 6)}` : "Guest");
  const username = profile?.username || (account ? `user_${account.slice(0, 8)}` : "guest");
  const avatarUrl = profile?.avatarUrl;

  return (
    <aside className="w-64 shrink-0 hidden md:block py-6">
      <div className="sticky top-20 flex flex-col gap-6">
        {/* User Card Widget */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#00B7FF] to-purple-600 p-0.5 shadow-md shadow-cyan-500/15 shrink-0 overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full rounded-full object-cover bg-slate-900" />
              ) : (
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-sm">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold truncate text-slate-900 dark:text-slate-100">
                {displayName}
              </h4>
              <p className="text-xs text-cyan-500 dark:text-cyan-400 font-semibold truncate">
                @{username}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 ${
                  isActive
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md shadow-slate-950/10"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4.5 h-4.5 ${isActive ? "text-[#00B7FF] dark:text-[#00B7FF]" : ""}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-xs font-bold text-cyan-400">{item.badge}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
