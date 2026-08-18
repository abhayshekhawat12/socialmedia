"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Bell, Heart, MessageSquare, UserPlus, ShieldCheck, Sparkles, CheckCheck, Wallet } from "lucide-react";
import { useWeb3 } from "../../lib/web3Context";

export default function NotificationsPage() {
  const { account, connectWallet } = useWeb3();
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
      <div className="max-w-md mx-auto py-12 text-center p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-xl space-y-4">
        <Bell className="w-12 h-12 text-cyan-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Connect Wallet for Notifications</h2>
        <p className="text-xs text-slate-400">
          Connect your Web3 wallet to receive real-time alerts for likes, comments, new followers, and on-chain transactions.
        </p>
        <button
          onClick={connectWallet}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold text-xs shadow-md"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  const filteredNotifications = filter === "ALL" ? notifications : notifications.filter((n) => n.type === filter);

  const getIcon = (type: string) => {
    switch (type) {
      case "LIKE":
        return <Heart className="w-4 h-4 text-rose-500" />;
      case "COMMENT":
        return <MessageSquare className="w-4 h-4 text-cyan-400" />;
      case "FOLLOW":
        return <UserPlus className="w-4 h-4 text-emerald-400" />;
      case "NFT_MINT":
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      default:
        return <ShieldCheck className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Web3 Notifications</h1>
            <p className="text-xs text-slate-400">Real-time engagement & blockchain transaction alerts</p>
          </div>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-cyan-500 transition-colors flex items-center gap-1.5"
        >
          <CheckCheck className="w-4 h-4 text-emerald-400" />
          <span>Mark All Read</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {["ALL", "LIKE", "COMMENT", "FOLLOW", "NFT_MINT"].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-colors shrink-0 ${
              filter === t
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading notifications...</div>
        ) : filteredNotifications.length > 0 ? (
          filteredNotifications.map((n) => (
            <Link
              key={n.id}
              href={n.link || "/feed"}
              className={`p-4 rounded-2xl border transition-all flex items-center gap-4 ${
                n.read
                  ? "border-slate-200 dark:border-slate-800/60 bg-white dark:bg-[#131b2e]"
                  : "border-cyan-500/30 bg-cyan-500/5 dark:bg-cyan-950/20"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
                {getIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white">{n.title}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 truncate">{n.message}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{new Date(n.createdAt).toLocaleString()}</p>
              </div>

              {!n.read && (
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0" />
              )}
            </Link>
          ))
        ) : (
          <div className="p-12 text-center text-xs text-slate-400 border border-slate-800 rounded-3xl">
            No notifications yet.
          </div>
        )}
      </div>
    </div>
  );
}
