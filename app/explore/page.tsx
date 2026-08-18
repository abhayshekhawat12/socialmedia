"use client";

import React, { useEffect, useState, useCallback, Suspense, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Search, 
  Compass, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  Users, 
  Tag, 
  Music, 
  Heart, 
  Eye, 
  Play, 
  Volume2,
  VolumeX,
  Grid
} from "lucide-react";
import { useWeb3 } from "../../lib/web3Context";

export const dynamic = "force-dynamic";

function ExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<"all" | "videos" | "audio" | "creators" | "hashtags">("all");
  
  const [results, setResults] = useState<{
    trendingHashtags?: any[];
    trendingCreators?: any[];
    trendingPosts?: any[];
    users?: any[];
    posts?: any[];
    hashtags?: any[];
  }>({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [reels, setReels] = useState<any[]>([]);
  const [audioList, setAudioList] = useState<any[]>([]);
  const [hoveredReelId, setHoveredReelId] = useState<string | null>(null);

  const categories = ["All", "AI", "Web3", "Blockchain", "Tech", "Photography", "Digital Art"];

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
      // Fetch dynamic reels for explore grid
      const reelsRes = await fetch("/api/pulse");
      if (reelsRes.ok) {
        const reelsData = await reelsRes.json();
        setReels(reelsData.pulses || []);
      }

      // Fetch dynamic audio
      const audioRes = await fetch("/api/audio");
      if (audioRes.ok) {
        const audioData = await audioRes.json();
        setAudioList(audioData.audio || []);
      }
    } catch (e) {
      console.error("Explore fetch error:", e);
    }
  };

  useEffect(() => {
    fetchExploreData();
  }, []);

  useEffect(() => {
    handleSearch(query);
  }, [query, handleSearch]);

  // Filter video list based on category
  const filteredReels = selectedCategory === "All"
    ? reels
    : reels.filter(r => r.category && r.category.toLowerCase() === selectedCategory.toLowerCase());

  // Extract display lists
  const displayedPosts = results.posts || results.trendingPosts || [];
  const displayedUsers = results.users || results.trendingCreators || [];
  const displayedTags = results.hashtags || results.trendingHashtags || [];

  return (
    <div className="space-y-8 max-w-4xl mx-auto text-left">
      {/* Search Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 animate-pulse">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Discover & Explore</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Search cryptographic hashes, creators, trending audios, or explore short-video grids</p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search wallet hashes (0x...), @username, #hashtags, sound titles..."
            className="w-full pl-12 pr-4 py-4 text-xs font-bold rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#00B7FF] shadow-lg shadow-slate-950/5 focus:shadow-cyan-500/5 transition-all"
          />
        </div>

        {/* Explore Sub-navigation Tabs */}
        <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
          {(["all", "videos", "audio", "creators", "hashtags"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                if (tab !== "all" && query === "") {
                  // Trigger search fallback initialization
                  handleSearch("");
                }
              }}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border shrink-0 ${
                activeTab === tab
                  ? "bg-[#00B7FF] border-[#00B7FF] text-white shadow-md shadow-[#00B7FF]/15"
                  : "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* RENDER DYNAMIC GRID & SECTIONS WHEN QUERY IS EMPTY */}
      {query === "" && (
        <div className="space-y-8">
          
          {/* Category Filter Pills for video grid */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Grid className="w-3.5 h-3.5 text-[#00B7FF]" />
              Explore Short Videos ({filteredReels.length})
            </h3>
            
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors shrink-0 ${
                    selectedCategory === cat
                      ? "bg-[#00B7FF] text-white"
                      : "bg-slate-150 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Video Masonry/Grid Layout */}
            {filteredReels.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredReels.map((reel, index) => (
                  <div
                    key={reel.id}
                    onClick={() => router.push(`/pulse?index=${index}`)}
                    onMouseEnter={() => setHoveredReelId(reel.id)}
                    onMouseLeave={() => setHoveredReelId(null)}
                    className="relative aspect-[9/14] rounded-3xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 group cursor-pointer shadow-md hover:shadow-lg transition-all"
                  >
                    <video 
                      src={reel.videoUrl} 
                      muted 
                      loop
                      playsInline
                      className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
                      ref={(el) => {
                        if (el) {
                          if (hoveredReelId === reel.id) {
                            el.play().catch(() => {});
                          } else {
                            el.pause();
                            el.currentTime = 0;
                          }
                        }
                      }}
                    />
                    
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                    
                    {/* Floating Info */}
                    <div className="absolute bottom-3 inset-x-3 text-left space-y-1 z-15">
                      <p className="text-[11px] font-black text-white truncate">@{reel.author.username}</p>
                      <div className="flex items-center justify-between text-[9px] text-slate-300 font-bold">
                        <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5 text-red-500 fill-red-500" /> {reel.likeCount}</span>
                        <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5 text-cyan-400" /> {reel.viewsCount}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 border border-dashed border-slate-250 dark:border-slate-850 rounded-3xl text-center text-xs font-bold text-slate-400">
                No short videos found under category "{selectedCategory}".
              </div>
            )}
          </div>

          {/* Trending Songs Row */}
          {audioList.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-purple-400" />
                Hot Sounds & Backing Tracks
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {audioList.slice(0, 4).map((song) => (
                  <div 
                    key={song.id}
                    onClick={() => router.push(`/trending?tab=audio`)}
                    className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] hover:border-cyan-500/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={song.thumbnailUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100"} alt="Cover" className="w-10 h-10 rounded-xl object-cover shrink-0" />
                      <div className="text-left min-w-0">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">{song.title}</h4>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5 truncate">{song.artist}</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-cyan-500 shrink-0">{(song.useCount / 1000).toFixed(1)}k use</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Creators Avatars */}
          {displayedUsers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                Featured Web3 Creators
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {displayedUsers.slice(0, 4).map((userObj: any) => {
                  const u = userObj.profile || userObj;
                  const addr = userObj.user?.walletAddress || userObj.walletAddress || "0x000";
                  return (
                    <div 
                      key={userObj.id}
                      onClick={() => router.push(`/profile/${addr}`)}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] text-center space-y-2 cursor-pointer hover:border-cyan-500 transition-colors"
                    >
                      <img 
                        src={u.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"} 
                        alt="Avatar" 
                        className="w-12 h-12 rounded-full mx-auto object-cover border border-white" 
                      />
                      <div>
                        <p className="text-xs font-black text-slate-900 dark:text-white truncate">{u.displayName}</p>
                        <p className="text-[10px] text-cyan-400 font-mono truncate mt-0.5">@{u.username}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* RENDER CATEGORIZED SEARCH RESULTS WHEN QUERY IS ACTIVE */}
      {query !== "" && (
        <div className="space-y-6">
          {loading ? (
            <div className="py-20 text-center text-xs font-bold text-slate-400 flex flex-col items-center gap-2">
              <span className="animate-spin w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full" />
              <span>Querying blockchain profiles & metadata...</span>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* 1. FILTER: CREATORS */}
              {(activeTab === "all" || activeTab === "creators") && displayedUsers.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-purple-400" /> Users ({displayedUsers.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {displayedUsers.map((userObj: any) => {
                      const u = userObj.profile || userObj;
                      const addr = userObj.user?.walletAddress || userObj.walletAddress || "0x000";
                      return (
                        <div 
                          key={userObj.id}
                          onClick={() => router.push(`/profile/${addr}`)}
                          className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] cursor-pointer hover:border-[#00B7FF] transition-all"
                        >
                          <img src={u.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"} alt="Avatar" className="w-10 h-10 rounded-full object-cover shrink-0" />
                          <div className="min-w-0 text-left">
                            <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">{u.displayName}</h4>
                            <p className="text-[10px] font-mono text-cyan-400 truncate">@{u.username}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. FILTER: VIDEOS / POSTS */}
              {(activeTab === "all" || activeTab === "videos") && displayedPosts.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Play className="w-3.5 h-3.5 text-cyan-400" /> Videos & Posts ({displayedPosts.length})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {displayedPosts.map((post: any) => (
                      <div 
                        key={post.id}
                        onClick={() => router.push(post.mediaType === "video" ? "/pulse" : `/post/${post.id}`)}
                        className="relative aspect-square rounded-3xl bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden cursor-pointer group"
                      >
                        {post.mediaType === "video" ? (
                          <video src={post.mediaUrl} className="w-full h-full object-cover opacity-80" />
                        ) : (
                          <img src={post.mediaUrl} alt="Post cover" className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300" />
                        )}
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30" />
                        
                        {post.mediaType === "video" && (
                          <span className="absolute top-2.5 right-2.5 p-1 rounded-lg bg-black/60 text-white">
                            <Play className="w-3 h-3 fill-current" />
                          </span>
                        )}

                        <div className="absolute bottom-2.5 inset-x-2.5 text-left truncate text-[10px] font-bold text-white">
                          {post.caption}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. FILTER: HASHTAGS */}
              {(activeTab === "all" || activeTab === "hashtags") && displayedTags.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-orange-400" /> Hashtags ({displayedTags.length})
                  </h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    {displayedTags.map((t: any) => (
                      <button
                        key={t.id || t.tag}
                        onClick={() => setQuery(`#${t.tag.replace('#', '')}`)}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-black text-cyan-500 hover:border-cyan-500 transition-colors"
                      >
                        #{t.tag.replace('#', '')} ({t.postCount || 1})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. FILTER: AUDIO */}
              {(activeTab === "all" || activeTab === "audio") && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Music className="w-3.5 h-3.5 text-yellow-400" /> Backing Tracks
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {audioList
                      .filter(s => s.title.toLowerCase().includes(query.toLowerCase().replace('#', '')) || s.artist.toLowerCase().includes(query.toLowerCase()))
                      .map((song) => (
                        <div 
                          key={song.id}
                          onClick={() => router.push("/trending?tab=audio")}
                          className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] hover:border-cyan-500/30 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img src={song.thumbnailUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100"} alt="Cover" className="w-10 h-10 rounded-xl object-cover shrink-0" />
                            <div className="text-left min-w-0">
                              <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">{song.title}</h4>
                              <p className="text-[10px] text-slate-400 font-bold mt-0.5 truncate">{song.artist}</p>
                            </div>
                          </div>
                          <span className="text-[9px] font-black text-cyan-500 shrink-0">{(song.useCount / 1000).toFixed(1)}k uses</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Empty state search */}
              {displayedUsers.length === 0 && displayedPosts.length === 0 && displayedTags.length === 0 && (
                <div className="py-20 border border-dashed border-slate-250 dark:border-slate-850 rounded-3xl text-center text-xs font-bold text-slate-400">
                  No matching creators, tags, or content found for query "{query}".
                </div>
              )}

            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading explore page...</div>}>
      <ExploreContent />
    </Suspense>
  );
}
