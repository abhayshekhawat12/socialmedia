"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { 
  BarChart3, 
  TrendingUp, 
  ShieldCheck, 
  Sparkles, 
  Users, 
  Eye, 
  Heart, 
  MessageSquare, 
  Copy, 
  ExternalLink,
  Wallet
} from "lucide-react";
import { AnalyticsCharts } from "../../components/AnalyticsCharts";
import { useWeb3 } from "../../lib/web3Context";

export default function DashboardPage() {
  const { account, connectWallet } = useWeb3();
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
        <BarChart3 className="w-12 h-12 text-cyan-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Connect Wallet for Analytics</h2>
        <p className="text-xs text-slate-400">
          Connect your Web3 wallet to access your creator engagement dashboard, Proof-of-Creation records, and NFT performance.
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

  if (loading || !data) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading Creator Dashboard...</div>;
  }

  const { stats, engagementTrend, recentPosts, verifications } = data;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Creator Analytics & Proof Ownership</h1>
            <p className="text-xs text-slate-400">Performance insights, proof records, and NFT engagement</p>
          </div>
        </div>

        <Link
          href="/create"
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold text-xs shadow-md"
        >
          + New Verified Post
        </Link>
      </div>

      {/* Overview Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold">Total Posts</span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{stats.totalPosts}</p>
          <p className="text-[10px] text-emerald-400 font-bold">100% Blockchain Fingerprinted</p>
        </div>

        <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold">Followers</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{stats.totalFollowers}</p>
          <p className="text-[10px] text-cyan-400 font-bold">Active Community</p>
        </div>

        <div className="p-5 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold">Engagement Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-400">{stats.engagementRate}%</p>
          <p className="text-[10px] text-slate-400">Likes + Comments / Views</p>
        </div>

        <div className="p-5 rounded-3xl border border-purple-500/30 bg-purple-500/10 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-purple-300 text-xs">
            <span className="font-semibold">NFT Assets</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-extrabold text-purple-300">{stats.totalNfts}</p>
          <p className="text-[10px] text-purple-400 font-bold">ERC721 Tokens Minted</p>
        </div>
      </div>

      {/* Analytics Charts */}
      <AnalyticsCharts trendData={engagementTrend || []} />

      {/* Content Ownership Records Table */}
      <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-lg space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          Immutable Proof-of-Creation Registry
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-2">Post Media</th>
                <th className="py-3 px-2">Content Fingerprint (Keccak-256)</th>
                <th className="py-3 px-2">IPFS CID</th>
                <th className="py-3 px-2">Status</th>
                <th className="py-3 px-2">NFT</th>
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
                  <td className="py-3 px-2 font-mono text-cyan-400 max-w-[180px] truncate" title={post.contentHash}>
                    {post.contentHash}
                  </td>
                  <td className="py-3 px-2 font-mono text-slate-300 max-w-[140px] truncate">
                    <a
                      href={`https://ipfs.io/ipfs/${post.mediaCid}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline text-cyan-500 flex items-center gap-1"
                    >
                      <span>{post.mediaCid.slice(0, 10)}...</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                  <td className="py-3 px-2">
                    <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      VERIFIED
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    {post.isNft ? (
                      <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        #{post.nftTokenId}
                      </span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
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
