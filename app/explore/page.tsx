"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Search, 
  Sparkles, 
  SlidersHorizontal, 
  Check, 
  Play, 
  Users, 
  Tag, 
  TrendingUp,
  X
} from "lucide-react";
import { audioHaptics } from "../../lib/audioHaptics";
import { GlassChip } from "../../components/ui/GlassChip";

export const dynamic = "force-dynamic";

function ExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState("Trending");
  const [results, setResults] = useState<{
    trendingHashtags?: any[];
    trendingCreators?: any[];
    trendingPosts?: any[];
    users?: any[];
    posts?: any[];
    hashtags?: any[];
  }>({});
  const [loading, setLoading] = useState(true);
  const [reels, setReels] = useState<any[]>([]);

  const categories = [
    "Trending",
    "Creators",
    "Music",
    "Photography",
    "Design",
    "Architecture",
    "Cinema",
    "Tech",
  ];

  const handleSearch = useCallback(async (q: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (e) {
      console.error("Search error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExploreData = async () => {
    try {
      const reelsRes = await fetch("/api/pulse");
      if (reelsRes.ok) {
        const reelsData = await reelsRes.json();
        setReels(reelsData.pulses || []);
      }
    } catch (e) {
      console.error("Explore fetch error:", e);
    }
  };

  useEffect(() => {
    fetchExploreData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  const displayedPosts = results.posts || results.trendingPosts || [];
  const displayedUsers = results.users || results.trendingCreators || [];

  return (
    <div className="space-y-4 text-left pb-16 select-none w-full max-w-full animate-fadeIn">
      {/* Top Search & Filter Header */}
      <div className="flex items-center gap-2 px-1 sm:px-0">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Pulse creators, posts, tags..."
            className="w-full glass-input text-slate-900 dark:text-white text-xs font-semibold rounded-2xl py-3 pl-10 pr-8 outline-none border border-white/80 dark:border-white/10 transition shadow-sm"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => audioHaptics.playTap()}
          className="w-10 h-10 rounded-2xl glass-pill flex items-center justify-center text-slate-700 dark:text-slate-200 btn-tactile shrink-0 cursor-pointer"
          title="Filters"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Category Chips Scroll */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar px-1 sm:px-0 py-1">
        {categories.map((cat) => (
          <GlassChip
            key={cat}
            label={cat}
            isActive={activeCategory === cat}
            onClick={() => setActiveCategory(cat)}
          />
        ))}
      </div>

      {/* Query Search Results: Users */}
      {query && displayedUsers.length > 0 && (
        <div className="px-1 sm:px-0 space-y-2.5">
          <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#00B7FF]" /> Creators
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {displayedUsers.slice(0, 4).map((u: any) => (
              <Link
                key={u.id || u.walletAddress}
                href={`/profile/${u.walletAddress || u.id}`}
                className="flex items-center gap-3 p-3 rounded-2xl glass-card border border-white/80 dark:border-white/10 hover:shadow-subtle transition btn-tactile"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden border border-white p-0.5 bg-gradient-to-tr from-[#00B7FF] to-[#7EDBE8] shrink-0">
                  <img
                    src={
                      u.profile?.avatarUrl ||
                      u.avatarUrl ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${u.walletAddress || u.id}`
                    }
                    alt="User"
                    className="w-full h-full object-cover rounded-full bg-slate-900"
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {u.profile?.displayName || u.displayName || u.username}
                    </span>
                    <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 flex items-center justify-center shrink-0">
                      <Check className="w-2 h-2 stroke-[3]" />
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    @{u.profile?.username || u.username || (u.walletAddress && u.walletAddress.slice(0, 8))}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Main Responsive Masonry & Bento Grid */}
      <div className="masonry-grid px-1 sm:px-0">
        {/* Large Hero Item */}
        <div className="masonry-item-large relative rounded-[28px] overflow-hidden group cursor-pointer shadow-glass border border-white/80 dark:border-white/10 bg-slate-950">
          <img
            src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800"
            alt="Neon Horizons"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4 text-white">
            <h4 className="text-sm sm:text-base font-black leading-tight mb-1">Architectural Horizons</h4>
            <div className="flex items-center gap-2 text-[10px] font-bold text-cyan-300">
              <span>@cyber_spaces</span>
              <span>•</span>
              <span>Featured</span>
            </div>
          </div>
        </div>

        {/* Tall Portrait Item */}
        <div className="masonry-item-tall relative rounded-[28px] overflow-hidden group cursor-pointer shadow-glass border border-white/80 dark:border-white/10 bg-slate-950">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600"
            alt="Portrait Item"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute top-3 right-3 w-8 h-8 rounded-full glass-dock text-white flex items-center justify-center shadow-md">
            <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
          </div>
        </div>

        {/* Square Item 1 */}
        <div className="masonry-item-square relative rounded-[28px] overflow-hidden group cursor-pointer shadow-glass border border-white/80 dark:border-white/10 bg-slate-900">
          <img
            src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500"
            alt="Luxury Design"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>

        {/* Square Item 2 */}
        <div className="masonry-item-square relative rounded-[28px] overflow-hidden group cursor-pointer shadow-glass border border-white/80 dark:border-white/10 bg-slate-900">
          <img
            src="https://images.unsplash.com/photo-1513694203232-719a280e022f?w=500"
            alt="Minimal Interior"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>

        {/* Wide Item */}
        <div className="masonry-item-wide relative rounded-[28px] overflow-hidden group cursor-pointer shadow-glass border border-white/80 dark:border-white/10 bg-slate-950">
          <img
            src="https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800"
            alt="Dune Landscape"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-3 text-white">
            <span className="text-xs font-black uppercase tracking-wider text-cyan-300">Serene Horizons</span>
          </div>
        </div>

        {/* Dynamic Database Posts In Grid */}
        {displayedPosts.map((p: any, idx: number) => {
          if (!p.mediaUrl) return null;
          const isVideo = p.mediaType === "video";

          return (
            <div
              key={p.id || idx}
              onClick={() => router.push(`/post/${p.id}`)}
              className="masonry-item-square relative rounded-[28px] overflow-hidden group cursor-pointer shadow-glass border border-white/80 dark:border-white/10 bg-slate-900"
            >
              {isVideo ? (
                <video
                  src={p.mediaUrl}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={p.mediaUrl}
                  alt={p.caption || "Explore post"}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
              {isVideo && (
                <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full glass-dock text-white flex items-center justify-center shadow-md">
                  <Play className="w-3 h-3 fill-white ml-0.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-slate-400">Loading Pulse Explore...</div>}>
      <ExploreContent />
    </Suspense>
  );
}
