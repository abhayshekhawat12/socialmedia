'use client';

import React, { useState } from 'react';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/authContext';

interface FollowButtonProps {
  targetAddress: string;
  initialFollowing?: boolean;
}

export const FollowButton: React.FC<FollowButtonProps> = ({ targetAddress, initialFollowing = false }) => {
  const { account } = useAuth();
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  if (account && account.toLowerCase() === targetAddress.toLowerCase()) {
    return null;
  }

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!account) {
      window.location.href = "/login";
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/users/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followerAddress: account,
          followingAddress: targetAddress,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setFollowing(data.isFollowing);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleFollowToggle}
      disabled={loading}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-xs transition-all cursor-pointer shadow-md ${
        following
          ? 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400'
          : 'bg-gradient-to-r from-[#00B7FF] to-indigo-600 hover:opacity-90 text-white shadow-cyan-500/20'
      }`}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : following ? (
        <>
          <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Following</span>
        </>
      ) : (
        <>
          <UserPlus className="w-3.5 h-3.5" />
          <span>Follow</span>
        </>
      )}
    </button>
  );
};
