'use client';

import React, { useState } from 'react';
import { ShieldCheck, Copy, Check, ExternalLink, X, Dna, Lock } from 'lucide-react';

interface OwnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: {
    id: string;
    authorAddress: string;
    contentHash: string;
    proofTxHash?: string | null;
    createdAt: string;
    isNft?: boolean;
    nftTokenId?: number | null;
  };
}

export const OwnershipModal: React.FC<OwnershipModalProps> = ({ isOpen, onClose, post }) => {
  const [copiedHash, setCopiedHash] = useState(false);

  if (!isOpen) return null;

  const shortAuthor = `${post.authorAddress.substring(0, 6)}...${post.authorAddress.substring(post.authorAddress.length - 4)}`;
  const shortHash = post.contentHash
    ? `${post.contentHash.substring(0, 10)}...${post.contentHash.substring(post.contentHash.length - 8)}`
    : '0x1234...5678';
  const shortTx = post.proofTxHash
    ? `${post.proofTxHash.substring(0, 10)}...${post.proofTxHash.substring(post.proofTxHash.length - 8)}`
    : 'Verified On-Chain';

  const copyHash = () => {
    navigator.clipboard.writeText(post.contentHash || post.authorAddress);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-slate-800 dark:text-slate-100 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-[#00B7FF]/10 text-[#00B7FF]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Web3 Content Ownership</h3>
              <p className="text-[10px] text-slate-400">Ethereum Blockchain Proof-of-Creation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ownership Details Grid */}
        <div className="space-y-3 text-xs">
          
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <div className="text-[10px] font-bold text-slate-400">Creator Wallet Address</div>
            <div className="font-mono font-extrabold text-slate-900 dark:text-white flex items-center justify-between">
              <span>{shortAuthor}</span>
              <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-sans font-bold flex items-center gap-1">
                <Check className="w-3 h-3" /> Verified Owner
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <div className="text-[10px] font-bold text-slate-400">SHA-256 Content Hash</div>
            <div className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>{shortHash}</span>
              <button onClick={copyHash} className="p-1 text-slate-400 hover:text-[#00B7FF]">
                {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <div className="text-[10px] font-bold text-slate-400">Transaction Status</div>
            <div className="font-mono text-[11px] font-bold text-[#00B7FF] flex items-center justify-between">
              <span>{shortTx}</span>
              <span className="text-[10px] text-slate-400 font-sans">
                {new Date(post.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-[#00B7FF] text-white font-extrabold text-xs shadow-md shadow-[#00B7FF]/20"
        >
          Close Ownership Details
        </button>

      </div>
    </div>
  );
};
