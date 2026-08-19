'use client';

import React from 'react';
import Link from 'next/link';
import { UserProfile } from '../lib/types';
import { resolveIPFSUrl } from '../lib/ipfs';
import { FollowButton } from './FollowButton';
import { User, Users } from 'lucide-react';

export const CreatorCard: React.FC<{ creator: UserProfile }> = ({ creator }) => {
  const avatarUrl = resolveIPFSUrl(creator.profileImage);

  return (
    <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 hover:border-cyan-300 rounded-3xl p-4 flex items-center justify-between gap-3 shadow-sm transition-all">
      <Link href={`/profile/${creator.userAddress}`} className="flex items-center gap-3 group overflow-hidden">
        <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#00B7FF] to-purple-600 p-0.5 shrink-0">
          {creator.profileImage ? (
            <img src={avatarUrl} alt={creator.displayName} className="w-full h-full rounded-full object-cover border border-white" />
          ) : (
            <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-[#00B7FF] font-bold border border-white">
              <User className="w-5 h-5" />
            </div>
          )}
        </div>

        <div className="truncate">
          <div className="font-extrabold text-xs text-slate-900 dark:text-white group-hover:text-[#00B7FF] truncate">
            {creator.displayName}
          </div>
          <div className="text-[11px] text-cyan-500 font-bold truncate">@{creator.username}</div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1 font-medium mt-0.5">
            <Users className="w-3 h-3 text-purple-400" /> {creator.followersCount || 0} followers
          </div>
        </div>
      </Link>

      <FollowButton targetAddress={creator.userAddress} />
    </div>
  );
};
