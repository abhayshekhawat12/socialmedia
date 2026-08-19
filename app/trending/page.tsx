"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Flame, 
  Music, 
  Sliders, 
  Users, 
  Tag, 
  Play, 
  Pause, 
  ChevronRight, 
  Sparkles, 
  Heart, 
  Eye, 
  UserCheck, 
  Volume2, 
  VolumeX,
  TrendingUp,
  Bookmark,
  Loader2
} from "lucide-react";
import { useAuth } from "../../lib/authContext";

interface Song {
  id: string;
  title: string;
  artist: string;
  url: string;
  thumbnailUrl: string;
  useCount: number;
  trendGrowth: number;
  status: string;
}

interface Creator {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  user?: {
    walletAddress: string;
  };
}

export default function TrendingPage() {
  const router = useRouter();
  const { account } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<"reels" | "audio" | "filters" | "creators" | "hashtags">("reels");
  
  // Data States
  const [reels, setReels] = useState<any[]>([]);
  const [audioList, setAudioList] = useState<Song[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [hashtags, setHashtags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Audio Playback State
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Mock visual filters with usage statistics
  const visualFilters = [
    { name: "Cinematic Glow", category: "Cinematic", useCount: 14200, growth: "+124%", isTrending: true, class: "brightness-[1.1] saturate-[1.15] contrast-[1.1] hue-rotate-[5deg]" },
    { name: "Vintage Dream", category: "Vintage", useCount: 9800, growth: "+95%", isTrending: true, class: "sepia-[0.35] brightness-[0.95] contrast-[0.9] saturate-[0.85]" },
    { name: "Cyber Punk Glow", category: "Glow", useCount: 8400, growth: "+88%", isTrending: true, class: "saturate-[1.4] hue-rotate-[320deg] brightness-[1.05]" },
    { name: "Retro Film Vibe", category: "Retro", useCount: 7100, growth: "+62%", isTrending: false, class: "sepia-[0.15] contrast-[1.05] brightness-[1.02]" },
    { name: "Aesthetic Portrait", category: "Aesthetic", useCount: 5600, growth: "+47%", isTrending: false, class: "contrast-[0.95] saturate-[1.05] brightness-[1.03]" },
    { name: "AI Dreamscape", category: "AI", useCount: 4200, growth: "+110%", isTrending: true, class: "hue-rotate-[180deg] saturate-[1.5] brightness-[1.1]" },
    { name: "Noir Film", category: "Black & White", useCount: 3100, growth: "+18%", isTrending: false, class: "grayscale-[1] contrast-[1.2]" },
    { name: "Pop Anime", category: "Anime", useCount: 2900, growth: "+5%", isTrending: false, class: "saturate-[1.8] contrast-[1.15]" }
  ];

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch Trending Reels
      const reelsRes = await fetch("/api/pulse?tab=trending");
      if (reelsRes.ok) {
        const reelsData = await reelsRes.json();
        setReels(reelsData.pulses || []);
      }

      // Fetch Trending Audio
      const audioRes = await fetch("/api/audio");
      if (audioRes.ok) {
        const audioData = await audioRes.json();
        setAudioList(audioData.audio || []);
      }

      // Fetch Top Creators and Hashtags via /api/search fallback
      const searchRes = await fetch("/api/search");
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        setCreators(searchData.trendingCreators || []);
        setHashtags(searchData.trendingHashtags || []);
      }
    } catch (e) {
      console.error("Failed to fetch trending data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAudioPreview = (song: Song) => {
    if (playingSongId === song.id) {
      // Pause
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingSongId(null);
    } else {
      // Play
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(song.url);
      audioRef.current.play().catch(e => console.warn(e));
      setPlayingSongId(song.id);
      
      audioRef.current.onended = () => {
        setPlayingSongId(null);
      };
    }
  };

  // Cleanup audio play on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const useSound = (song: Song) => {
    router.push(`/create?audioId=${song.id}&audioTitle=${encodeURIComponent(song.title)}`);
  };

  const useFilter = (filterName: string) => {
    router.push(`/create?filterName=${encodeURIComponent(filterName)}`);
  };

  const navigateToCreator = (wallet: string) => {
    router.push(`/profile/${wallet}`);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header section */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <Flame className="w-6 h-6 text-orange-500 fill-orange-500/10" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Trending Hub</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">A dynamic view of Web3 creators, rising sounds, and viral video challenges</p>
        </div>
      </div>

      {/* Secondary Sub Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 border-b border-slate-100 dark:border-slate-850">
        <button
          onClick={() => setActiveSubTab("reels")}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-xl transition-all shrink-0 ${
            activeSubTab === "reels"
              ? "bg-[#00B7FF] text-white shadow-md shadow-[#00B7FF]/20"
              : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-white"
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>Trending Reels</span>
        </button>

        <button
          onClick={() => setActiveSubTab("audio")}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-xl transition-all shrink-0 ${
            activeSubTab === "audio"
              ? "bg-[#00B7FF] text-white shadow-md shadow-[#00B7FF]/20"
              : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-white"
          }`}
        >
          <Music className="w-4 h-4" />
          <span>Trending Audio</span>
        </button>

        <button
          onClick={() => setActiveSubTab("filters")}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-xl transition-all shrink-0 ${
            activeSubTab === "filters"
              ? "bg-[#00B7FF] text-white shadow-md shadow-[#00B7FF]/20"
              : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-white"
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Filters & Effects</span>
        </button>

        <button
          onClick={() => setActiveSubTab("creators")}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-xl transition-all shrink-0 ${
            activeSubTab === "creators"
              ? "bg-[#00B7FF] text-white shadow-md shadow-[#00B7FF]/20"
              : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-white"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Rising Creators</span>
        </button>

        <button
          onClick={() => setActiveSubTab("hashtags")}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black rounded-xl transition-all shrink-0 ${
            activeSubTab === "hashtags"
              ? "bg-[#00B7FF] text-white shadow-md shadow-[#00B7FF]/20"
              : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-white"
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Hashtags</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-xs font-bold gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#00B7FF]" />
          <span>Calculating trending scores...</span>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          {/* A. TRENDING REELS STREAM */}
          {activeSubTab === "reels" && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {reels.map((reel, index) => (
                <div 
                  key={reel.id} 
                  onClick={() => router.push(`/pulse?index=${index}`)}
                  className="group relative aspect-[9/16] rounded-3xl overflow-hidden bg-slate-950 shadow-md border border-slate-200 dark:border-slate-800 cursor-pointer"
                >
                  <video src={reel.videoUrl} muted className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" />
                  
                  {/* Rank badge */}
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-[10px] font-black text-orange-400 border border-orange-500/25 flex items-center gap-1">
                    <span>🔥 #{index + 1}</span>
                  </div>

                  {/* Creator details overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/40 to-transparent p-4 flex flex-col justify-end space-y-1.5 text-left">
                    <div className="flex items-center gap-1.5">
                      <img src={reel.author.avatarUrl} alt="Avatar" className="w-5 h-5 rounded-full object-cover border border-white" />
                      <p className="text-[11px] font-extrabold text-white truncate">@{reel.author.username}</p>
                    </div>
                    <p className="text-[10px] text-slate-350 line-clamp-2 leading-relaxed">{reel.caption}</p>
                    
                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-300 pt-1 border-t border-white/15">
                      <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-red-500 fill-red-500" /> {reel.likeCount}</span>
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3 text-cyan-400" /> {reel.viewsCount}</span>
                      <span className="text-orange-400 font-extrabold">{reel.pulseScore} Score</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* B. TRENDING AUDIO LIST */}
          {activeSubTab === "audio" && (
            <div className="space-y-3">
              {audioList.map((song, index) => (
                <div 
                  key={song.id}
                  className="flex items-center justify-between p-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] hover:border-cyan-500/30 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden relative shrink-0">
                      <img src={song.thumbnailUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100"} alt="Cover" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => handleAudioPreview(song)}
                        className="absolute inset-0 bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {playingSongId === song.id ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
                      </button>
                    </div>

                    <div className="text-left">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{song.title}</span>
                        {song.status === "trending" && <span className="text-[9px] font-black text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full">🔥 Trending</span>}
                        {song.status === "rising" && <span className="text-[9px] font-black text-[#00B7FF] bg-[#00B7FF]/10 px-2 py-0.5 rounded-full">🚀 Rising</span>}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">{song.artist}</p>
                      
                      <div className="flex items-center gap-3 text-[9px] text-slate-400 font-bold mt-1.5">
                        <span className="flex items-center gap-1">🎵 {(song.useCount / 1000).toFixed(1)}k Reels</span>
                        <span className="text-emerald-500 font-extrabold flex items-center gap-0.5">
                          <TrendingUp className="w-2.5 h-2.5" /> +{song.trendGrowth}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleAudioPreview(song)}
                      className={`p-2.5 rounded-2xl transition-colors cursor-pointer ${
                        playingSongId === song.id 
                          ? "bg-[#00B7FF]/10 text-[#00B7FF]"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-350 hover:bg-slate-200"
                      }`}
                    >
                      {playingSongId === song.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                    </button>

                    <button 
                      onClick={() => useSound(song)}
                      className="px-4 py-2 rounded-2xl bg-[#00B7FF] hover:bg-[#00B7FF]/90 text-white font-extrabold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <span>Use Sound</span>
                      <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* C. TRENDING FILTERS */}
          {activeSubTab === "filters" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
              {visualFilters.map((filter) => (
                <div 
                  key={filter.name}
                  className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] overflow-hidden group hover:border-[#00B7FF]/40 transition-all flex flex-col justify-between"
                >
                  <div className="relative aspect-video bg-slate-900 overflow-hidden flex items-center justify-center">
                    {/* Simulated visual filter preview */}
                    <img 
                      src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=300&auto=format&fit=crop&q=80" 
                      alt="Filter preview" 
                      className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${filter.class}`} 
                    />
                    <div className="absolute inset-0 bg-black/10" />
                    
                    {filter.isTrending && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-orange-500 text-slate-950 font-black text-[8px] rounded-full uppercase tracking-wider">
                        🔥 Hot
                      </span>
                    )}
                    
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm text-[8px] font-bold text-white rounded-full">
                      {filter.category}
                    </span>
                  </div>

                  <div className="p-3.5 space-y-2">
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">{filter.name}</h4>
                      <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold mt-1">
                        <span>{(filter.useCount / 1000).toFixed(1)}k uses</span>
                        <span className="text-emerald-500 font-extrabold">{filter.growth}</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => useFilter(filter.name)}
                      className="w-full py-2 rounded-xl bg-slate-100 hover:bg-[#00B7FF]/10 dark:bg-slate-800 dark:hover:bg-[#00B7FF]/10 text-slate-800 dark:text-slate-300 dark:hover:text-[#00B7FF] font-extrabold text-[10px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Use Filter</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* D. RISING CREATORS */}
          {activeSubTab === "creators" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
              {creators.map((c) => {
                const addr = c.user?.walletAddress || "0x000";
                return (
                  <div 
                    key={c.id}
                    className="p-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] text-center space-y-3 relative group hover:border-[#00B7FF]/40 transition-all flex flex-col justify-between"
                  >
                    {/* Visual Badge for rank */}
                    <span className="absolute top-3 right-3 text-[9px] font-black text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <UserCheck className="w-3 h-3" /> Creator
                    </span>

                    <div className="space-y-2">
                      <div className="w-16 h-16 rounded-full mx-auto p-0.5 bg-gradient-to-tr from-[#00B7FF] to-purple-500 relative">
                        <img 
                          src={c.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"} 
                          alt="Avatar" 
                          className="w-full h-full rounded-full object-cover border border-white dark:border-[#131b2e]" 
                        />
                      </div>
                      
                      <div className="min-w-0">
                        <h4 className="text-xs font-black truncate text-slate-900 dark:text-white">{c.displayName}</h4>
                        <p className="text-[10px] font-mono text-cyan-400 truncate mt-0.5">@{c.username}</p>
                      </div>

                      <p className="text-[10px] text-slate-400 font-medium line-clamp-2 leading-relaxed">
                        {c.bio || "Building on Aura Social"}
                      </p>
                    </div>

                    <button 
                      onClick={() => navigateToCreator(addr)}
                      className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-extrabold text-[11px] transition-opacity hover:opacity-90 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>View Profile</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* E. TRENDING HASHTAGS */}
          {activeSubTab === "hashtags" && (
            <div className="space-y-2.5 text-left">
              {hashtags.map((h, i) => (
                <div 
                  key={h.id || h.tag}
                  onClick={() => router.push(`/explore?q=${encodeURIComponent(h.tag)}`)}
                  className="p-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] hover:border-cyan-500/20 transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-black">
                      #{i + 1}
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-[#00B7FF] group-hover:underline">
                        #{h.tag.replace('#', '')}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">{(h.postCount || 1) * 8} views • {h.postCount || 1} proof anchors</p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <span>Discover</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </span>
                </div>
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
