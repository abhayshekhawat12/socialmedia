"use client";

import React, { useState } from "react";
import { 
  ShieldCheck, 
  Copy, 
  Check, 
  Edit3, 
  ExternalLink, 
  Users, 
  Grid, 
  Sparkles, 
  X,
  Wallet
} from "lucide-react";
import { useWeb3 } from "../lib/web3Context";

interface ProfileHeaderProps {
  user: {
    walletAddress: string;
    profile?: {
      username?: string;
      displayName?: string;
      bio?: string;
      avatarUrl?: string;
      bannerUrl?: string;
      web3ProfileId?: string;
    };
  };
  stats: {
    postsCount: number;
    followersCount: number;
    followingCount: number;
    nftsCount: number;
    verificationsCount?: number;
  };
  onProfileUpdated?: () => void;
}

export function ProfileHeader({ user, stats, onProfileUpdated }: ProfileHeaderProps) {
  const { account, isWeb3Connected, refreshProfile, registerProfileOnChain } = useWeb3();
  const [copied, setCopied] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [displayName, setDisplayName] = useState(user.profile?.displayName || "");
  const [username, setUsername] = useState(user.profile?.username || "");
  const [bio, setBio] = useState(user.profile?.bio || "");
  const [isSaving, setIsSaving] = useState(false);

  const isOwnProfile = account && account.toLowerCase() === user.walletAddress.toLowerCase();

  const copyAddress = () => {
    navigator.clipboard.writeText(user.walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: user.walletAddress,
          displayName,
          username,
          bio,
        }),
      });

      if (res.ok) {
        if (isWeb3Connected && typeof registerProfileOnChain === 'function') {
          try {
            await registerProfileOnChain(username, `ipfs://profile_${user.walletAddress.slice(2, 10)}`);
          } catch (contractErr) {
            console.warn("On-chain profile registration skipped or failed:", contractErr);
          }
        }
        await refreshProfile();
        if (onProfileUpdated) onProfileUpdated();
        setIsEditOpen(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const profileName = user.profile?.displayName || `Creator ${user.walletAddress.slice(0, 6)}`;
  const profileUsername = user.profile?.username || `creator_${user.walletAddress.slice(2, 8)}`;
  const web3Id = user.profile?.web3ProfileId || `web3_id_${user.walletAddress.slice(2, 10)}`;

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-xl overflow-hidden mb-6">
      {/* Banner */}
      <div className="h-36 sm:h-48 w-full bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-700 relative">
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Profile Details Header Bar */}
      <div className="px-6 pb-6 relative">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-4">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-slate-900 border-4 border-white dark:border-[#131b2e] shadow-2xl p-1 bg-gradient-to-tr from-cyan-400 to-purple-600">
              <div className="w-full h-full rounded-2xl bg-slate-900 flex items-center justify-center text-white font-extrabold text-2xl sm:text-4xl">
                {user.walletAddress.slice(2, 4).toUpperCase()}
              </div>
            </div>
            <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-cyan-400 border-2 border-slate-900 flex items-center justify-center" title="Web3 Verified Creator">
              <ShieldCheck className="w-4 h-4 text-slate-950" />
            </div>
          </div>

          {/* Action Triggers */}
          <div className="flex items-center gap-2">
            <button
              onClick={copyAddress}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-semibold rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500 transition-colors"
            >
              <Wallet className="w-3.5 h-3.5 text-cyan-400" />
              <span>{`${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`}</span>
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {isOwnProfile && (
              <button
                onClick={() => setIsEditOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-md hover:opacity-90 transition-opacity"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>
        </div>

        {/* Identity Details */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              {profileName}
            </h1>
            <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
              ID: {web3Id}
            </span>
          </div>

          <p className="text-xs font-mono text-cyan-500 dark:text-cyan-400 font-semibold">
            @{profileUsername}
          </p>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
            {user.profile?.bio || "Decentralized Web3 creator building on BlockSocial proof of creation network."}
          </p>
        </div>

        {/* Stats Row */}
        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-4 gap-2 text-center">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <p className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white">{stats.postsCount}</p>
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Posts</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <p className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white">{stats.followersCount}</p>
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Followers</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <p className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white">{stats.followingCount}</p>
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Following</p>
          </div>
          <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20">
            <p className="text-base sm:text-xl font-extrabold text-purple-400">{stats.nftsCount}</p>
            <p className="text-[10px] uppercase font-bold text-purple-400 mt-0.5">NFT Assets</p>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
            <button
              onClick={() => setIsEditOpen(false)}
              className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Edit Web3 Profile</h3>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Username (@handle)</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 font-bold rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-md"
                >
                  {isSaving ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
