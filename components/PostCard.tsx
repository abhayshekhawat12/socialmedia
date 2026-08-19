'use client';

import React, { useState, memo, useCallback } from 'react';
import Link from 'next/link';
import { 
  Heart, 
  MessageSquare, 
  Share2, 
  Bookmark, 
  MoreHorizontal, 
  Check, 
  MapPin, 
  Send, 
  Loader2,
  Trash2,
  AlertTriangle,
  X
} from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { audioHaptics } from '../lib/audioHaptics';

export interface PostCardProps {
  post: {
    id: string;
    authorAddress: string;
    caption: string;
    mediaUrl: string;
    mediaCid?: string;
    mediaType?: string;
    location?: string;
    likeCount?: number;
    commentCount?: number;
    shareCount?: number;
    createdAt: string;
    likes?: Array<{ userAddress: string }>;
    savedPosts?: Array<{ userAddress: string }>;
    comments?: Array<{
      id: string;
      authorAddress: string;
      content: string;
      createdAt: string;
      authorProfile?: {
        username?: string;
        displayName?: string;
        avatarUrl?: string;
      };
    }>;
    authorProfile?: {
      username?: string;
      displayName?: string;
      avatarUrl?: string;
    };
  };
  onPostDeleted?: (postId: string) => void;
}

function PostCardComponent({ post, onPostDeleted }: PostCardProps) {
  const { account } = useAuth();
  const [liked, setLiked] = useState<boolean>(() => {
    if (!account || !post.likes) return false;
    return post.likes.some((l) => l.userAddress.toLowerCase() === account.toLowerCase());
  });
  const [likeCount, setLikeCount] = useState<number>(post.likeCount || 0);
  
  const [saved, setSaved] = useState<boolean>(() => {
    if (!account || !post.savedPosts) return false;
    return post.savedPosts.some((sp) => sp.userAddress.toLowerCase() === account.toLowerCase());
  });

  const [copiedShare, setCopiedShare] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  
  // Options & Delete state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  // Comments UI state
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentsList, setCommentsList] = useState(post.comments || []);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const isOwnPost = account && account.toLowerCase() === post.authorAddress.toLowerCase();
  const authorDisplayName = post.authorProfile?.displayName || `User ${post.authorAddress.slice(0, 6)}`;
  const authorUsername = post.authorProfile?.username || `user_${post.authorAddress.slice(0, 8)}`;
  const avatarUrl = post.authorProfile?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${post.authorAddress}`;
  const locationText = post.location || '';

  if (isDeleted) return null;

  // Format relative timestamp
  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };

  const handleLike = async () => {
    if (!account) {
      window.location.href = "/login";
      return;
    }

    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));

    if (nextLiked) {
      audioHaptics.playLike();
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 800);
    } else {
      audioHaptics.playTap();
    }

    try {
      const res = await fetch(`/api/posts/${post.id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAddress: account }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.likeCount !== undefined) {
          setLikeCount(data.likeCount);
        }
      }
    } catch (e) {
      console.warn("Like sync warning:", e);
    }
  };

  const handleDoubleTap = () => {
    if (!liked) {
      handleLike();
    } else {
      audioHaptics.playLike();
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 800);
    }
  };

  const handleSave = async () => {
    if (!account) {
      window.location.href = "/login";
      return;
    }

    audioHaptics.playTap();
    const nextSaved = !saved;
    setSaved(nextSaved);

    try {
      await fetch("/api/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAddress: account,
          postId: post.id,
        }),
      });
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  const handleShare = () => {
    audioHaptics.playTap();
    const url = typeof window !== 'undefined' ? `${window.location.origin}/post/${post.id}` : '';
    navigator.clipboard.writeText(url);
    setCopiedShare(true);
    setIsMenuOpen(false);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const handleDeletePost = async () => {
    if (!account || !isOwnPost) return;
    try {
      setIsDeleting(true);
      audioHaptics.playTap();

      const res = await fetch(`/api/posts/${post.id}?userAddress=${account}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setIsDeleted(true);
        if (onPostDeleted) onPostDeleted(post.id);
      }
    } catch (err) {
      console.error("Delete post error:", err);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmittingComment) return;

    if (!account) {
      window.location.href = "/login";
      return;
    }

    try {
      setIsSubmittingComment(true);
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorAddress: account,
          content: newComment.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCommentsList((prev) => [data.comment, ...prev]);
        setCommentCount(data.commentCount || commentsList.length + 1);
        setNewComment("");
      }
    } catch (err) {
      console.error("Comment submit error:", err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!account) return;
    try {
      const res = await fetch(`/api/posts/${post.id}/comments/${commentId}?userAddress=${account}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCommentsList((prev) => prev.filter((c) => c.id !== commentId));
        setCommentCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Delete comment error:", err);
    }
  };

  return (
    <article className="glass-card rounded-[32px] overflow-hidden p-3.5 sm:p-4 mb-4 relative transition-all duration-300 hover:shadow-hover border border-white/60 dark:border-white/10 group">
      <div className="flex flex-col gap-3">
        
        {/* Header: Avatar, Name, Location & Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link 
              href={`/profile/${post.authorAddress}`}
              onClick={() => audioHaptics.playTap()}
              className="relative group/avatar cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#00B7FF] via-[#7EDBE8] to-[#F45AA8] p-0.5 shadow-sm group-hover/avatar:scale-105 transition-transform">
                <img
                  src={avatarUrl}
                  alt={authorDisplayName}
                  className="w-full h-full rounded-full object-cover bg-white dark:bg-slate-900"
                />
              </div>
            </Link>
            
            <div className="min-w-0">
              <Link 
                href={`/profile/${post.authorAddress}`}
                onClick={() => audioHaptics.playTap()}
                className="flex items-center gap-1.5 cursor-pointer"
              >
                <h3 className="font-extrabold text-xs text-[#101820] dark:text-white truncate hover:underline">
                  {authorDisplayName}
                </h3>
              </Link>
              
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                <span>@{authorUsername}</span>
                {locationText && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-0.5 truncate max-w-[120px]">
                      <MapPin className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                      {locationText}
                    </span>
                  </>
                )}
                <span>•</span>
                <span>{formatTime(post.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* More Menu Dropdown Trigger */}
          <div className="relative">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 rounded-full glass-pill text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              title="Post options"
            >
              <MoreHorizontal className="w-4.5 h-4.5" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-8 z-30 w-44 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-xl p-1.5 space-y-1 animate-in zoom-in-95 text-xs font-bold">
                <button
                  onClick={handleShare}
                  className="w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{copiedShare ? "Link Copied!" : "Share Link"}</span>
                </button>

                {isOwnPost && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setShowDeleteModal(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Post</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Media Container with Double Tap to Like */}
        <div 
          className="relative rounded-2xl overflow-hidden bg-slate-950/20 aspect-square sm:aspect-[4/3] flex items-center justify-center cursor-pointer select-none"
          onDoubleClick={handleDoubleTap}
        >
          {post.mediaType === "video" ? (
            <video
              src={post.mediaUrl}
              controls
              playsInline
              preload="metadata"
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={post.mediaUrl}
              alt={post.caption || "Post media"}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.01]"
              loading="lazy"
              decoding="async"
            />
          )}

          {/* Double-tap heart animation */}
          {showHeartBurst && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="animate-heart-burst">
                <Heart className="w-24 h-24 text-[#F45AA8] fill-current drop-shadow-2xl" />
              </div>
            </div>
          )}
        </div>

        {/* Action Bar (Like, Comment, Share, Save) */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            
            {/* Like */}
            <button 
              onClick={handleLike}
              className="flex items-center gap-1.5 transition-all cursor-pointer btn-tactile group/like"
            >
              <div className={`p-2 rounded-full glass-pill transition-all ${
                liked 
                  ? 'bg-rose-500/15 text-[#F45AA8] scale-105 border-rose-500/30' 
                  : 'hover:text-[#F45AA8]'
              }`}>
                <Heart className={`w-4.5 h-4.5 transition-transform ${liked ? 'fill-[#F45AA8] text-[#F45AA8] scale-110' : 'stroke-[2.2]'}`} />
              </div>
              <span className={`text-xs font-black ${liked ? 'text-[#F45AA8]' : 'text-slate-600 dark:text-slate-300'}`}>
                {likeCount}
              </span>
            </button>

            {/* Comment Toggle */}
            <button 
              onClick={() => {
                audioHaptics.playTap();
                setIsCommentsOpen(!isCommentsOpen);
              }}
              className="flex items-center gap-1.5 transition-all cursor-pointer btn-tactile hover:text-[#00B7FF]"
            >
              <div className="p-2 rounded-full glass-pill">
                <MessageSquare className="w-4.5 h-4.5 stroke-[2.2]" />
              </div>
              <span className="text-xs font-black text-slate-600 dark:text-slate-300">
                {commentCount}
              </span>
            </button>

            {/* Share */}
            <button 
              onClick={handleShare} 
              className="hover:text-[#00B7FF] transition-all cursor-pointer btn-tactile"
              title="Copy Link"
            >
              <div className="p-2 rounded-full glass-pill">
                {copiedShare ? <Check className="w-4.5 h-4.5 text-emerald-500" /> : <Share2 className="w-4.5 h-4.5 stroke-[2.2]" />}
              </div>
            </button>

          </div>

          {/* Save / Bookmark */}
          <button
            onClick={handleSave}
            className={`transition-all cursor-pointer btn-tactile ${saved ? 'text-[#00B7FF]' : 'hover:text-[#00B7FF]'}`}
            title={saved ? "Saved" : "Save post"}
          >
            <div className={`p-2 rounded-full glass-pill ${saved ? 'bg-cyan-500/15 text-[#00B7FF] border-cyan-500/30' : ''}`}>
              <Bookmark className={`w-4.5 h-4.5 ${saved ? 'fill-[#00B7FF] text-[#00B7FF]' : 'stroke-[2.2]'}`} />
            </div>
          </button>
        </div>

        {/* Caption Area */}
        <div className="text-xs text-slate-800 dark:text-slate-200 space-y-1">
          {post.caption && (
            <p className="leading-relaxed font-medium">
              <span className="font-black text-[#101820] dark:text-white mr-1.5">@{authorUsername}</span>
              {post.caption}
            </p>
          )}

          {commentCount > 0 && !isCommentsOpen && (
            <button 
              onClick={() => {
                audioHaptics.playTap();
                setIsCommentsOpen(true);
              }}
              className="text-[11px] text-slate-400 font-bold hover:underline pt-0.5 block cursor-pointer"
            >
              View all {commentCount} comments
            </button>
          )}
        </div>

        {/* Expandable Comments Section */}
        {isCommentsOpen && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 space-y-2.5 animate-in fade-in">
            {/* New Comment Input */}
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-[#00B7FF]"
              />
              <button
                type="submit"
                disabled={isSubmittingComment || !newComment.trim()}
                className="p-2 rounded-xl bg-[#00B7FF] text-slate-950 font-bold hover:opacity-90 disabled:opacity-40 cursor-pointer"
              >
                {isSubmittingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </form>

            {/* List of comments */}
            <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar pr-1">
              {commentsList.length === 0 ? (
                <p className="text-[11px] text-slate-400 py-1">No comments yet. Be the first to comment!</p>
              ) : (
                commentsList.map((c) => {
                  const isMyComment = account && c.authorAddress.toLowerCase() === account.toLowerCase();
                  return (
                    <div key={c.id} className="flex items-start justify-between gap-2 text-[11px] leading-snug group/comment">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white mr-1.5">
                          {c.authorProfile?.displayName || `User ${c.authorAddress.slice(0, 6)}`}
                        </span>
                        <span className="text-slate-600 dark:text-slate-300">{c.content}</span>
                      </div>
                      {isMyComment && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-0.5 cursor-pointer shrink-0 opacity-0 group-hover/comment:opacity-100"
                          title="Delete comment"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      </div>

      {/* CONFIRM DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in select-none">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            
            <div className="space-y-1">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Delete this post?</h4>
              <p className="text-xs text-slate-400">
                This will permanently remove the post and its comments from feeds and your profile.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeletePost}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white font-extrabold text-xs hover:bg-rose-600 transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Delete</span>}
              </button>
            </div>
          </div>
        </div>
      )}

    </article>
  );
}

export const PostCard = memo(PostCardComponent);
