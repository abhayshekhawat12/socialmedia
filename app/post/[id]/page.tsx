"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { 
  Heart, 
  MessageSquare, 
  Share2, 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  Bookmark, 
  Check, 
  Send, 
  Loader2 
} from "lucide-react";
import { CommentSection } from "../../../components/CommentSection";
import { useAuth } from "../../../lib/authContext";
import { audioHaptics } from "../../../lib/audioHaptics";
import { GlassToast } from "../../../components/ui/GlassToast";

export default function PostDetailsPage() {
  const params = useParams();
  const postId = params.id as string;
  const { account } = useAuth();

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const fetchPostDetails = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/posts/${postId}`);
      if (res.ok) {
        const data = await res.json();
        setPost(data.post);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchPostDetails();
  }, [fetchPostDetails]);

  if (loading || !post) {
    return (
      <div className="p-12 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-[#00B7FF]" />
        <span>Loading post details...</span>
      </div>
    );
  }

  const authorDisplayName = post.authorProfile?.displayName || `User ${post.authorAddress.slice(0, 6)}`;
  const authorUsername = post.authorProfile?.username || `user_${post.authorAddress.slice(0, 8)}`;
  const avatarUrl = post.authorProfile?.avatarUrl;

  const handleShare = () => {
    audioHaptics.playTap();
    navigator.clipboard.writeText(window.location.href);
    triggerToast("🔗 Post link copied to clipboard!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12 select-none animate-fadeIn">
      <GlassToast message={toastMsg || ""} isVisible={!!toastMsg} />

      <Link
        href="/feed"
        onClick={() => audioHaptics.playNav()}
        className="inline-flex items-center gap-1.5 text-xs font-black text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors btn-tactile"
      >
        <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
        <span>Back to Feed</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Media Column */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-[32px] border border-white/80 dark:border-white/10 bg-slate-950 overflow-hidden aspect-square sm:aspect-[4/3] flex items-center justify-center shadow-glass relative">
            {post.mediaType === "video" ? (
              <video src={post.mediaUrl} controls className="w-full h-full object-cover" />
            ) : (
              <img src={post.mediaUrl} alt={post.caption || "Post Media"} className="w-full h-full object-cover" />
            )}
          </div>
        </div>

        {/* Details & Comments Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-[32px] glass-card border border-white/80 dark:border-white/10 shadow-glass space-y-4">
            {/* Author */}
            <div className="flex items-center justify-between">
              <Link href={`/profile/${post.authorAddress}`} className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#00B7FF] to-[#7EDBE8] p-0.5 group-hover:scale-105 transition-transform overflow-hidden shrink-0 shadow-sm">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={authorDisplayName} className="w-full h-full rounded-full object-cover bg-slate-900" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-white font-black text-xs">
                      {authorDisplayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-[#00B7FF] transition-colors flex items-center gap-1">
                    <span>{authorDisplayName}</span>
                    <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 flex items-center justify-center">
                      <Check className="w-2 h-2 stroke-[3]" />
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 font-bold">@{authorUsername}</p>
                </div>
              </Link>

              <button
                onClick={handleShare}
                className="p-2 rounded-full glass-pill text-slate-500 hover:text-slate-900 dark:hover:text-white btn-tactile cursor-pointer"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            {/* Caption */}
            {post.caption && (
              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                {post.caption}
              </p>
            )}

            {/* Metadata bar */}
            <div className="flex items-center gap-4 text-[11px] text-slate-400 border-t border-slate-200/60 dark:border-white/10 pt-3 font-semibold">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(post.createdAt).toLocaleDateString()}
              </span>
              {post.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  {post.location}
                </span>
              )}
            </div>

            {/* Comments Drawer */}
            <CommentSection postId={post.id} comments={post.comments || []} />
          </div>
        </div>
      </div>
    </div>
  );
}
