"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Bell, Heart, MessageSquare, UserPlus, Sparkles, CheckCheck } from "lucide-react";
import { useAuth } from "../../lib/authContext";
import { audioHaptics } from "../../lib/audioHaptics";

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
      <div className="max-w-md mx-auto py-12 text-center p-8 rounded-[2rem] glass-card shadow-glass space-y-4">
        <Bell className="w-12 h-12 text-[#00B7FF] mx-auto" />
        <h2 className="text-lg font-black text-slate-900 dark:text-white">Sign In for Notifications</h2>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Sign in to receive real-time alerts for likes, comments, and new followers.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-3 rounded-full bg-[#00B7FF] text-slate-950 font-black text-xs shadow-md btn-tactile"
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
        return <Heart className="w-4 h-4 text-[#F45AA8] fill-current" />;
      case "COMMENT":
        return <MessageSquare className="w-4 h-4 text-[#00B7FF]" />;
      case "FOLLOW":
        return <UserPlus className="w-4 h-4 text-emerald-400" />;
      default:
        return <Bell className="w-4 h-4 text-[#00B7FF]" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 text-left">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl glass-panel flex items-center justify-center text-[#00B7FF]">
            <Bell className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white">Notifications</h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Activity and engagement alerts</p>
          </div>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="px-3.5 py-1.5 text-xs font-black rounded-full glass-pill text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1.5 btn-tactile"
        >
          <CheckCheck className="w-4 h-4 text-emerald-500" />
          <span>Mark All Read</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {["ALL", "LIKE", "COMMENT", "FOLLOW", "NFT_MINT"].map((t) => (
          <button
            key={t}
            onClick={() => {
              audioHaptics.playTap();
              setFilter(t);
            }}
            className={`px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-full transition-all shrink-0 btn-tactile ${
              filter === t
                ? "bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 shadow-sm font-black"
                : "glass-pill text-slate-600 dark:text-slate-400"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading notifications...</div>
        ) : filteredNotifications.length > 0 ? (
          filteredNotifications.map((n) => (
            <Link
              key={n.id}
              href={n.link || "/feed"}
              onClick={() => audioHaptics.playTap()}
              className={`p-3.5 rounded-[1.5rem] glass-card transition-all flex items-center gap-3.5 btn-tactile ${
                n.read
                  ? "opacity-85"
                  : "border-[#7EDBE8] shadow-glass"
              }`}
            >
              <div className="w-9 h-9 rounded-2xl glass-panel flex items-center justify-center shrink-0">
                {getIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-900 dark:text-white">{n.title}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 truncate font-medium">{n.message}</p>
                <p className="text-[9.5px] text-slate-400 mt-0.5">{new Date(n.createdAt).toLocaleDateString()}</p>
              </div>

              {!n.read && (
                <span className="w-2 h-2 rounded-full bg-[#F45AA8] shrink-0 animate-pulse" />
              )}
            </Link>
          ))
        ) : (
          <div className="p-12 text-center text-xs text-slate-400 glass-card rounded-[2rem]">
            No notifications yet.
          </div>
        )}
      </div>
    </div>
  );
}
