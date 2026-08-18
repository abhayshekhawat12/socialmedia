'use client';

import React from 'react';
import Link from 'next/link';
import { TrendingUp, Hash, ArrowUpRight } from 'lucide-react';

export const TrendingCard: React.FC = () => {
  const hashtags = [
    { tag: 'ContentDNA', posts: '2.4k remixes' },
    { tag: 'Web3Social', posts: '1.4k posts' },
    { tag: 'Sepolia', posts: '890 posts' },
    { tag: 'Solidity', posts: '2.1k posts' },
    { tag: 'Ethereum', posts: '5.8k posts' },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-card space-y-4">
      <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900">
        <TrendingUp className="w-4 h-4 text-blue-600" />
        <span>Trending Web3 Topics</span>
      </div>

      <div className="space-y-2">
        {hashtags.map((item) => (
          <Link
            key={item.tag}
            href={`/explore?q=%23${item.tag}`}
            className="flex items-center justify-between group p-2 rounded-2xl hover:bg-slate-50 transition-colors"
          >
            <div>
              <div className="font-bold text-xs text-slate-800 group-hover:text-blue-600 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-blue-600" />
                {item.tag}
              </div>
              <div className="text-[11px] text-slate-400">{item.posts}</div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
};
