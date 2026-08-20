"use client";

import React, { useEffect, useState, useCallback, Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Search, 
  Sparkles, 
  Flame, 
  Heart, 
  Eye, 
  MessageSquare, 
  Play, 
  Users, 
  Tag, 
  Check, 
  X,
  TrendingUp,
  Layers,
  Compass
} from "lucide-react";
import { audioHaptics } from "../../lib/audioHaptics";
import { appCache } from "../../lib/cache";

export const dynamic = "force-dynamic";

interface TrendingItem {
  id: string;
  type: "post" | "reel";
  caption?: string;
  mediaUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  mediaType?: string;
  viewsCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
  trendingScore: number;
  creator: {
    id: string;
    address: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  };
}

function ExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [activeFilter, setActiveFilter] = useState<"trending" | "likes" | "views" | "recent" | "reels" | "photos">("trending");
  const [trendingItems, setTrendingItems] = useState<TrendingItem[]>([]);
  const [hashtags, setHashtags] = useState<any[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any>({ users: [], posts: [], hashtags: [] });
  const [loading, setLoading] = useState(true);

  const filterTabs = [
    { id: "trending", label: "Top Trending", icon: Flame },
    { id: "likes", label: "Most Liked", icon: Heart },
    { id: "views", label: "Most Viewed", icon: Eye },
    { id: "recent", label: "Fast Rising", icon: TrendingUp },
    { id: "reels", label: "Reels", icon: Play },
    { id: "photos", label: "Photos", icon: Layers },
  ] as const;

  // 1. Initial Cache load for 0ms render
  useEffect(() => {
    const cachedTrending = appCache.get<TrendingItem[]>("explore_trending", true);
    if (cachedTrending && cachedTrending.length > 0) {
      setTrendingItems(cachedTrending);
      setLoading(false);
    }
  }, []);

  // 2. Fetch Real Algorithmic Trending Data
  const fetchTrendingData = useCallback(async (filterType: string) => {
    try {
      setLoading(true);
      const apiFilter = filterType === "reels" || filterType === "photos" ? "trending" : filterType;
      const res = await fetch(`/api/trending?filter=${apiFilter}&limit=40`);
      if (res.ok) {
        const data = await res.json();
        const items: TrendingItem[] = data.trendingContent || [];
        setTrendingItems(items);
        setHashtags(data.hashtags || []);
        setCreators(data.topCreators || []);
        appCache.set("explore_trending", items, 60);
      }
    } catch (err) {
      console.error("Explore fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrendingData(activeFilter);
  }, [activeFilter, fetchTrendingData]);

  // 3. Debounced Search when query entered
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults({ users: [], posts: [], hashtags: [] });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error("Search error:", err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Filter content based on sub-tabs
  const filteredContent = useMemo(() => {
    if (activeFilter === "reels") {
      return trendingItems.filter((item) => item.type === "reel" || item.mediaType === "video");
    }
    if (activeFilter === "photos") {
      return trendingItems.filter((item) => item.type === "post" && item.mediaType !== "video");
    }
    return trendingItems;
  }, [trendingItems, activeFilter]);

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return `${n}`;
  };

  return (
    <div className="space-y-4 text-left pb-16 select-none w-full max-w-full animate-fadeIn">
      
      {/* Top Search Bar */}
      <div className="flex items-center gap-2 px-1 sm:px-0">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search real creators, viral posts, hashtags..."
            className="w-full glass-input text-slate-900 dark:text-white text-xs font-semibold rounded-2xl py-3 pl-10 pr-9 outline-none border border-white/80 dark:border-white/10 transition shadow-sm"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Category Chips */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar px-1 sm:px-0 py-1">
        {filterTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                audioHaptics.playTap();
                setActiveFilter(tab.id as any);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-extrabold transition-all shrink-0 cursor-pointer btn-tactile ${
                isActive
                  ? "bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 shadow-md shadow-cyan-500/25"
                  : "glass-pill text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SEARCH RESULTS: CREATORS */}
      {query && (searchResults.users?.length > 0 || searchResults.accounts?.length > 0) && (
        <div className="px-1 sm:px-0 space-y-2.5 pt-1">
          <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#00B7FF]" />
            <span>Creators</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {(searchResults.users || searchResults.accounts || []).slice(0, 6).map((u: any) => (
              <Link
                key={u.id || u.walletAddress}
                href={`/profile/${u.walletAddress || u.id}`}
                onClick={() => audioHaptics.playNav()}
                className="flex items-center gap-3 p-3 rounded-2xl glass-card border border-white/80 dark:border-white/10 hover:shadow-subtle transition btn-tactile"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden p-0.5 bg-gradient-to-tr from-[#00B7FF] to-[#7EDBE8] shrink-0">
                  <img
                    src={u.avatarUrl || u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id || u.walletAddress}`}
                    alt="User"
                    className="w-full h-full object-cover rounded-full bg-slate-900"
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {u.displayName || u.name || u.username}
                    </span>
                    <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 flex items-center justify-center shrink-0">
                      <Check className="w-2 h-2 stroke-[3]" />
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    @{u.username || (u.walletAddress && u.walletAddress.slice(0, 8))}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* TRENDING HASHTAGS ROW */}
      {!query && hashtags.length > 0 && (
        <div className="flex gap-2 overflow-x-auto hide-scrollbar px-1 sm:px-0 py-0.5">
          {hashtags.map((h) => (
            <button
              key={h.tag}
              onClick={() => {
                audioHaptics.playTap();
                setQuery(h.tag);
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full glass-card border border-cyan-500/20 hover:border-cyan-500/40 text-[11px] font-black text-cyan-500 dark:text-cyan-400 shrink-0 btn-tactile cursor-pointer"
            >
              <Tag className="w-3 h-3" />
              <span>{h.tag}</span>
              <span className="text-[9px] text-slate-400 font-mono font-medium">{h.postCount}</span>
            </button>
          ))}
        </div>
      )}

      {/* LOADING SKELETON */}
      {loading && filteredContent.length === 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 px-1 sm:px-0">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div
              key={n}
              className="aspect-square rounded-[24px] glass-panel bg-slate-200/50 dark:bg-slate-800/50 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* CLEAN EMPTY STATE (WHEN NO REAL TRENDING POSTS) */}
      {!loading && filteredContent.length === 0 && (
        <div className="py-24 flex flex-col items-center justify-center text-center space-y-3 px-4 animate-fadeIn">
          <div className="w-16 h-16 rounded-3xl glass-card border border-cyan-500/30 flex items-center justify-center text-[#00B7FF] shadow-lg shadow-cyan-500/10">
            <Compass className="w-8 h-8 animate-spin" style={{ animationDuration: "12s" }} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">No trending content yet.</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              Be the first creator to share a post or reel and spark the next trend on Pulse!
            </p>
          </div>
          <Link
            href="/create"
            onClick={() => audioHaptics.playNav()}
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 text-xs font-black shadow-md shadow-cyan-500/25 btn-tactile"
          >
            Create Post
          </Link>
        </div>
      )}

      {/* REAL TRENDING MASONRY & BENTO GRID */}
      {filteredContent.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 px-1 sm:px-0">
          {filteredContent.map((item, idx) => {
            const mediaSource = item.videoUrl || item.thumbnailUrl || item.mediaUrl;
            if (!mediaSource) return null;

            const isReelOrVideo = item.type === "reel" || item.mediaType === "video";
            const isLarge = idx % 7 === 0;

            return (
              <div
                key={item.id}
                onClick={() => {
                  audioHaptics.playTap();
                  if (item.type === "reel") {
                    router.push("/pulse");
                  } else {
                    router.push(`/post/${item.id}`);
                  }
                }}
                className={`relative rounded-[24px] overflow-hidden group cursor-pointer shadow-glass border border-white/80 dark:border-white/10 bg-slate-950 transition-all duration-300 hover:scale-[1.02] ${
                  isLarge ? "col-span-2 row-span-2 aspect-square sm:aspect-auto" : "aspect-square"
                }`}
              >
                {/* Media Image / Thumbnail */}
                <img
                  src={mediaSource}
                  alt={item.caption || "Trending on Pulse"}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e: any) => {
                    e.target.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80";
                  }}
                />

                {/* Video Play Badge */}
                {isReelOrVideo && (
                  <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center shadow-md">
                    <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                  </div>
                )}

                {/* Top Rank Badge for Top 3 */}
                {idx < 3 && activeFilter === "trending" && (
                  <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-[9px] shadow-md flex items-center gap-1">
                    <Flame className="w-2.5 h-2.5 fill-slate-950" />
                    <span>#{idx + 1}</span>
                  </div>
                )}

                {/* Hover / Bottom Overlay with Real Engagement Metrics */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex flex-col justify-end p-3 text-white opacity-95 group-hover:opacity-100 transition-opacity">
                  {item.caption && (
                    <p className="text-[11px] font-bold line-clamp-1 mb-1 text-slate-200">
                      {item.caption}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <div className="flex items-center gap-1.5 truncate max-w-[120px]">
                      <img
                        src={item.creator?.avatarUrl}
                        alt={item.creator?.displayName}
                        className="w-4 h-4 rounded-full object-cover border border-white/40 shrink-0"
                      />
                      <span className="truncate text-cyan-300 text-[10px]">
                        @{item.creator?.username}
                      </span>
                    </div>

                    {/* Engagement Counts */}
                    <div className="flex items-center gap-2 text-slate-300 font-mono text-[9px] shrink-0">
                      {item.viewsCount > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Eye className="w-2.5 h-2.5 text-cyan-400" />
                          {formatNumber(item.viewsCount)}
                        </span>
                      )}
                      <span className="flex items-center gap-0.5">
                        <Heart className="w-2.5 h-2.5 text-rose-400 fill-rose-400" />
                        {formatNumber(item.likeCount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
          <Compass className="w-4 h-4 animate-spin text-[#00B7FF]" />
          <span>Loading Trending Explore...</span>
        </div>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}
