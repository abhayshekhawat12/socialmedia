"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Heart, 
  MessageSquare, 
  Image as ImageIcon,
  ArrowUpRight
} from "lucide-react";
import { AnalyticsCharts } from "../../components/AnalyticsCharts";
import { useAuth } from "../../lib/authContext";

export default function DashboardPage() {
  const { account } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async (addr: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/dashboard?walletAddress=${addr}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (account) {
      fetchDashboardData(account);
    } else {
      setLoading(false);
    }
  }, [account, fetchDashboardData]);

  if (!account) {
    return (
      <div className="max-w-md mx-auto py-12 text-center p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-xl space-y-4">
        <BarChart3 className="w-12 h-12 text-[#00B7FF] mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Sign In for Analytics</h2>
        <p className="text-xs text-slate-400">
          Sign in to your Aura account to view creator performance metrics, engagement trends, and post insights.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-3 rounded-2xl bg-[#00B7FF] text-slate-950 font-extrabold text-xs shadow-md"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (loading || !data) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading Creator Dashboard...</div>;
  }

  const { stats, engagementTrend, recentPosts } = data;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#00B7FF]">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Creator Analytics</h1>
            <p className="text-xs text-slate-400">Performance insights and audience growth</p>
          </div>
        </div>

        <Link
          href="/create"
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00B7FF] to-indigo-600 text-white font-bold text-xs shadow-md hover:opacity-90"
        >
          + New Post
        </Link>
      </div>

      {/* Overview Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold">Total Posts</span>
            <ImageIcon className="w-4 h-4 text-[#00B7FF]" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{stats.totalPosts}</p>
          <p className="text-[10px] text-cyan-400 font-bold">Published</p>
        </div>

        <div className="p-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold">Followers</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{stats.totalFollowers}</p>
          <p className="text-[10px] text-purple-400 font-bold">Community</p>
        </div>

        <div className="p-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold">Total Likes</span>
            <Heart className="w-4 h-4 text-pink-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{stats.totalLikes || 0}</p>
          <p className="text-[10px] text-pink-400 font-bold">Reactions</p>
        </div>

        <div className="p-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold">Engagement</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-400">{stats.engagementRate}%</p>
          <p className="text-[10px] text-emerald-400 font-bold">Avg Rate</p>
        </div>
      </div>

      {/* Analytics Charts */}
      <AnalyticsCharts trendData={engagementTrend || []} />

      {/* Recent Posts Performance Table */}
      <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <span>Recent Posts Performance</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-2">Media</th>
                <th className="py-3 px-2">Caption</th>
                <th className="py-3 px-2">Likes</th>
                <th className="py-3 px-2">Comments</th>
                <th className="py-3 px-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {recentPosts?.map((post: any) => (
                <tr key={post.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="py-3 px-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-950 overflow-hidden flex items-center justify-center">
                      <img src={post.mediaUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                    </div>
                  </td>
                  <td className="py-3 px-2 text-slate-800 dark:text-slate-200 font-medium max-w-[200px] truncate">
                    {post.caption || "No caption"}
                  </td>
                  <td className="py-3 px-2 font-bold text-pink-500">
                    {post.likeCount || post.likes?.length || 0}
                  </td>
                  <td className="py-3 px-2 font-bold text-cyan-500">
                    {post.commentCount || post.comments?.length || 0}
                  </td>
                  <td className="py-3 px-2">
                    <Link
                      href={`/post/${post.id}`}
                      className="text-[11px] font-bold text-[#00B7FF] hover:underline flex items-center gap-0.5"
                    >
                      <span>View</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
