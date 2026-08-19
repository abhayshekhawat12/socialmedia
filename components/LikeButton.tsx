'use client';

import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '../lib/authContext';

interface LikeButtonProps {
  postId: number | string;
  initialLikeCount?: number;
  initialLiked?: boolean;
}

export const LikeButton: React.FC<LikeButtonProps> = ({
  postId,
  initialLikeCount = 0,
  initialLiked = false,
}) => {
  const { account } = useAuth();
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!account) {
      window.location.href = "/login";
      return;
    }

    const prevLiked = isLiked;
    const prevCount = likeCount;
    setIsLiked(!prevLiked);
    setLikeCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);

    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: account }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsLiked(data.liked);
        setLikeCount(data.likeCount);
      } else {
        setIsLiked(prevLiked);
        setLikeCount(prevCount);
      }
    } catch (err) {
      setIsLiked(prevLiked);
      setLikeCount(prevCount);
    }
  };

  return (
    <button
      onClick={handleToggleLike}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold border transition-all cursor-pointer ${
        isLiked
          ? 'bg-rose-50 text-rose-600 border-rose-200'
          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-500'
      }`}
    >
      <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-600' : ''}`} />
      <span>{likeCount}</span>
    </button>
  );
};
