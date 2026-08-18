'use client';

import React from 'react';
import { Dna, ExternalLink, X, ShieldCheck } from 'lucide-react';

interface ContentFamilyTreeModalProps {
  postId?: any;
  dnaId?: any;
  isOpen: boolean;
  onClose: () => void;
}

export const ContentFamilyTreeModal: React.FC<ContentFamilyTreeModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-800 dark:text-slate-100 relative">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Dna className="w-5 h-5 text-purple-600" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Content Lineage & Genealogy</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-2">
          <div className="font-bold flex items-center gap-1.5 text-purple-600">
            <ShieldCheck className="w-4 h-4" /> Cryptographic Content DNA
          </div>
          <p className="text-slate-600 dark:text-slate-300">
            This creation is registered on Ethereum with immutable parent-child remix lineage.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 font-bold text-xs"
        >
          Close
        </button>
      </div>
    </div>
  );
};
