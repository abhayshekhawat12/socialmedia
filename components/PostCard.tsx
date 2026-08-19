"use client";

import React, { useState, memo } from "react";
import Link from "next/link";
import { 
  Heart, 
  MessageSquare, 
  Share2, 
  Bookmark, 
  MoreHorizontal, 
  Check, 
  Send, 
  Loader2,
  Trash2,
  MapPin,
  Sparkles
} from "lucide-react";
import { useAuth } from "../lib/authContext";
import { audioHaptics } from "../lib/audioHaptics";
import { GlassModal } from "./ui/GlassModal";
import { resolveMediaUrl, handleImageFallback } from "../lib/mediaHelper";

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
  const locationText = post.location || "";

  if (isDeleted) return null;

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return "";
    }
  };

  const handleToggleLike = async () => {
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
      handleToggleLike();
    } else {
      audioHaptics.playLike();
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 800);
    }
  };

  const handleToggleSave = async () => {
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
    const url = typeof window !== "undefined" ? `${window.location.origin}/post/${post.id}` : "";
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
    <article className="glass-card rounded-[32px] overflow-hidden mb-5 mx-1 sm:mx-0 transition-all duration-300 border border-white/80 dark:border-white/10 shadow-glass select-none">
      {/* 1. Header (Creator Profile Bar) */}
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/profile/${post.authorAddress}`}
            onClick={() => audioHaptics.playTap()}
            className="w-10 h-10 rounded-full overflow-hidden p-[2px] bg-gradient-to-tr from-[#00B7FF] via-[#7EDBE8] to-[#F45AA8] shadow-sm shrink-0 cursor-pointer hover:scale-105 transition-transform"
          >
            <img
              src={avatarUrl}
              alt={authorDisplayName}
              className="w-full h-full object-cover rounded-full bg-white dark:bg-slate-900"
            />
          </Link>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 cursor-pointer">
              <Link
                href={`/profile/${post.authorAddress}`}
                className="text-xs font-black text-slate-900 dark:text-white truncate hover:underline"
              >
                {authorUsername}
              </Link>
              <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 flex items-center justify-center shrink-0">
                <Check className="w-2 h-2 stroke-[3]" />
              </span>
              <span className="text-slate-400 text-[10px] ml-0.5 font-medium">
                • {formatTime(post.createdAt)}
              </span>
            </div>
            {locationText && (
              <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-0.5 font-medium">
                <MapPin className="w-2.5 h-2.5 text-[#00B7FF]" />
                {locationText}
              </span>
            )}
          </div>
        </div>

        {/* More Options Menu */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-full glass-pill transition btn-tactile cursor-pointer"
            title="Options"
          >
            <MoreHorizontal className="w-4.5 h-4.5" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-8 z-30 w-44 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 shadow-2xl p-1.5 space-y-1 animate-in zoom-in-95 text-xs font-bold">
              <button
                onClick={handleShare}
                className="w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 hover:bg-white/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
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

      {/* 2. Visual Media Centerpiece with Glass Action Badges */}
      <div
        className="w-full aspect-square bg-slate-950/20 relative overflow-hidden flex items-center justify-center cursor-pointer select-none rounded-[24px] mx-auto px-1 sm:px-2"
        onDoubleClick={handleDoubleTap}
      >
        <div className="w-full h-full rounded-[22px] overflow-hidden relative">
          {post.mediaType === "video" ? (
            <video
              src={resolveMediaUrl(post.mediaUrl, post.mediaCid)}
              controls
              playsInline
              preload="metadata"
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={resolveMediaUrl(post.mediaUrl, post.mediaCid)}
              alt={post.caption || "Post content"}
              onError={(e) => handleImageFallback(e, "post")}
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.02]"
              loading="lazy"
              decoding="async"
            />
          )}

          {/* Double-tap heart animation */}
          {showHeartBurst && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="animate-heart-pop">
                <Heart className="w-24 h-24 text-[#F45AA8] fill-current drop-shadow-2xl" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Floating Interaction Buttons */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          {/* Like */}
          <button
            onClick={handleToggleLike}
            className={`p-2 rounded-full glass-action-btn transition-all cursor-pointer ${
              liked ? "text-[#F45AA8] bg-rose-500/15" : "text-slate-600 dark:text-slate-300 hover:text-[#F45AA8]"
            }`}
            title="Like post"
          >
            <Heart
              className={`w-5 h-5 ${liked ? "fill-current" : "stroke-[2.2]"}`}
            />
          </button>

          {/* Comment */}
          <button
            onClick={() => {
              audioHaptics.playTap();
              setIsCommentsOpen(!isCommentsOpen);
            }}
            className="p-2 rounded-full glass-action-btn text-slate-600 dark:text-slate-300 hover:text-[#00B7FF] transition cursor-pointer"
            title="Comment"
          >
            <MessageSquare className="w-5 h-5 stroke-[2.2]" />
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="p-2 rounded-full glass-action-btn text-slate-600 dark:text-slate-300 hover:text-[#00B7FF] transition cursor-pointer"
            title="Share"
          >
            <Send className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>

        {/* Save */}
        <button
          onClick={handleToggleSave}
          className={`p-2 rounded-full glass-action-btn transition-all cursor-pointer ${
            saved ? "text-[#00B7FF] bg-cyan-500/15" : "text-slate-600 dark:text-slate-300 hover:text-[#00B7FF]"
          }`}
          title="Save post"
        >
          <Bookmark
            className={`w-5 h-5 ${saved ? "fill-current" : "stroke-[2.2]"}`}
          />
        </button>
      </div>

      {/* 4. Post Content Details */}
      <div className="px-4 pb-4 text-left">
        {likeCount > 0 && (
          <div className="text-xs font-black text-slate-900 dark:text-white mb-1">
            {likeCount.toLocaleString()} {likeCount === 1 ? "like" : "likes"}
          </div>
        )}

        {post.caption && (
          <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
            <Link
              href={`/profile/${post.authorAddress}`}
              className="font-black text-slate-900 dark:text-white mr-1.5 hover:underline"
            >
              @{authorUsername}
            </Link>
            {post.caption}
          </div>
        )}

        {/* Hashtag Pills */}
        {post.caption && post.caption.includes("#") && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {post.caption.match(/#[a-zA-Z0-9_]+/g)?.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-0.5 glass-pill rounded-full text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-[#00B7FF] transition cursor-pointer"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Comments Toggle */}
        <button
          onClick={() => setIsCommentsOpen(!isCommentsOpen)}
          className="mt-2 text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
        >
          {commentCount > 0
            ? `View all ${commentCount} comments`
            : "Add a comment..."}
        </button>

        {/* Expandable Comments Section */}
        {isCommentsOpen && (
          <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-white/10 space-y-2.5 animate-in fade-in">
            {/* New Comment Input */}
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl glass-input text-xs text-slate-900 dark:text-white outline-none focus:border-[#00B7FF]"
              />
              <button
                type="submit"
                disabled={isSubmittingComment || !newComment.trim()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 font-black text-xs hover:opacity-90 disabled:opacity-40 transition cursor-pointer"
              >
                {isSubmittingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </form>

            {/* List of comments */}
            <div className="space-y-2 max-h-48 overflow-y-auto hide-scrollbar pr-1">
              {commentsList.length === 0 ? (
                <p className="text-xs text-slate-400 py-1">No comments yet. Be the first to comment!</p>
              ) : (
                commentsList.map((c) => {
                  const isMyComment = account && c.authorAddress.toLowerCase() === account.toLowerCase();
                  return (
                    <div key={c.id} className="flex items-start justify-between gap-2 text-xs leading-snug group/comment">
                      <div>
                        <span className="font-black text-slate-900 dark:text-white mr-1.5">
                          {c.authorProfile?.displayName || `User ${c.authorAddress.slice(0, 6)}`}
                        </span>
                        <span className="text-slate-600 dark:text-slate-300 font-medium">{c.content}</span>
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
      <GlassModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        maxWidth="sm"
        showClose={false}
      >
        <div className="text-center space-y-4 py-2">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <Trash2 className="w-6 h-6" />
          </div>
          
          <div className="space-y-1">
            <h4 className="font-black text-sm text-slate-900 dark:text-white">Delete this post?</h4>
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
              className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white font-black text-xs hover:bg-rose-600 transition cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5 shadow-sm"
            >
              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Delete</span>}
            </button>
          </div>
        </div>
      </GlassModal>
    </article>
  );
}

export const PostCard = memo(PostCardComponent);
