'use client';

import React from 'react';
import Link from 'next/link';
import { UserProfile } from '../lib/types';
import { resolveIPFSUrl } from '../lib/ipfs';
import { FollowButton } from './FollowButton';
import { User, Coins } from 'lucide-react';

export const CreatorCard: React.FC<{ creator: UserProfile }> = ({ creator }) => {
  const avatarUrl = resolveIPFSUrl(creator.profileImage);

  return (
    <div className="bg-white border border-slate-200 hover:border-blue-300 rounded-3xl p-4 flex items-center justify-between gap-3 shadow-sm transition-all">
      <Link href={`/profile/${creator.userAddress}`} className="flex items-center gap-3 group overflow-hidden">
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 p-0.5 shrink-0">
          {creator.profileImage ? (
            <img src={avatarUrl} alt={creator.displayName} className="w-full h-full rounded-full object-cover border border-white" />
          ) : (
            <div className="w-full h-full rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold border border-white">
              <User className="w-6 h-6" />
            </div>
          )}
        </div>

        <div className="truncate">
          <div className="font-extrabold text-sm text-slate-900 group-hover:text-blue-600 truncate">
            {creator.displayName}
          </div>
          <div className="text-xs text-blue-600 font-bold truncate">{creator.username}</div>
          <div className="text-[10px] text-amber-600 flex items-center gap-1 font-mono mt-0.5">
            <Coins className="w-3 h-3" /> {creator.totalTipsReceived} ETH tips
          </div>
        </div>
      </Link>

      <FollowButton targetAddress={creator.userAddress} />
    </div>
  );
};
