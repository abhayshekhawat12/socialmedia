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
  MapPin
} from "lucide-react";
import { CommentSection } from "../../../components/CommentSection";
import { useAuth } from "../../../lib/authContext";

export default function PostDetailsPage() {
  const params = useParams();
  const postId = params.id as string;
  const { account } = useAuth();

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    return <div className="p-8 text-center text-xs text-slate-400">Loading post details...</div>;
  }

  const authorDisplayName = post.authorProfile?.displayName || `User ${post.authorAddress.slice(0, 6)}`;
  const authorUsername = post.authorProfile?.username || `user_${post.authorAddress.slice(0, 8)}`;
  const avatarUrl = post.authorProfile?.avatarUrl;

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12">
      <Link
        href="/feed"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Feed</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Media Column */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-950 overflow-hidden aspect-square sm:aspect-[4/3] flex items-center justify-center shadow-lg">
            {post.mediaType === "video" ? (
              <video src={post.mediaUrl} controls className="w-full h-full object-cover" />
            ) : (
              <img src={post.mediaUrl} alt={post.caption || "Post Media"} className="w-full h-full object-cover" />
            )}
          </div>
        </div>

        {/* Details & Comments Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-xl space-y-4">
            {/* Author */}
            <Link href={`/profile/${post.authorAddress}`} className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#00B7FF] to-purple-600 p-0.5 group-hover:scale-105 transition-transform overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={authorDisplayName} className="w-full h-full rounded-full object-cover bg-slate-900" />
                ) : (
                  <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-xs">
                    {authorDisplayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#00B7FF] transition-colors">
                  {authorDisplayName}
                </h4>
                <p className="text-xs text-slate-400 font-medium">@{authorUsername}</p>
              </div>
            </Link>

            {/* Caption */}
            {post.caption && (
              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                {post.caption}
              </p>
            )}

            {/* Metadata bar */}
            <div className="flex items-center gap-4 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-3">
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
