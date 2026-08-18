"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StoryBar } from '../../components/StoryBar';
import { FeedTabs } from '../../components/FeedTabs';
import { PostCard } from '../../components/PostCard';
import { useWeb3 } from '../../lib/web3Context';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  Music, 
  Eye,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Loader2,
  Sliders,
  Zap,
  Flame,
  Plus
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function FeedPage() {
  const router = useRouter();
  const { account, isWeb3Connected, connectWallet } = useWeb3();
  const [activeTab, setActiveTab] = useState<'posts' | 'stories' | 'reels'>('reels'); // Default to Reels
  
  // Data States
  const [posts, setPosts] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);

  // Reels Playback States
  const [currentReelIndex, setCurrentReelIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playingReelId, setPlayingReelId] = useState<string | null>(null);
  
  // Interactions
  const [showHeart, setShowHeart] = useState(false);
  const [heartPos, setHeartPos] = useState({ x: 0, y: 0 });
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // References
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const fetchFeedData = useCallback(async () => {
    try {
      setIsLoadingFeed(true);
      
      // 1. Fetch Standard Posts
      const postsRes = await fetch('/api/posts');
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setPosts(postsData.posts || []);
      }

      // 2. Fetch Reels (Pulses)
      const reelsRes = await fetch('/api/pulse');
      if (reelsRes.ok) {
        const reelsData = await reelsRes.json();
        setReels(reelsData.pulses || []);
      }
    } catch (e) {
      console.warn("Failed to load feed data:", e);
    } finally {
      setIsLoadingFeed(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedData();
  }, [fetchFeedData]);

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

    handleReelLike(reel.id);
  };

  const handleReelLike = async (reelId: string) => {
    // Optimistic UI update
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
    // Optimistic UI update
    setReels(prev =>
      prev.map(r => r.id === reelId ? { ...r, saveCount: r.saveCount + 1 } : r)
    );
    triggerToast("⚡ Video saved to Web3 library!");

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
    setReels(prev =>
      prev.map(r => r.id === reelId ? { ...r, shareCount: r.shareCount + 1 } : r)
    );
    triggerToast("🔗 Link copied! Ready to share.");
    
    // Copy fake link
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
    <div className="space-y-4 text-left relative">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#00B7FF] text-slate-950 font-black text-xs shadow-xl animate-in fade-in slide-in-from-top-4 flex items-center gap-1">
          <Zap className="w-4 h-4 text-slate-950 fill-current" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Stories Bar always visible at top */}
      <StoryBar />

      {/* Feed Tabs: Social Posts | Stories | Short Videos */}
      <FeedTabs onTabChange={(tab: any) => setActiveTab(tab)} />

      {isLoadingFeed ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 font-bold text-xs gap-2">
          <svg className="animate-spin w-6 h-6 text-[#00B7FF]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Syncing social feed with ledger...</span>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* A. VIEW MODE: STANDARD SOCIAL POSTS */}
          {activeTab === 'posts' && (
            <div className="space-y-4 pt-1">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}

          {/* B. VIEW MODE: TIKTOK / REELS VERTICAL VIDEO SWIPER */}
          {activeTab === 'reels' && reels.length > 0 && (
            <div 
              onScroll={handleReelsScroll}
              className="h-[68vh] overflow-y-scroll snap-y snap-mandatory no-scrollbar rounded-[2rem] bg-black border border-slate-200 dark:border-slate-800 shadow-2xl relative"
            >
              {reels.map((reel, idx) => {
                const isCurrent = idx === currentReelIndex;
                const isPlaying = playingReelId === reel.id;

                return (
                  <div 
                    key={reel.id}
                    className="w-full h-full snap-start shrink-0 relative flex items-center justify-center"
                  >
                    {/* Double-Tap Heart Visual Animation */}
                    {showHeart && isCurrent && (
                      <div 
                        style={{ left: heartPos.x - 40, top: heartPos.y - 40 }}
                        className="absolute z-40 pointer-events-none animate-ping text-rose-500"
                      >
                        <Heart className="w-20 h-20 fill-rose-500" />
                      </div>
                    )}

                    {/* Mute/Volume Icon Overlay */}
                    <button 
                      onClick={() => setIsMuted(!isMuted)}
                      className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-black/55 text-white backdrop-blur-sm"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-[#00B7FF]" />}
                    </button>

                    {/* Video Player Element */}
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
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/30 to-transparent p-5 z-20 flex justify-between items-end text-white select-none">
                      
                      {/* Creator Details (Left) */}
                      <div className="space-y-2 text-left max-w-[70%]">
                        <div className="flex items-center gap-2">
                          <img 
                            src={reel.author.avatarUrl} 
                            alt="Avatar" 
                            className="w-8 h-8 rounded-full object-cover border-2 border-[#00B7FF]" 
                            onClick={() => router.push(`/profile/${reel.authorAddress}`)}
                          />
                          <div className="text-left">
                            <p 
                              className="text-xs font-black text-white truncate hover:underline"
                              onClick={() => router.push(`/profile/${reel.authorAddress}`)}
                            >
                              {reel.author.displayName}
                            </p>
                            <p className="text-[10px] text-cyan-400 font-mono">@{reel.author.username}</p>
                          </div>
                          <span className="text-[9px] font-black text-[#00B7FF] bg-[#00B7FF]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Verified
                          </span>
                        </div>

                        <p className="text-[11px] font-medium leading-relaxed text-slate-200 line-clamp-2">
                          {reel.caption}
                        </p>

                        <div className="flex items-center gap-1.5 text-[9px] font-black text-[#00B7FF] bg-black/45 px-2.5 py-1 rounded-lg backdrop-blur-sm w-fit">
                          <Music className="w-3.5 h-3.5" />
                          <span>{reel.audio?.title || reel.audioTitle || "Original Sound"}</span>
                        </div>
                      </div>

                      {/* Interaction Sidebar (Right) */}
                      <div className="flex flex-col items-center gap-4 shrink-0 text-white pb-2">
                        
                        {/* Likes */}
                        <div className="flex flex-col items-center gap-1">
                          <button 
                            onClick={() => handleReelLike(reel.id)}
                            className="p-2.5 rounded-2xl bg-black/55 text-white backdrop-blur-sm hover:scale-105 transition-transform"
                          >
                            <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                          </button>
                          <span className="text-[10px] font-black">{reel.likeCount}</span>
                        </div>

                        {/* Comments */}
                        <div className="flex flex-col items-center gap-1">
                          <button 
                            onClick={() => router.push("/pulse")}
                            className="p-2.5 rounded-2xl bg-black/55 text-white backdrop-blur-sm hover:scale-105 transition-transform"
                          >
                            <MessageCircle className="w-5 h-5 text-[#00B7FF]" />
                          </button>
                          <span className="text-[10px] font-black">{reel.commentCount}</span>
                        </div>

                        {/* Saves */}
                        <div className="flex flex-col items-center gap-1">
                          <button 
                            onClick={() => handleReelSave(reel.id)}
                            className="p-2.5 rounded-2xl bg-black/55 text-white backdrop-blur-sm hover:scale-105 transition-transform"
                          >
                            <Bookmark className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                          </button>
                          <span className="text-[10px] font-black">{reel.saveCount}</span>
                        </div>

                        {/* Shares */}
                        <div className="flex flex-col items-center gap-1">
                          <button 
                            onClick={() => handleReelShare(reel.id)}
                            className="p-2.5 rounded-2xl bg-black/55 text-white backdrop-blur-sm hover:scale-105 transition-transform"
                          >
                            <Share2 className="w-5 h-5 text-purple-400" />
                          </button>
                          <span className="text-[10px] font-black">{reel.shareCount}</span>
                        </div>

                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          )}

          {/* C. VIEW MODE: STORIES fallback */}
          {activeTab === 'stories' && (
            <div className="py-16 text-center text-xs font-bold text-slate-400 border border-slate-200 dark:border-slate-800 rounded-[2rem] bg-white dark:bg-[#131b2e]">
              <span>Stories from followed creators are accessible in the upper story bar.</span>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
