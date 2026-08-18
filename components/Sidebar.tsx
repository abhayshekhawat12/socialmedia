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
  ShieldCheck,
  Sparkles,
  Flame
} from "lucide-react";
import { useWeb3 } from "../lib/web3Context";

export function Sidebar() {
  const pathname = usePathname();
  const { account, profile } = useWeb3();

  const navItems = [
    { label: "Home Feed", href: "/feed", icon: Home },
    { label: "Explore", href: "/explore", icon: Compass },
    { label: "Trending", href: "/trending", icon: Flame, badge: "🔥" },
    { label: "Pulse", href: "/pulse", icon: PlayCircle, badge: "⚡" },
    { label: "Create Post", href: "/create", icon: PlusCircle },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Analytics", href: "/dashboard", icon: BarChart3 },
    { label: "Profile", href: "/profile", icon: User },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="w-64 shrink-0 hidden md:block py-6">
      <div className="sticky top-22 flex flex-col gap-6">
        {/* User Card Widget */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-600 p-0.5 shadow-md shadow-cyan-500/20 shrink-0">
              <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-sm">
                {account ? account.substring(2, 4).toUpperCase() : "W3"}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold truncate text-slate-900 dark:text-slate-100">
                {profile?.displayName || (account ? `Creator ${account.slice(0, 6)}` : "Guest Wallet")}
              </h4>
              <p className="text-xs text-cyan-500 dark:text-cyan-400 font-mono truncate">
                {profile?.username ? `@${profile.username}` : (account ? `${account.slice(0, 8)}...` : "Not connected")}
              </p>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              Proof Verified
            </span>
            <span className="font-semibold text-purple-400">Web3 Core</span>
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
                className={`flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md shadow-slate-950/10"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Icon className={`w-5 h-5 ${isActive ? "text-cyan-400 dark:text-cyan-600" : ""}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-xs font-bold text-cyan-400">{item.badge}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Banner Box */}
        <div className="p-4 rounded-2xl bg-gradient-to-tr from-cyan-950/40 to-purple-950/40 border border-cyan-500/20 text-xs">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold mb-1">
            <Sparkles className="w-4 h-4" />
            Proof-of-Creation
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Every Pulse video & post generates an immutable cryptographic fingerprint anchored on blockchain.
          </p>
        </div>
      </div>
    </aside>
  );
}
