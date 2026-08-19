"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Music, 
  Search, 
  Play, 
  Pause, 
  Check, 
  X, 
  Sliders, 
  Sparkles, 
  Flame, 
  Clock, 
  Volume2, 
  ChevronRight,
  Disc
} from "lucide-react";
import { useAuth } from "../lib/authContext";
import { audioHaptics } from "../lib/audioHaptics";

export interface SelectedTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  thumbnailUrl: string;
  duration: number;
  startTime: number;
  category?: string;
}

interface MusicPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTrack: (track: SelectedTrack) => void;
  selectedTrackId?: string;
}

export function MusicPickerModal({
  isOpen,
  onClose,
  onSelectTrack,
  selectedTrackId,
}: MusicPickerModalProps) {
  const { account } = useAuth();

  const [tracks, setTracks] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([
    "All",
    "Trending",
    "Bollywood",
    "Punjabi",
    "Haryanvi",
    "Rajasthani",
    "Hindi",
    "English",
    "Instrumental",
  ]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Audio Playback state
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [trimStartTime, setTrimStartTime] = useState<number>(0);
  const [activeTrimTrack, setActiveTrimTrack] = useState<any | null>(null);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingTrackId(null);
      return;
    }

    const fetchTracks = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (searchQuery) params.append("q", searchQuery);
        if (activeCategory && activeCategory !== "All") params.append("category", activeCategory);
        if (account) params.append("userAddress", account);

        const res = await fetch(`/api/audio?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setTracks(data.audio || []);
          if (data.categories) {
            setCategories(data.categories);
          }
        }
      } catch (err) {
        console.error("Fetch tracks error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTracks();
  }, [isOpen, activeCategory, searchQuery, account]);

  const handleTogglePlay = (track: any, e: React.MouseEvent) => {
    e.stopPropagation();
    audioHaptics.playTap();

    if (playingTrackId === track.id) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingTrackId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = track.url;
        audioPlayerRef.current.currentTime = 0;
        audioPlayerRef.current.play().catch((err) => console.warn("Audio play prevented:", err));
      }
      setPlayingTrackId(track.id);
      setActiveTrimTrack(track);
      setTrimStartTime(0);
    }
  };

  const handleConfirmSelect = (track: any) => {
    audioHaptics.playTap();
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setPlayingTrackId(null);

    onSelectTrack({
      id: track.id,
      title: track.title,
      artist: track.artist,
      url: track.url,
      thumbnailUrl: track.thumbnailUrl,
      duration: track.duration || 30,
      startTime: trimStartTime,
      category: track.category,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in select-none">
      
      {/* Hidden Global Audio Element for Previews */}
      <audio
        ref={audioPlayerRef}
        onEnded={() => setPlayingTrackId(null)}
        className="hidden"
      />

      <div className="w-full max-w-lg bg-white dark:bg-[#131b2e] rounded-t-[32px] sm:rounded-[32px] border border-slate-200 dark:border-slate-800 p-5 space-y-4 max-h-[88vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-[#00B7FF] to-purple-600 flex items-center justify-center text-white shadow-sm">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Music & Audio Library</h3>
              <p className="text-[10px] text-slate-400 font-medium">Bollywood, Punjabi, Haryanvi, Rajasthani & Trending Sounds</p>
            </div>
          </div>

          <button
            onClick={() => {
              if (audioPlayerRef.current) audioPlayerRef.current.pause();
              onClose();
            }}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Bollywood, Punjabi, Haryanvi, Artist or Song..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-[#00B7FF]"
          />
        </div>

        {/* Horizontal Category Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-black">
          {categories.map((cat) => {
            const isActive = activeCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                onClick={() => {
                  audioHaptics.playTap();
                  setActiveCategory(cat);
                }}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#00B7FF] text-slate-950 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-900 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Track Trimmer / Portion Selector Widget (if playing or selected) */}
        {activeTrimTrack && (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-[#00B7FF]/15 via-purple-500/10 to-[#F45AA8]/15 border border-[#00B7FF]/30 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Disc className="w-4 h-4 text-[#00B7FF] animate-spin" />
                <span className="font-extrabold text-slate-900 dark:text-white truncate max-w-[180px]">
                  {activeTrimTrack.title}
                </span>
              </div>
              <span className="text-[10px] font-mono text-cyan-500 font-bold">
                Start: {trimStartTime}s
              </span>
            </div>

            {/* Slider */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-400 font-mono">0s</span>
              <input
                type="range"
                min={0}
                max={Math.max(1, (activeTrimTrack.duration || 30) - 15)}
                value={trimStartTime}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTrimStartTime(val);
                  if (audioPlayerRef.current) {
                    audioPlayerRef.current.currentTime = val;
                  }
                }}
                className="flex-1 accent-[#00B7FF] cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 font-mono">
                {activeTrimTrack.duration || 30}s
              </span>
            </div>
          </div>
        )}

        {/* Tracks List */}
        <div className="flex-1 overflow-y-auto space-y-2 max-h-64 pr-1 no-scrollbar">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 font-bold">Loading music catalog...</div>
          ) : tracks.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">No tracks found. Try another search.</div>
          ) : (
            tracks.map((t) => {
              const isSelected = selectedTrackId === t.id;
              const isPlaying = playingTrackId === t.id;

              return (
                <div
                  key={t.id}
                  onClick={() => handleConfirmSelect(t)}
                  className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer group ${
                    isSelected
                      ? "bg-cyan-500/15 border-[#00B7FF]"
                      : "bg-slate-50 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800 hover:border-[#00B7FF]/40"
                  }`}
                >
                  {/* Left: Thumbnail + Play trigger */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-slate-900 shadow-sm shrink-0">
                      <img
                        src={t.thumbnailUrl}
                        alt={t.title}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={(e) => handleTogglePlay(t, e)}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-colors cursor-pointer"
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4 fill-white" />
                        ) : (
                          <Play className="w-4 h-4 fill-white translate-x-0.5" />
                        )}
                      </button>
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                          {t.title}
                        </h4>
                        {t.status === "trending" && (
                          <span className="text-[10px]">🔥</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium truncate">{t.artist}</p>
                      <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-300">
                        {t.category}
                      </span>
                    </div>
                  </div>

                  {/* Right: Use Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirmSelect(t);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#00B7FF] text-slate-950 font-black text-xs hover:opacity-90 transition-opacity cursor-pointer shrink-0"
                  >
                    <span>Use</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
