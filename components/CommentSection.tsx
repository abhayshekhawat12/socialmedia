"use client";

import React, { useState } from "react";
import { MessageSquare, Send, User } from "lucide-react";
import { useWeb3 } from "../lib/web3Context";

interface Comment {
  id: string;
  authorAddress: string;
  content: string;
  createdAt: string;
  authorProfile?: {
    username?: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

interface CommentSectionProps {
  postId: string;
  comments: Comment[];
  onCommentAdded?: (newComment: Comment) => void;
}

export function CommentSection({ postId, comments: initialComments, onCommentAdded }: CommentSectionProps) {
  const { account, connectWallet } = useWeb3();
  const [comments, setComments] = useState<Comment[]>(initialComments || []);
  const [newCommentText, setNewCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    if (!account) {
      await connectWallet();
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorAddress: account,
          content: newCommentText.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.comment) {
          setComments((prev) => [...prev, data.comment]);
          if (onCommentAdded) onCommentAdded(data.comment);
          setNewCommentText("");
        }
      }
    } catch (error) {
      console.error("Failed to post comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
        <MessageSquare className="w-4 h-4 text-cyan-500" />
        <span>Comments ({comments.length})</span>
      </div>

      {/* Comment Input */}
      <form onSubmit={handlePostComment} className="flex gap-2">
        <input
          type="text"
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          placeholder={account ? "Add a Web3 comment..." : "Connect wallet to comment..."}
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 text-xs rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors"
        />
        <button
          type="submit"
          disabled={isSubmitting || !newCommentText.trim()}
          className="px-4 py-2 text-xs font-bold rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center gap-1 shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Post</span>
        </button>
      </form>

      {/* Comments List */}
      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
        {comments.map((comment) => (
          <div key={comment.id} className="flex items-start gap-2.5 text-xs">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-400 to-purple-500 flex items-center justify-center text-white font-bold text-[10px] shrink-0 mt-0.5">
              {comment.authorAddress.slice(2, 4).toUpperCase()}
            </div>
            <div className="flex-1 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {comment.authorProfile?.displayName || `@${comment.authorAddress.slice(0, 6)}`}
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed break-words">
                {comment.content}
              </p>
            </div>
          </div>
        ))}

        {comments.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-2 italic">
            No comments yet. Be the first to verify and comment!
          </p>
        )}
      </div>
    </div>
  );
}
