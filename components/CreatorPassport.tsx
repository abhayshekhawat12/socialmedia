'use client';

import React from 'react';
import { UserProfile } from '../lib/types';
import { ShieldCheck, Award, Coins, Dna, Users, Sparkles } from 'lucide-react';

interface CreatorPassportProps {
  profile: UserProfile;
}

export const CreatorPassport: React.FC<CreatorPassportProps> = ({ profile }) => {
  return (
    <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-card space-y-5 text-slate-800 dark:text-slate-100">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-500">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Web3 Social Passport</h3>
            <p className="text-[10px] text-slate-400">On-Chain Identity & Verifications</p>
          </div>
        </div>

        <div className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 text-xs font-black flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" /> Verified Creator
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
            <Dna className="w-3.5 h-3.5 text-cyan-500" /> Originals
          </div>
          <div className="text-base font-black text-slate-900 dark:text-white">{profile.postsCount || 6}</div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-purple-500" /> Followers
          </div>
          <div className="text-base font-black text-slate-900 dark:text-white">{profile.followersCount || 1680}</div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
            <Coins className="w-3.5 h-3.5 text-amber-500" /> Total Tips
          </div>
          <div className="text-base font-black text-slate-900 dark:text-white font-mono">{profile.totalTipsReceived || '0.05'} ETH</div>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-emerald-500" /> Score
          </div>
          <div className="text-base font-black text-slate-900 dark:text-white font-mono">8,450</div>
        </div>
      </div>

    </div>
  );
};
