"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Bell, Heart, MessageSquare, UserPlus, Sparkles, CheckCheck, Check } from "lucide-react";
import { useAuth } from "../../lib/authContext";
import { audioHaptics } from "../../lib/audioHaptics";
import { GlassChip } from "../../components/ui/GlassChip";
import { GlassLoader } from "../../components/ui/GlassLoader";

export default function NotificationsPage() {
  const { account } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!account) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/notifications?recipientAddress=${account}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    if (!account) return;
    audioHaptics.playTap();
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientAddress: account }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  if (!account) {
    return (
      <div className="max-w-md mx-auto py-16 text-center p-8 rounded-[32px] glass-card border border-white/80 dark:border-white/10 shadow-glass space-y-4 animate-fadeIn">
        <div className="w-14 h-14 rounded-2xl glass-panel flex items-center justify-center mx-auto text-[#00B7FF]">
          <Bell className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">Sign In for Activity</h2>
        <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
          Sign in to receive instant alerts for likes, comments, and new followers on Pulse.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-2.5 rounded-full bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 font-black text-xs shadow-md btn-tactile"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const filteredNotifications = filter === "ALL" ? notifications : notifications.filter((n) => n.type === filter);

  const getIcon = (type: string) => {
    switch (type) {
      case "LIKE":
        return <Heart className="w-3.5 h-3.5 text-[#F45AA8] fill-current" />;
      case "COMMENT":
        return <MessageSquare className="w-3.5 h-3.5 text-[#00B7FF]" />;
      case "FOLLOW":
        return <UserPlus className="w-3.5 h-3.5 text-emerald-500" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-[#00B7FF]" />;
    }
  };

  return (
    <div className="space-y-4 text-left select-none px-1 md:px-0 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Activity</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Stay connected with your audience</p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="px-3.5 py-1.5 text-xs font-bold rounded-full glass-pill text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition flex items-center gap-1.5 btn-tactile cursor-pointer"
        >
          <CheckCheck className="w-4 h-4 text-emerald-500" />
          <span>Mark all read</span>
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
        {["ALL", "LIKE", "COMMENT", "FOLLOW"].map((f) => (
          <GlassChip
            key={f}
            label={f === "ALL" ? "All Activity" : f.charAt(0) + f.slice(1).toLowerCase() + "s"}
            isActive={filter === f}
            onClick={() => setFilter(f)}
          />
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {loading && notifications.length === 0 ? (
          <div className="py-8 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass-card rounded-[24px] p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full glass-pill skeleton-shimmer shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-3.5 w-3/4 rounded-full glass-pill skeleton-shimmer" />
                  <div className="h-2.5 w-1/4 rounded-full glass-pill skeleton-shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-16 text-center p-8 rounded-[32px] glass-card border border-white/80 dark:border-white/10 shadow-glass space-y-3">
            <div className="w-12 h-12 rounded-2xl glass-panel flex items-center justify-center mx-auto text-slate-400">
              <Bell className="w-6 h-6" />
            </div>
            <p className="text-sm font-black text-slate-900 dark:text-white">No notifications yet</p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              When someone interacts with your posts or profile, you'll see alerts here.
            </p>
          </div>
        ) : (
          filteredNotifications.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 sm:p-4 rounded-[24px] glass-card border border-white/80 dark:border-white/10 shadow-sm flex items-center justify-between gap-3 transition ${
                !item.read ? "border-l-4 border-l-[#00B7FF] shadow-glow-cyan" : ""
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-white/80 p-0.5 bg-gradient-to-tr from-[#00B7FF] to-[#7EDBE8]">
                    <img
                      src={
                        item.senderProfile?.avatarUrl ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${item.senderAddress}`
                      }
                      alt="User"
                      className="w-full h-full object-cover rounded-full bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full glass-dock shadow-sm flex items-center justify-center">
                    {getIcon(item.type)}
                  </div>
                </div>

                <div className="flex flex-col min-w-0">
                  <p className="text-xs text-slate-800 dark:text-slate-200 leading-snug font-medium">
                    <span className="font-black text-slate-900 dark:text-white mr-1">
                      {item.senderProfile?.displayName || item.senderProfile?.username || "Someone"}
                    </span>
                    {item.message || "interacted with your content."}
                  </p>
                  <span className="text-[10px] text-slate-400 mt-0.5 font-medium">
                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              {!item.read && (
                <span className="w-2 h-2 rounded-full bg-[#00B7FF] shadow-glow-cyan shrink-0" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
