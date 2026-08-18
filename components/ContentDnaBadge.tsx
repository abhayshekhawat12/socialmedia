'use client';

import React, { useState } from 'react';
import { ContentDNA } from '../lib/types';
import { Dna, ExternalLink, GitFork, ShieldCheck, UserCheck, Percent } from 'lucide-react';

interface ContentDnaBadgeProps {
  dna?: ContentDNA;
  postId: number;
}

export const ContentDnaBadge: React.FC<ContentDnaBadgeProps> = ({ dna, postId }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!dna) return null;

  const isRemix = dna.parentDnaId > 0;
  const formattedDate = new Date(dna.timestamp).toLocaleString();
  const shortCreator = `${dna.originalCreator.substring(0, 6)}...${dna.originalCreator.substring(dna.originalCreator.length - 4)}`;
  const royaltyPctFormatted = (dna.royaltyPercentage / 100).toFixed(1);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-all cursor-pointer shadow-sm"
        title="View On-Chain Content DNA & Lineage"
      >
        <Dna className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
        <span>🧬 Content DNA #{dna.dnaId}</span>
        {isRemix && (
          <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold ml-0.5">
            Remix
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-800 relative">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600">
                  <Dna className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">On-Chain Content DNA</h3>
                  <p className="text-xs text-slate-500">Immutable registration & creator lineage</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-700 text-lg font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                  <Dna className="w-4 h-4 text-blue-600" /> Content DNA ID:
                </span>
                <span className="font-mono text-blue-700 font-bold">#{dna.dnaId}</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-blue-600" /> Original Creator:
                </span>
                <span className="font-mono text-slate-900 font-bold">{shortCreator}</span>
              </div>

              {isRemix ? (
                <div className="bg-purple-50 p-3 rounded-2xl border border-purple-200 flex justify-between items-center text-purple-900">
                  <span className="font-semibold flex items-center gap-1.5">
                    <GitFork className="w-4 h-4 text-purple-600" /> Parent Content DNA:
                  </span>
                  <span className="font-mono font-bold text-purple-700">#{dna.parentDnaId}</span>
                </div>
              ) : (
                <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-200 flex justify-between items-center text-emerald-900">
                  <span className="font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Content Type:
                  </span>
                  <span className="font-bold text-emerald-700">Original Creation (Parent DNA)</span>
                </div>
              )}

              <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 flex justify-between items-center text-amber-900">
                <span className="font-semibold flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-amber-600" /> Creator Royalty Rate:
                </span>
                <span className="font-bold text-amber-700">{royaltyPctFormatted}%</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex justify-between items-center">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                  <GitFork className="w-4 h-4 text-blue-600" /> Total Remix Descendants:
                </span>
                <span className="font-mono text-slate-900 font-bold">{dna.remixCount} remixes</span>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-full py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};
