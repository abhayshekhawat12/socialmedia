"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MessageSquare, Send, Trash2, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "../lib/authContext";
import { audioHaptics } from "../lib/audioHaptics";
import { appCache } from "../lib/cache";

export interface Comment {
  id: string;
  authorAddress: string;
  content: string;
  createdAt: string;
  authorProfile?: {
    username?: string;
    displayName?: string;
    avatarUrl?: string;
  };
  isOptimistic?: boolean;
}

interface CommentSectionProps {
  postId: string;
  comments?: Comment[];
  onCommentAdded?: (newComment: Comment) => void;
  onCommentDeleted?: (commentId: string) => void;
}

export function CommentSection({
  postId,
  comments: initialComments,
  onCommentAdded,
  onCommentDeleted,
}: CommentSectionProps) {
  const { account, token, profile, user } = useAuth();
  const [comments, setComments] = useState<Comment[]>(initialComments || []);
  const [newCommentText, setNewCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load from cache initially for 0ms render
  useEffect(() => {
    const cached = appCache.get<Comment[]>(`comments_${postId}`, true);
    if (cached && cached.length > 0) {
      setComments(cached);
    } else if (initialComments && initialComments.length > 0) {
      setComments(initialComments);
    }
  }, [postId, initialComments]);

  // Fetch comments from backend
  const fetchComments = useCallback(async () => {
    if (!postId) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/posts/${postId}/comments`);
      if (res.ok) {
        const data = await res.json();
        if (data.comments) {
          setComments(data.comments);
          appCache.set(`comments_${postId}`, data.comments, 60);
        }
      }
    } catch (err) {
      console.warn("Fetch comments warning:", err);
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const commentContent = newCommentText.trim();
    if (!commentContent || isSubmitting) return;

    if (!account) {
      window.location.href = "/login";
      return;
    }

    setErrorMsg(null);
    audioHaptics.playSend();

    // 1. Create optimistic comment
    const tempId = `temp_comment_${Date.now()}`;
    const optimisticComment: Comment = {
      id: tempId,
      authorAddress: account,
      content: commentContent,
      createdAt: new Date().toISOString(),
      authorProfile: {
        username: profile?.username || user?.email?.split("@")[0] || "you",
        displayName: profile?.displayName || "You",
        avatarUrl: profile?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${account}`,
      },
      isOptimistic: true,
    };

    // Instant optimistic UI update
    setComments((prev) => [optimisticComment, ...prev]);
    setNewCommentText("");
    if (onCommentAdded) onCommentAdded(optimisticComment);

    // 2. Background Sync
    try {
      setIsSubmitting(true);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          authorAddress: account,
          content: commentContent,
        }),
      });

      const data = await res.json();
      if (res.ok && data.comment) {
        // Replace optimistic comment with confirmed database comment
        setComments((prev) => {
          const updated = prev.map((c) => (c.id === tempId ? data.comment : c));
          appCache.set(`comments_${postId}`, updated, 60);
          return updated;
        });
      } else {
        // Revert optimistic comment if backend failed
        setComments((prev) => prev.filter((c) => c.id !== tempId));
        setErrorMsg(data.error || "Failed to post comment. Please try again.");
      }
    } catch (err: any) {
      console.error("Comment submit error:", err);
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      setErrorMsg("Network error. Could not save comment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!account) return;
    audioHaptics.playTap();

    // Optimistically remove
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    if (onCommentDeleted) onCommentDeleted(commentId);

    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      await fetch(`/api/posts/${postId}/comments/${commentId}?userAddress=${encodeURIComponent(account)}`, {
        method: "DELETE",
        headers,
      });
    } catch (err) {
      console.error("Delete comment error:", err);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3.5 select-none">
      <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-[#00B7FF]" />
          <span>Comments ({comments.length})</span>
        </div>
        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00B7FF]" />}
      </div>

      {errorMsg && (
        <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Comment Input */}
      <form onSubmit={handlePostComment} className="flex gap-2">
        <input
          type="text"
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          placeholder={account ? "Write a comment..." : "Sign in to join the conversation..."}
          disabled={isSubmitting}
          className="flex-1 px-4 py-2.5 text-xs rounded-full bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#00B7FF] transition-all"
        />
        <button
          type="submit"
          disabled={isSubmitting || !newCommentText.trim()}
          className="px-4 py-2.5 text-xs font-black rounded-full bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center gap-1 shrink-0 shadow-sm cursor-pointer"
        >
          {isSubmitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span>Post</span>
        </button>
      </form>

      {/* Comments List */}
      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 hide-scrollbar">
        {comments.map((comment) => {
          const authorAvatar =
            comment.authorProfile?.avatarUrl ||
            `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(comment.authorAddress || comment.id)}`;
          const authorDisplayName =
            comment.authorProfile?.displayName ||
            (comment.authorAddress?.startsWith("0x") ? `User ${comment.authorAddress.slice(0, 6)}` : "Pulse Member");
          const authorHandle = comment.authorProfile?.username ? `@${comment.authorProfile.username}` : "";
          const isMyComment =
            account &&
            (comment.authorAddress?.toLowerCase() === account.toLowerCase() ||
              (user?.id && comment.authorAddress?.toLowerCase() === user.id.toLowerCase()));

          return (
            <div
              key={comment.id}
              className={`flex items-start gap-2.5 text-xs group transition-all ${
                comment.isOptimistic ? "opacity-75" : ""
              }`}
            >
              <img
                src={authorAvatar}
                alt={authorDisplayName}
                className="w-7 h-7 rounded-full object-cover bg-slate-900 shrink-0 mt-0.5 border border-white/20"
              />
              <div className="flex-1 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-black text-slate-900 dark:text-slate-100 truncate">
                      {authorDisplayName}
                    </span>
                    {authorHandle && (
                      <span className="text-[10px] text-slate-400 font-mono truncate">
                        {authorHandle}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[9px] text-slate-400 font-mono">
                      {new Date(comment.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                    {isMyComment && !comment.isOptimistic && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-slate-400 hover:text-rose-500 transition-colors p-0.5"
                        title="Delete comment"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed break-words font-medium">
                  {comment.content}
                </p>
              </div>
            </div>
          );
        })}

        {comments.length === 0 && !isLoading && (
          <p className="text-xs text-slate-400 text-center py-3 italic font-medium">
            No comments yet. Be the first to spark a conversation!
          </p>
        )}
      </div>
    </div>
  );
}
