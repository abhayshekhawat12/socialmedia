'use client';

import React, { useState } from 'react';
import { GitFork, Sparkles, X, ArrowRight, Loader2 } from 'lucide-react';
import { useWeb3 } from '../lib/web3Context';

interface RemixModalProps {
  parentPost?: any;
  isOpen: boolean;
  onClose: () => void;
}

export const RemixModal: React.FC<RemixModalProps> = ({ parentPost, isOpen, onClose }) => {
  const { account, connectWallet } = useWeb3();
  const [remixContent, setRemixContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmitRemix = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) {
      await connectWallet();
      return;
    }

    setSubmitting(true);
    try {
      if (parentPost?.id) {
        await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            authorAddress: account,
            caption: `[Remix of #${parentPost.id}] ${remixContent.trim()}`,
            mediaUrl: parentPost.mediaUrl || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
            mediaCid: parentPost.mediaCid || 'QmDefault',
            mediaType: 'image',
            contentHash: '0x' + Date.now().toString(16).padStart(64, '0'),
          }),
        });
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-800 dark:text-slate-100 relative">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <GitFork className="w-5 h-5 text-purple-600" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Create On-Chain Remix</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmitRemix} className="space-y-4">
          <textarea
            value={remixContent}
            onChange={(e) => setRemixContent(e.target.value)}
            rows={3}
            placeholder="Add your creative twist or commentary to this post..."
            className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs outline-none focus:border-purple-500"
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Publish Remix On-Chain</span>
          </button>
        </form>
      </div>
    </div>
  );
};
