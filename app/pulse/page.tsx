'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/authContext';
import { useSettings } from '../../lib/settingsContext';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Music,
  Plus,
  Play,
  Volume2,
  VolumeX,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Upload,
  Send,
  Loader2,
  Check,
  Film,
  Trash2,
  Sliders,
  AlertTriangle
} from 'lucide-react';
import { audioHaptics } from '../../lib/audioHaptics';
import { MusicPickerModal, SelectedTrack } from '../../components/MusicPickerModal';
import { GlassModal } from '../../components/ui/GlassModal';
import { GlassToast } from '../../components/ui/GlassToast';
import { appCache } from '../../lib/cache';

interface PulseItem {
  id: string;
  authorAddress: string;
  videoUrl: string;
  thumbnailUrl: string;
  caption: string;
  hashtags: string;
  category: string;
  audioTitle: string;
  filterName: string;
  likesCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  saveCount: number;
  pulseScore: number;
  authenticScore: number;
  isLiked?: boolean;
  isSaved?: boolean;
  author: {
    username: string;
    displayName: string;
    avatarUrl: string;
  };
}

export default function PulsePage() {
  const router = useRouter();
  const { account, user } = useAuth();
  const { settings } = useSettings();

  const [activeTab, setActiveTab] = useState<'trending' | 'for_you' | 'following'>('trending');
  const [pulses, setPulses] = useState<PulseItem[]>(() => {
    return appCache.get<PulseItem[]>("pulse_reels_trending") || [];
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Modals & Bottom Sheets
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [isMusicPickerOpen, setIsMusicPickerOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Like & Double Tap Heart animation
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [heartAnimPos, setHeartAnimPos] = useState({ x: 0, y: 0 });

  // Creation State & File Upload
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [createVideoPreview, setCreateVideoPreview] = useState<string | null>(null);
  const [createCaption, setCreateCaption] = useState('');
  const [createHashtags, setCreateHashtags] = useState('#Pulse #Trending');
  const [selectedTrack, setSelectedTrack] = useState<SelectedTrack | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Comments State
  const [comments, setComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Fetch Pulses
  const fetchPulses = async () => {
    try {
      const tabParam = activeTab === 'trending' ? 'trending' : activeTab === 'for_you' ? 'forYou' : 'following';
      const url = account 
        ? `/api/pulse?tab=${tabParam}&userAddress=${account}` 
        : `/api/pulse?tab=${tabParam}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.pulses && data.pulses.length > 0) {
          const formatted = data.pulses.map((p: any) => ({
            ...p,
            likeCount: p.likes?.length !== undefined ? p.likes.length : p.likeCount || 0,
            commentCount: p.commentCount || 0,
            saveCount: p.savedPulses?.length !== undefined ? p.savedPulses.length : p.saveCount || 0,
            isLiked: account ? p.likes?.some((l: any) => l.userAddress.toLowerCase() === account.toLowerCase()) : false,
            isSaved: account ? p.savedPulses?.some((sp: any) => sp.userAddress.toLowerCase() === account.toLowerCase()) : false,
          }));
          setPulses(formatted);
          appCache.set(`pulse_reels_${activeTab}`, formatted, 45);
        } else {
          setPulses([]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch reels:', err);
    }
  };

  useEffect(() => {
    fetchPulses();
  }, [activeTab, account]);

  const currentPulse = pulses[currentIndex];
  const isOwnCurrentPulse = account && currentPulse && currentPulse.authorAddress.toLowerCase() === account.toLowerCase();

  // Handle Playback & Speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
      if (isPlaying) {
        videoRef.current.play().catch((e) => console.warn('Autoplay error:', e));
      } else {
        videoRef.current.pause();
      }
    }
  }, [currentIndex, isPlaying, playbackSpeed]);

  const toggleSpeed = () => {
    audioHaptics.playTap();
    const speeds = [0.5, 1, 1.5, 2];
    const nextIndex = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIndex]);
  };

  const handleNext = () => {
    if (currentIndex < pulses.length - 1) {
      audioHaptics.playTap();
      setCurrentIndex(currentIndex + 1);
      setIsPlaying(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      audioHaptics.playTap();
      setCurrentIndex(currentIndex - 1);
      setIsPlaying(true);
    }
  };

  const handleLike = async () => {
    if (!account) {
      router.push('/login');
      return;
    }
    if (!currentPulse) return;

    const nextLiked = !currentPulse.isLiked;
    const nextCount = nextLiked ? currentPulse.likeCount + 1 : Math.max(0, currentPulse.likeCount - 1);

    if (nextLiked) {
      audioHaptics.playLike();
    } else {
      audioHaptics.playTap();
    }

    setPulses((prev) =>
      prev.map((p, idx) =>
        idx === currentIndex ? { ...p, isLiked: nextLiked, likeCount: nextCount } : p
      )
    );

    try {
      const res = await fetch(`/api/pulse/${currentPulse.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: account }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.likeCount !== undefined) {
          setPulses((prev) =>
            prev.map((p, idx) => (idx === currentIndex ? { ...p, likeCount: data.likeCount } : p))
          );
        }
      }
    } catch (e) {
      console.warn('Reel like sync error:', e);
    }
  };

  const handleDoubleTap = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHeartAnimPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setShowHeartAnim(true);
    setTimeout(() => setShowHeartAnim(false), 800);

    if (!currentPulse?.isLiked) {
      handleLike();
    } else {
      audioHaptics.playLike();
    }
  };

  const handleSaveToggle = async () => {
    if (!account) {
      router.push('/login');
      return;
    }
    if (!currentPulse) return;

    audioHaptics.playTap();
    const nextSaved = !currentPulse.isSaved;
    const nextCount = nextSaved ? currentPulse.saveCount + 1 : Math.max(0, currentPulse.saveCount - 1);

    setPulses((prev) =>
      prev.map((p, idx) =>
        idx === currentIndex ? { ...p, isSaved: nextSaved, saveCount: nextCount } : p
      )
    );
    triggerToast(nextSaved ? "⚡ Saved to your collection!" : "Removed from saved");

    try {
      await fetch('/api/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: account, pulseId: currentPulse.id }),
      });
    } catch (e) {
      console.warn('Reel save sync error:', e);
    }
  };

  const handleShare = () => {
    audioHaptics.playTap();
    if (currentPulse) {
      const url = `${window.location.origin}/pulse?id=${currentPulse.id}`;
      navigator.clipboard.writeText(url);
      triggerToast("🔗 Link copied to clipboard!");
    }
  };

  const handleDeleteReel = async () => {
    if (!account || !currentPulse || !isOwnCurrentPulse) return;
    try {
      setIsDeleting(true);
      audioHaptics.playTap();

      const res = await fetch(`/api/pulse/${currentPulse.id}?userAddress=${account}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setPulses((prev) => prev.filter((p) => p.id !== currentPulse.id));
        setShowDeleteModal(false);
        if (currentIndex >= pulses.length - 1) {
          setCurrentIndex(Math.max(0, pulses.length - 2));
        }
      }
    } catch (err) {
      console.error('Delete reel error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchComments = async (pulseId: string) => {
    try {
      setIsLoadingComments(true);
      const res = await fetch(`/api/pulse/${pulseId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error('Failed to load reel comments:', err);
    } finally {
      setIsLoadingComments(false);
    }
  };

  useEffect(() => {
    if (isCommentOpen && currentPulse) {
      fetchComments(currentPulse.id);
    }
  }, [isCommentOpen, currentIndex]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || isSubmittingComment || !currentPulse) return;
    if (!account) {
      router.push('/login');
      return;
    }

    try {
      setIsSubmittingComment(true);
      audioHaptics.playTap();

      const res = await fetch(`/api/pulse/${currentPulse.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorAddress: account,
          content: newCommentText.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [data.comment, ...prev]);
        setPulses((prev) =>
          prev.map((p, idx) =>
            idx === currentIndex ? { ...p, commentCount: data.commentCount || p.commentCount + 1 } : p
          )
        );
        setNewCommentText('');
      }
    } catch (err) {
      console.error('Reel comment error:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!account || !currentPulse) return;
    try {
      const res = await fetch(`/api/pulse/${currentPulse.id}/comments/${commentId}?userAddress=${account}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setPulses((prev) =>
          prev.map((p, idx) =>
            idx === currentIndex ? { ...p, commentCount: Math.max(0, p.commentCount - 1) } : p
          )
        );
      }
    } catch (err) {
      console.error('Delete comment error:', err);
    }
  };

  const handleVideoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedVideoFile(file);
      setCreateVideoPreview(URL.createObjectURL(file));
      setUploadError(null);
    }
  };

  const handlePublishPulse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVideoFile) {
      setUploadError('Please select a video file to upload.');
      return;
    }

    const userAuthor = user?.walletAddress || user?.id || account;
    if (!userAuthor) {
      setUploadError("Please sign in to upload content.");
      window.location.href = "/login";
      return;
    }

    try {
      setIsPublishing(true);
      setUploadError(null);
      audioHaptics.playSend();

      const formData = new FormData();
      formData.append('file', selectedVideoFile);
      formData.append('folder', 'reels');

      const uploadRes = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.url) {
        throw new Error(uploadData.error || 'Video storage upload failed');
      }
      const videoUrl = uploadData.url;

      const pulseRes = await fetch('/api/pulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorAddress: userAuthor,
          videoUrl,
          caption: createCaption,
          hashtags: createHashtags,
          category: selectedTrack?.category || 'General',
          audioTitle: selectedTrack ? selectedTrack.title : 'Original Sound',
          audioId: selectedTrack?.id || null,
          filterName: 'None',
        }),
      });

      const pulseData = await pulseRes.json();
      if (!pulseRes.ok) throw new Error(pulseData.error || 'Failed to save reel record in database');

      setIsCreateOpen(false);
      setSelectedVideoFile(null);
      setCreateVideoPreview(null);
      setCreateCaption('');
      setSelectedTrack(null);
      fetchPulses();
    } catch (err: any) {
      console.error("[Pulse Publish Error]:", err);
      setUploadError(err.message || 'Publishing failed. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="max-w-md mx-auto h-[86vh] sm:h-[88vh] flex flex-col relative select-none pb-12 animate-fadeIn">
      
      <GlassToast message={toastMessage || ""} isVisible={!!toastMessage} />

      {/* Music Picker Bottom Sheet */}
      <MusicPickerModal
        isOpen={isMusicPickerOpen}
        onClose={() => setIsMusicPickerOpen(false)}
        onSelectTrack={(track) => setSelectedTrack(track)}
        selectedTrackId={selectedTrack?.id}
      />

      {/* Top Header Floating Nav */}
      <div className="flex items-center justify-between px-3 py-2 z-30">
        <div className="flex items-center gap-3 font-black text-xs">
          <button
            onClick={() => setActiveTab('for_you')}
            className={`transition-all cursor-pointer btn-tactile ${
              activeTab === 'for_you' ? 'text-white border-b-2 border-[#00B7FF] pb-0.5' : 'text-slate-400'
            }`}
          >
            For You
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={`transition-all cursor-pointer btn-tactile ${
              activeTab === 'trending' ? 'text-white border-b-2 border-[#00B7FF] pb-0.5' : 'text-slate-400'
            }`}
          >
            Trending 🔥
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`transition-all cursor-pointer btn-tactile ${
              activeTab === 'following' ? 'text-white border-b-2 border-[#00B7FF] pb-0.5' : 'text-slate-400'
            }`}
          >
            Following
          </button>
        </div>

        {/* Upload Reel CTA */}
        <button
          onClick={() => {
            audioHaptics.playTap();
            setIsCreateOpen(true);
          }}
          className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 font-black text-xs flex items-center gap-1 shadow-md hover:opacity-90 cursor-pointer btn-tactile"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>Upload</span>
        </button>
      </div>

      {/* Main Full-Screen Reel Viewport */}
      <div className="flex-1 relative rounded-[32px] overflow-hidden bg-black border border-white/80 dark:border-white/10 shadow-2xl flex items-center justify-center">
        {currentPulse ? (
          <div className="relative w-full h-full" onDoubleClick={handleDoubleTap}>
            {/* Video Player */}
            <video
              ref={videoRef}
              src={currentPulse.videoUrl}
              loop
              playsInline
              muted={isMuted}
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-full h-full object-cover cursor-pointer"
            />

            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/85 pointer-events-none" />

            {/* Play/Pause Overlay Indicator */}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none z-20">
                <div className="p-4 rounded-full glass-dock text-white">
                  <Play className="w-8 h-8 fill-white translate-x-0.5" />
                </div>
              </div>
            )}

            {/* Double Tap Burst Animation */}
            {showHeartAnim && (
              <div
                className="absolute pointer-events-none z-40 transform -translate-x-1/2 -translate-y-1/2 animate-heart-pop"
                style={{ left: heartAnimPos.x, top: heartAnimPos.y }}
              >
                <Heart className="w-24 h-24 text-[#F45AA8] fill-current drop-shadow-2xl" />
              </div>
            )}

            {/* Top Controls: Mute & Speed */}
            <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSpeed();
                }}
                className="px-3 py-1 rounded-full glass-dock text-white font-mono text-xs font-black border border-white/20 hover:bg-black/50 transition cursor-pointer btn-tactile"
              >
                {playbackSpeed}x
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  audioHaptics.playTap();
                  setIsMuted(!isMuted);
                }}
                className="p-2 rounded-full glass-dock text-white border border-white/20 hover:bg-black/50 transition cursor-pointer btn-tactile"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-[#7EDBE8]" />}
              </button>
            </div>

            {/* Right Action Rail */}
            <div className="absolute right-3 bottom-12 z-30 flex flex-col items-center gap-4 text-white">
              {/* Likes */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLike();
                  }}
                  className="w-12 h-12 rounded-2xl glass-action-btn flex items-center justify-center cursor-pointer"
                >
                  <Heart className={`w-6 h-6 ${currentPulse.isLiked ? "fill-[#F45AA8] text-[#F45AA8]" : "stroke-[2]"}`} />
                </button>
                <span className="text-xs font-bold drop-shadow">{currentPulse.likeCount || 0}</span>
              </div>

              {/* Comments */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    audioHaptics.playTap();
                    setIsCommentOpen(true);
                  }}
                  className="w-12 h-12 rounded-2xl glass-action-btn flex items-center justify-center cursor-pointer"
                >
                  <MessageCircle className="w-6 h-6 stroke-[2]" />
                </button>
                <span className="text-xs font-bold drop-shadow">{currentPulse.commentCount || 0}</span>
              </div>

              {/* Save */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveToggle();
                  }}
                  className="w-12 h-12 rounded-2xl glass-action-btn flex items-center justify-center cursor-pointer"
                >
                  <Bookmark className={`w-6 h-6 ${currentPulse.isSaved ? "fill-[#00B7FF] text-[#00B7FF]" : "stroke-[2]"}`} />
                </button>
                <span className="text-xs font-bold drop-shadow">Save</span>
              </div>

              {/* Share */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare();
                  }}
                  className="w-12 h-12 rounded-2xl glass-action-btn flex items-center justify-center cursor-pointer"
                >
                  <Share2 className="w-6 h-6 stroke-[2]" />
                </button>
                <span className="text-xs font-bold drop-shadow">Share</span>
              </div>

              {/* Spinning Music Vinyl Disc */}
              <div className="w-10 h-10 rounded-full mt-1 border-2 border-white/60 overflow-hidden animate-[spin_4s_linear_infinite] shadow-lg">
                <img
                  src={currentPulse.author.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentPulse.authorAddress}`}
                  alt="Track"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Bottom Creator Info & Caption */}
            <div className="absolute inset-x-0 bottom-0 p-5 z-20 flex flex-col gap-2.5 text-white pointer-events-none">
              <div className="flex items-center gap-2.5 pointer-events-auto">
                <Link
                  href={`/profile/${currentPulse.authorAddress}`}
                  className="w-10 h-10 rounded-full overflow-hidden border border-white/60 shrink-0 shadow-sm"
                >
                  <img
                    src={currentPulse.author.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentPulse.authorAddress}`}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                </Link>

                <div className="flex flex-col">
                  <Link
                    href={`/profile/${currentPulse.authorAddress}`}
                    className="text-sm font-black flex items-center gap-1 hover:underline"
                  >
                    @{currentPulse.author.username}
                    <span className="w-3.5 h-3.5 rounded-full bg-[#00B7FF] text-slate-950 flex items-center justify-center">
                      <Check className="w-2 h-2 stroke-[3]" />
                    </span>
                  </Link>
                  <span className="text-[10px] text-slate-300 font-medium">Creator on Pulse</span>
                </div>
              </div>

              <p className="text-xs font-medium text-white/95 line-clamp-2 drop-shadow max-w-[80%] pointer-events-auto leading-relaxed">
                {currentPulse.caption}
              </p>

              {/* Audio Pill */}
              <div className="flex items-center gap-2 glass-dock px-3 py-1.5 rounded-full w-max cursor-pointer hover:bg-black/60 transition pointer-events-auto">
                <Music className="w-3.5 h-3.5 text-[#00B7FF] animate-pulse" />
                <span className="text-[11px] font-bold text-white/95 truncate max-w-[160px]">
                  {currentPulse.audioTitle || "Original Sound"}
                </span>
              </div>
            </div>

            {/* Bottom Progress Bar */}
            <div className="absolute bottom-0 left-0 w-full h-[2.5px] bg-white/20 z-30">
              <div className="h-full bg-[#00B7FF] w-1/3 rounded-r-full" />
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-white space-y-3">
            <Film className="w-10 h-10 mx-auto text-slate-400" />
            <p className="text-sm font-black">No reels in this category yet</p>
          </div>
        )}
      </div>

      {/* Vertical Navigation Arrows */}
      <div className="flex items-center justify-between px-2 pt-2 text-xs font-black text-slate-400">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl glass-pill disabled:opacity-30 cursor-pointer btn-tactile"
        >
          <ChevronUp className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <span className="font-mono text-[10px] text-slate-500">
          {pulses.length > 0 ? `${currentIndex + 1} / ${pulses.length}` : '0 / 0'}
        </span>

        <button
          onClick={handleNext}
          disabled={currentIndex >= pulses.length - 1}
          className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl glass-pill disabled:opacity-30 cursor-pointer btn-tactile"
        >
          <span>Next</span>
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* COMMENTS MODAL */}
      <GlassModal
        isOpen={isCommentOpen}
        onClose={() => setIsCommentOpen(false)}
        title={
          <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
            <MessageCircle className="w-4 h-4 text-[#00B7FF]" />
            <span>Comments ({currentPulse?.commentCount || 0})</span>
          </div>
        }
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-64 hide-scrollbar pr-1">
            {isLoadingComments ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading comments...</div>
            ) : comments.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No comments yet.</div>
            ) : (
              comments.map((c) => {
                const isMyComment = account && c.authorAddress?.toLowerCase() === account.toLowerCase();
                return (
                  <div key={c.id} className="flex items-start justify-between gap-2 p-2.5 rounded-2xl glass-panel group/c">
                    <div className="flex items-start gap-2.5">
                      <img
                        src={c.authorProfile?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${c.authorAddress}`}
                        alt="avatar"
                        className="w-7 h-7 rounded-full object-cover bg-slate-950 mt-0.5"
                      />
                      <div>
                        <p className="font-black text-xs text-[#00B7FF]">{c.authorProfile?.displayName || `User ${c.authorAddress?.slice(0, 6)}`}</p>
                        <p className="text-xs text-slate-800 dark:text-slate-200 font-medium">{c.content}</p>
                      </div>
                    </div>
                    {isMyComment && (
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="text-slate-400 hover:text-rose-400 p-1 opacity-0 group-hover/c:opacity-100 transition-opacity cursor-pointer"
                        title="Delete comment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleAddComment} className="flex gap-2 pt-2 border-t border-slate-200/60 dark:border-white/10">
            <input
              type="text"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 p-2.5 rounded-xl glass-input text-xs text-slate-900 dark:text-white outline-none focus:border-[#00B7FF]"
            />
            <button
              type="submit"
              disabled={isSubmittingComment || !newCommentText.trim()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer disabled:opacity-40 btn-tactile"
            >
              {isSubmittingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </form>
        </div>
      </GlassModal>

      {/* CREATE REEL MODAL */}
      <GlassModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={
          <div className="flex items-center gap-2 text-[#00B7FF] font-black text-sm">
            <Film className="w-4 h-4" />
            <span>Upload New Reel</span>
          </div>
        }
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          {uploadError && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 font-bold text-xs">
              {uploadError}
            </div>
          )}

          <form onSubmit={handlePublishPulse} className="space-y-3">
            <input
              type="file"
              ref={fileInputRef}
              accept="video/mp4,video/quicktime,video/webm"
              onChange={handleVideoFileSelect}
              className="hidden"
            />

            {createVideoPreview ? (
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 max-h-56 flex items-center justify-center border border-white/60">
                <video src={createVideoPreview} controls autoPlay loop className="w-full h-full max-h-56 object-contain" />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedVideoFile(null);
                    setCreateVideoPreview(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-rose-500 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#00B7FF] rounded-2xl p-6 text-center cursor-pointer transition-colors glass-panel flex flex-col items-center justify-center btn-tactile"
              >
                <Film className="w-8 h-8 text-[#00B7FF] mb-2 animate-bounce" />
                <span className="text-xs font-black text-slate-900 dark:text-white">Choose Video (MP4, MOV)</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Short vertical format recommended</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Caption</label>
              <textarea
                rows={2}
                value={createCaption}
                onChange={(e) => setCreateCaption(e.target.value)}
                placeholder="What's happening in this video? #trending #pulse"
                className="w-full p-2.5 rounded-xl glass-input text-xs text-slate-900 dark:text-white outline-none"
                required
              />
            </div>

            {/* Select Music Track */}
            <button
              type="button"
              onClick={() => setIsMusicPickerOpen(true)}
              className={`w-full p-2.5 rounded-2xl border flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                selectedTrack
                  ? "bg-cyan-500/15 border-[#00B7FF] text-[#00B7FF]"
                  : "glass-panel text-slate-700 dark:text-slate-300 hover:border-[#00B7FF]"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Music className="w-4 h-4 text-[#00B7FF] shrink-0" />
                <span className="truncate">{selectedTrack ? selectedTrack.title : "Add Music Track"}</span>
              </div>
              <span className="text-[10px] text-cyan-500 font-mono shrink-0">{selectedTrack ? "Change" : "+ Select"}</span>
            </button>

            <button
              type="submit"
              disabled={isPublishing}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#00B7FF] via-[#7EDBE8] to-[#F45AA8] text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-glass hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-50 btn-tactile"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Uploading Reel...</span>
                </>
              ) : (
                <span>Publish Reel 🚀</span>
              )}
            </button>
          </form>
        </div>
      </GlassModal>
    </div>
  );
}
