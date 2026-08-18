'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Heart, MessageSquare, Share2, Bookmark, MoreHorizontal, ShieldCheck, Check, Sparkles, MapPin } from 'lucide-react';
import { OwnershipModal } from './OwnershipModal';
import { useWeb3 } from '../lib/web3Context';

export interface PostCardProps {
  post: {
    id: string;
    authorAddress: string;
    caption: string;
    mediaUrl: string;
    mediaCid: string;
    mediaType?: string;
    location?: string;
    contentHash: string;
    proofTxHash?: string | null;
    likeCount: number;
    commentCount: number;
    shareCount?: number;
    isNft?: boolean;
    nftTokenId?: number | null;
    createdAt: string;
    authorProfile?: {
      username?: string;
      displayName?: string;
      avatarUrl?: string;
    };
  };
}

export function PostCard({ post }: PostCardProps) {
  const { account, connectWallet } = useWeb3();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount || 324);
  const [saved, setSaved] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [isOwnershipModalOpen, setIsOwnershipModalOpen] = useState(false);

  const authorDisplayName = post.authorProfile?.displayName || 'Elena Rostova';
  const authorUsername = post.authorProfile?.username || 'elena_vibe';
  const avatarUrl = post.authorProfile?.avatarUrl || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80';
  const locationText = post.location || 'Santorini, Greece';

  const handleLike = () => {
    if (liked) {
      setLiked(false);
      setLikeCount((prev) => Math.max(0, prev - 1));
    } else {
      setLiked(true);
      setLikeCount((prev) => prev + 1);
    }
  };

  const handleShare = () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(postUrl);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  return (
    <>
      <article className="bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-sm hover:shadow-card transition-all space-y-3.5 text-slate-800 dark:text-slate-100 relative">
        
        {/* Top Header: Avatar, Name, Blue Verification, Subtext, Three Dots */}
        <div className="flex items-center justify-between">
          <Link href={`/profile/${post.authorAddress}`} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-[#00B7FF] to-[#36C4FF] shadow-sm">
              <img
                src={avatarUrl}
                alt={authorDisplayName}
                className="w-full h-full rounded-full object-cover border border-white dark:border-[#131b2e]"
              />
            </div>

            <div>
              <div className="font-extrabold text-sm text-[#1E293B] dark:text-white group-hover:text-[#00B7FF] transition-colors flex items-center gap-1.5">
                <span>{authorDisplayName}</span>
                {/* Aura Blue Verification Checkmark */}
                <div className="w-4 h-4 rounded-full bg-[#00B7FF] text-white flex items-center justify-center shadow-sm">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              </div>

              <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                <span>{locationText}</span>
                <span>•</span>
                <span>3 hours ago</span>
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsOwnershipModalOpen(true)}
              className="px-2 py-0.5 rounded-full bg-[#00B7FF]/10 text-[#00B7FF] text-[10px] font-extrabold flex items-center gap-1 hover:bg-[#00B7FF]/20 transition-colors"
              title="Click to view Web3 Blockchain Ownership details"
            >
              <ShieldCheck className="w-3 h-3" /> Blockchain Verified
            </button>

            <button className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Media Area: Large Landscape Photo with Rounded Corners */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800/80 bg-slate-900 aspect-[4/3] w-full flex items-center justify-center">
          <img
            src={post.mediaUrl || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80'}
            alt="Elena Post Media"
            className="w-full h-full object-cover"
            loading="lazy"
          />

          {post.isNft && (
            <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-[10px] font-extrabold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300" /> NFT #{post.nftTokenId || 104}
            </div>
          )}
        </div>

        {/* Action Bar & Counters: Like (324), Comment (18), Share, Save */}
        <div className="flex items-center justify-between pt-1 text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-4 text-xs font-extrabold">
            
            {/* Like */}
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                liked ? 'text-rose-500' : 'hover:text-rose-500'
              }`}
            >
              <Heart className={`w-5 h-5 ${liked ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span>{likeCount}</span>
            </button>

            {/* Comment */}
            <button className="flex items-center gap-1.5 hover:text-[#00B7FF] transition-colors cursor-pointer">
              <MessageSquare className="w-5 h-5" />
              <span>{post.commentCount || 18}</span>
            </button>

            {/* Share */}
            <button onClick={handleShare} className="hover:text-[#00B7FF] transition-colors cursor-pointer">
              {copiedShare ? <Check className="w-5 h-5 text-emerald-500" /> : <Share2 className="w-5 h-5" />}
            </button>

          </div>

          {/* Save / Bookmark */}
          <button
            onClick={() => setSaved(!saved)}
            className={`transition-colors cursor-pointer ${saved ? 'text-[#00B7FF]' : 'hover:text-[#00B7FF]'}`}
          >
            <Bookmark className={`w-5 h-5 ${saved ? 'fill-[#00B7FF] text-[#00B7FF]' : ''}`} />
          </button>
        </div>

        {/* Caption Area */}
        <div className="text-xs text-slate-800 dark:text-slate-200 space-y-1">
          <p className="leading-relaxed">
            <span className="font-extrabold text-[#1E293B] dark:text-white mr-1.5">{authorUsername}</span>
            {post.caption || 'Soft sunlight filtering through the coastal clouds. Breathing in peace and quiet before the week starts.'}
          </p>

          <button className="text-[11px] text-slate-400 font-bold hover:underline pt-0.5">
            View all 18 comments
          </button>
        </div>

      </article>

      {/* Ownership Details Modal */}
      <OwnershipModal
        isOpen={isOwnershipModalOpen}
        onClose={() => setIsOwnershipModalOpen(false)}
        post={post}
      />
    </>
  );
}
