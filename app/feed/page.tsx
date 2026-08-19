"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StoryBar } from '../../components/StoryBar';
import { FeedTabs } from '../../components/FeedTabs';
import { PostCard } from '../../components/PostCard';
import { GlassLoader } from '../../components/ui/GlassLoader';
import { GlassToast } from '../../components/ui/GlassToast';
import { useAuth } from '../../lib/authContext';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  Music, 
  Volume2, 
  VolumeX, 
  Play, 
  Loader2, 
  Zap, 
  Plus, 
  Sparkles,
  Search,
  Bell
} from 'lucide-react';
import { audioHaptics } from '../../lib/audioHaptics';
import { appCache } from '../../lib/cache';

export default function FeedPage() {
  const router = useRouter();
  const { account, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'posts' | 'stories' | 'reels'>('posts');
  
  // Data States with Instant Cache Rehydration
  const [posts, setPosts] = useState<any[]>(() => {
    return appCache.get<any[]>("feed_posts") || [];
  });
  const [reels, setReels] = useState<any[]>(() => {
    return appCache.get<any[]>("feed_reels") || [];
  });
  const [isLoadingFeed, setIsLoadingFeed] = useState(() => {
    const cachedPosts = appCache.get<any[]>("feed_posts");
    return !cachedPosts || cachedPosts.length === 0;
  });

  // Pagination states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reels Playback States
  const [currentReelIndex, setCurrentReelIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playingReelId, setPlayingReelId] = useState<string | null>(null);
  
  // Interactions
  const [showHeart, setShowHeart] = useState(false);
  const [heartPos, setHeartPos] = useState({ x: 0, y: 0 });
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Video refs for reel swipe
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const fetchFeedData = useCallback(async (pageNum = 1, isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setIsLoadingMore(true);
      } else if (posts.length === 0) {
        setIsLoadingFeed(true);
      }
      
      // 1. Fetch Standard Posts
      const postsRes = await fetch(`/api/posts?page=${pageNum}&limit=10`);
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        const incomingPosts = postsData.posts || [];
        setHasMore(postsData.hasMore ?? incomingPosts.length >= 10);

        if (isLoadMore) {
          setPosts((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newPosts = incomingPosts.filter((p: any) => !existingIds.has(p.id));
            const combined = [...prev, ...newPosts];
            appCache.set("feed_posts", combined, 30);
            return combined;
          });
        } else {
          setPosts(incomingPosts);
          appCache.set("feed_posts", incomingPosts, 30);
        }
      }

      // 2. Fetch Reels (Pulses)
      if (pageNum === 1) {
        const reelsRes = await fetch('/api/pulse?limit=10');
        if (reelsRes.ok) {
          const reelsData = await reelsRes.json();
          setReels(reelsData.pulses || []);
          appCache.set("feed_reels", reelsData.pulses || [], 30);
        }
      }
    } catch (e) {
      console.warn("Failed to load feed data:", e);
    } finally {
      setIsLoadingFeed(false);
      setIsLoadingMore(false);
    }
  }, [posts.length]);

  useEffect(() => {
    fetchFeedData(1, false);

    const handleCreated = () => {
      fetchFeedData(1, false);
    };

    window.addEventListener("pulse_post_created", handleCreated);
    return () => window.removeEventListener("pulse_post_created", handleCreated);
  }, [fetchFeedData]);

  // Infinite Scroll Intersection Observer
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || isLoadingMore || isLoadingFeed || activeTab !== "posts") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          setPage((prevPage) => {
            const nextPage = prevPage + 1;
            fetchFeedData(nextPage, true);
            return nextPage;
          });
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isLoadingFeed, activeTab, fetchFeedData]);

  // Handle snapping scroll index change
  const handleReelsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const index = Math.round(container.scrollTop / container.clientHeight);
    if (index !== currentReelIndex && index >= 0 && index < reels.length) {
      setCurrentReelIndex(index);
    }
  };

  // Manage Autoplay based on current visible index
  useEffect(() => {
    if (reels.length === 0 || activeTab !== "reels") return;

    reels.forEach((r, idx) => {
      const vid = videoRefs.current[r.id];
      if (vid) {
        if (idx === currentReelIndex) {
          vid.play().catch(() => {});
          setPlayingReelId(r.id);
        } else {
          vid.pause();
          vid.currentTime = 0;
        }
      }
    });
  }, [currentReelIndex, reels, activeTab]);

  const handleVideoClick = (reelId: string) => {
    const vid = videoRefs.current[reelId];
    if (vid) {
      if (vid.paused) {
        vid.play().catch(() => {});
        setPlayingReelId(reelId);
      } else {
        vid.pause();
        setPlayingReelId(null);
      }
    }
  };

  const handleDoubleTap = (e: React.MouseEvent<HTMLDivElement>, reel: any) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setHeartPos({ x, y });
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 800);

    audioHaptics.playLike();
    handleReelLike(reel.id);
  };

  const handleReelLike = async (reelId: string) => {
    setReels(prev =>
      prev.map(r => r.id === reelId ? { ...r, likeCount: r.likeCount + 1 } : r)
    );

    try {
      await fetch('/api/pulse', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'like', pulseId: reelId }),
      });
    } catch (e) {
      console.error("Like error:", e);
    }
  };

  const handleReelSave = async (reelId: string) => {
    audioHaptics.playTap();
    setReels(prev =>
      prev.map(r => r.id === reelId ? { ...r, saveCount: r.saveCount + 1 } : r)
    );
    triggerToast("⚡ Video saved to your collection!");

    if (account) {
      try {
        await fetch('/api/pulse', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save',
            pulseId: reelId,
            userAddress: account,
            folder: "Favorites"
          }),
        });
      } catch (e) {
        console.error("Save error:", e);
      }
    }
  };

  const handleReelShare = async (reelId: string) => {
    audioHaptics.playTap();
    setReels(prev =>
      prev.map(r => r.id === reelId ? { ...r, shareCount: r.shareCount + 1 } : r)
    );
    triggerToast("🔗 Link copied to clipboard!");
    navigator.clipboard.writeText(`${window.location.origin}/pulse?id=${reelId}`);

    try {
      await fetch('/api/pulse', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'share', pulseId: reelId }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4 text-left relative select-none">
      
      {/* Toast Notification */}
      <GlassToast message={toastMsg || ""} isVisible={!!toastMsg} />

      {/* TOP SECTION: User Greeting & Header Headline */}
      <div className="px-1 pt-1 pb-2 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link
              href={account ? `/profile/${account}` : "/login"}
              className="w-9 h-9 rounded-full overflow-hidden p-0.5 bg-gradient-to-tr from-[#00B7FF] via-[#7EDBE8] to-[#F45AA8] shadow-sm shrink-0 btn-tactile"
            >
              <img
                src={
                  profile?.avatarUrl ||
                  (account
                    ? `https://api.dicebear.com/7.x/bottts/svg?seed=${account}`
                    : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120")
                }
                alt="Avatar"
                className="w-full h-full object-cover rounded-full bg-white dark:bg-slate-900"
              />
            </Link>
            <div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {getGreeting()},{" "}
                <span className="text-slate-900 dark:text-white font-black">
                  {profile?.displayName || (account ? `User ${account.slice(0, 5)}` : "Creator")}
                </span>{" "}
                ✨
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              href="/explore"
              onClick={() => audioHaptics.playTap()}
              className="p-2 rounded-full glass-pill text-slate-700 dark:text-slate-200 btn-tactile hover:bg-white/80 dark:hover:bg-slate-800"
              title="Search"
            >
              <Search className="w-4 h-4" />
            </Link>

            <Link
              href="/notifications"
              onClick={() => audioHaptics.playTap()}
              className="p-2 rounded-full glass-pill text-slate-700 dark:text-slate-200 btn-tactile hover:bg-white/80 dark:hover:bg-slate-800 relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#F45AA8] rounded-full ring-2 ring-white dark:ring-slate-900" />
            </Link>
          </div>
        </div>

        {/* Large Bold Modern Typography Statement */}
        <div className="pt-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            Every Moment <br className="sm:hidden" />
            <span className="bg-gradient-to-r from-[#00B7FF] via-[#7EDBE8] to-[#9B6CFF] bg-clip-text text-transparent">
              Tells a Story
            </span>
          </h1>
        </div>
      </div>

      {/* Stories Bar Carousel */}
      <StoryBar />

      {/* Feed Tabs: Feed | Reels | Stories */}
      <FeedTabs activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)} />

      {isLoadingFeed && posts.length === 0 ? (
        <div className="py-2 space-y-4">
          <GlassLoader count={2} type="feed" />
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* A. VIEW MODE: STANDARD SOCIAL POSTS */}
          {activeTab === 'posts' && (
            <div className="space-y-4 pt-1">
              {posts.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-center text-slate-400 font-bold text-xs gap-2 glass-card rounded-[32px] p-8">
                  <div className="w-14 h-14 rounded-2xl glass-panel flex items-center justify-center text-[#00B7FF] mb-1">
                    <Sparkles className="w-7 h-7 animate-pulse" />
                  </div>
                  <span className="text-base font-black text-slate-800 dark:text-slate-200">
                    Your feed is fresh & ready
                  </span>
                  <p className="text-xs text-slate-500 max-w-[260px] leading-relaxed">
                    Create your first post or follow creators to start seeing social updates!
                  </p>
                  <button
                    onClick={() => router.push('/create')}
                    className="mt-3 px-6 py-2.5 rounded-full bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 font-black text-xs shadow-md btn-tactile cursor-pointer"
                  >
                    + Create First Post
                  </button>
                </div>
              ) : (
                <>
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}

                  {/* Infinite Scroll Sentinel */}
                  <div ref={sentinelRef} className="py-3 flex justify-center items-center">
                    {isLoadingMore && (
                      <div className="flex items-center gap-2 text-xs text-slate-400 font-bold glass-pill px-4 py-2 rounded-full">
                        <Loader2 className="w-4 h-4 animate-spin text-[#00B7FF]" />
                        <span>Loading more posts...</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* B. VIEW MODE: REELS VERTICAL VIDEO SWIPER */}
          {activeTab === 'reels' && (
            reels.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center text-slate-400 font-bold text-xs gap-2 glass-card rounded-[32px] p-8">
                <div className="w-14 h-14 rounded-2xl glass-panel flex items-center justify-center text-[#9B6CFF] mb-1">
                  <Plus className="w-7 h-7 animate-pulse" />
                </div>
                <span className="text-base font-black text-slate-800 dark:text-slate-200">
                  No Reels Published Yet
                </span>
                <p className="text-xs text-slate-500 max-w-[260px] leading-relaxed">
                  Be the first creator to upload a short vertical video to Pulse!
                </p>
                <button
                  onClick={() => router.push('/pulse')}
                  className="mt-3 px-6 py-2.5 rounded-full bg-gradient-to-r from-[#9B6CFF] to-[#F45AA8] text-white font-black text-xs shadow-md btn-tactile cursor-pointer"
                >
                  + Upload a Reel
                </button>
              </div>
            ) : (
              <div 
                onScroll={handleReelsScroll}
                className="h-[70vh] overflow-y-scroll snap-y snap-mandatory no-scrollbar rounded-[32px] bg-black border border-white/80 dark:border-white/10 shadow-2xl relative"
              >
              {reels.map((reel, idx) => {
                const isCurrent = idx === currentReelIndex;
                const isPlaying = playingReelId === reel.id;

                return (
                  <div 
                    key={reel.id}
                    className="w-full h-full snap-start shrink-0 relative flex items-center justify-center"
                  >
                    {/* Double-Tap Heart Animation */}
                    {showHeart && isCurrent && (
                      <div 
                        style={{ left: heartPos.x - 40, top: heartPos.y - 40 }}
                        className="absolute z-40 pointer-events-none animate-ping text-[#F45AA8]"
                      >
                        <Heart className="w-20 h-20 fill-[#F45AA8]" />
                      </div>
                    )}

                    {/* Mute/Volume Icon Overlay */}
                    <button 
                      onClick={() => {
                        audioHaptics.playTap();
                        setIsMuted(!isMuted);
                      }}
                      className="absolute top-4 right-4 z-30 p-2.5 rounded-full glass-pill text-white btn-tactile cursor-pointer"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-[#7EDBE8]" />}
                    </button>

                    {/* Video Player */}
                    <div 
                      onClick={() => handleVideoClick(reel.id)}
                      onDoubleClick={(e) => handleDoubleTap(e, reel)}
                      className="w-full h-full cursor-pointer relative"
                    >
                      <video
                        ref={(el) => { videoRefs.current[reel.id] = el; }}
                        src={reel.videoUrl}
                        poster={reel.thumbnailUrl}
                        loop
                        muted={isMuted}
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Play Overlay State */}
                    {!isPlaying && isCurrent && (
                      <div className="absolute z-20 pointer-events-none p-4 rounded-full bg-black/60 text-white">
                        <Play className="w-8 h-8 fill-white" />
                      </div>
                    )}

                    {/* BOTTOM CREATOR OVERLAYS */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/40 to-transparent p-5 z-20 flex justify-between items-end text-white select-none">
                      
                      {/* Creator Details (Left) */}
                      <div className="space-y-2 text-left max-w-[70%]">
                        <div className="flex items-center gap-2">
                          <img 
                            src={reel.author.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${reel.authorAddress}`} 
                            alt="Avatar" 
                            className="w-8 h-8 rounded-full object-cover border-2 border-[#7EDBE8]" 
                            onClick={() => router.push(`/profile/${reel.authorAddress}`)}
                          />
                          <div className="text-left">
                            <p 
                              className="text-xs font-black text-white truncate hover:underline cursor-pointer"
                              onClick={() => router.push(`/profile/${reel.authorAddress}`)}
                            >
                              {reel.author.displayName}
                            </p>
                            <p className="text-[10px] text-[#7EDBE8] font-mono">@{reel.author.username}</p>
                          </div>
                          <span className="text-[9px] font-black text-[#7EDBE8] bg-[#7EDBE8]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Verified
                          </span>
                        </div>

                        <p className="text-[11px] font-medium leading-relaxed text-slate-200 line-clamp-2">
                          {reel.caption}
                        </p>

                        <div className="flex items-center gap-1.5 text-[9px] font-black text-[#7EDBE8] glass-pill px-2.5 py-1 rounded-lg w-fit">
                          <Music className="w-3.5 h-3.5" />
                          <span>{reel.audioTitle || "Original Sound"}</span>
                        </div>
                      </div>

                      {/* Interaction Sidebar (Right) */}
                      <div className="flex flex-col items-center gap-3.5 shrink-0 text-white pb-2">
                        {/* Likes */}
                        <div className="flex flex-col items-center gap-1">
                          <button 
                            onClick={() => {
                              audioHaptics.playLike();
                              handleReelLike(reel.id);
                            }}
                            className="p-2.5 rounded-2xl glass-action-btn text-rose-500 cursor-pointer"
                          >
                            <Heart className="w-5 h-5 fill-current" />
                          </button>
                          <span className="text-[10px] font-bold">{reel.likeCount || 0}</span>
                        </div>

                        {/* Comments */}
                        <div className="flex flex-col items-center gap-1">
                          <button 
                            onClick={() => {
                              audioHaptics.playTap();
                              router.push(`/pulse?id=${reel.id}`);
                            }}
                            className="p-2.5 rounded-2xl glass-action-btn cursor-pointer"
                          >
                            <MessageCircle className="w-5 h-5" />
                          </button>
                          <span className="text-[10px] font-bold">{reel.commentCount || 0}</span>
                        </div>

                        {/* Save */}
                        <div className="flex flex-col items-center gap-1">
                          <button 
                            onClick={() => handleReelSave(reel.id)}
                            className="p-2.5 rounded-2xl glass-action-btn cursor-pointer"
                          >
                            <Bookmark className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Share */}
                        <div className="flex flex-col items-center gap-1">
                          <button 
                            onClick={() => handleReelShare(reel.id)}
                            className="p-2.5 rounded-2xl glass-action-btn cursor-pointer"
                          >
                            <Share2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
            )
          )}

        </div>
      )}

    </div>
  );
}
