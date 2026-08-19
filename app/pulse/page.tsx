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
  Folder,
  Send,
  Loader2,
  Check,
  Film,
  Trash2,
  Sliders,
  FastForward,
  AlertTriangle
} from 'lucide-react';
import { audioHaptics } from '../../lib/audioHaptics';
import { MusicPickerModal, SelectedTrack } from '../../components/MusicPickerModal';
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
  const { account } = useAuth();
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
  const [isSaveOpen, setIsSaveOpen] = useState(false);
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
  const [createHashtags, setCreateHashtags] = useState('#Reels #Aura');
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

    try {
      setIsPublishing(true);
      setUploadError(null);
      audioHaptics.playSend();

      const formData = new FormData();
      formData.append('file', selectedVideoFile);

      const uploadRes = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) throw new Error('Video storage upload failed');
      const uploadData = await uploadRes.json();
      const videoUrl = uploadData.url;

      const userAuthor = account || '0x7a250d5630b4cf539739df2c5dacb4c659f2488d';

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

      if (!pulseRes.ok) throw new Error('Failed to save reel record');

      setIsCreateOpen(false);
      setSelectedVideoFile(null);
      setCreateVideoPreview(null);
      setCreateCaption('');
      setSelectedTrack(null);
      fetchPulses();
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Publishing failed. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="max-w-md mx-auto h-[85vh] sm:h-[88vh] flex flex-col relative select-none pb-12">
      
      {/* Music Picker Bottom Sheet */}
      <MusicPickerModal
        isOpen={isMusicPickerOpen}
        onClose={() => setIsMusicPickerOpen(false)}
        onSelectTrack={(track) => setSelectedTrack(track)}
        selectedTrackId={selectedTrack?.id}
      />

      {/* Top Header Floating Nav */}
      <div className="flex items-center justify-between px-3 py-2 z-30">
        <div className="flex items-center gap-3 font-extrabold text-xs">
          <button
            onClick={() => setActiveTab('for_you')}
            className={`transition-colors cursor-pointer ${
              activeTab === 'for_you' ? 'text-white border-b-2 border-[#00B7FF] pb-0.5' : 'text-slate-400'
            }`}
          >
            For You
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={`transition-colors cursor-pointer ${
              activeTab === 'trending' ? 'text-white border-b-2 border-[#00B7FF] pb-0.5' : 'text-slate-400'
            }`}
          >
            Trending 🔥
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`transition-colors cursor-pointer ${
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
          className="px-3 py-1.5 rounded-full bg-[#00B7FF] text-slate-950 font-black text-xs flex items-center gap-1 shadow-md hover:opacity-90 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>Upload</span>
        </button>
      </div>

      {/* Main Full-Screen Reel Viewport */}
      <div className="flex-1 relative rounded-[32px] overflow-hidden bg-black border border-slate-800 shadow-2xl flex items-center justify-center">
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

            {/* Play/Pause Overlay Indicator */}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none z-20">
                <div className="p-4 rounded-full bg-black/60 backdrop-blur-md text-white">
                  <Play className="w-8 h-8 fill-white translate-x-0.5" />
                </div>
              </div>
            )}

            {/* Double Tap Burst Animation */}
            {showHeartAnim && (
              <div
                className="absolute pointer-events-none z-40 transform -translate-x-1/2 -translate-y-1/2 animate-heart-burst"
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
                className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-white font-mono text-[11px] font-extrabold border border-white/10 hover:bg-black/60"
              >
                {playbackSpeed}x
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted(!isMuted);
                }}
                className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>

            {/* Right Action Rail */}
            <div className="absolute right-3 bottom-14 z-30 flex flex-col items-center gap-4">
              
              {/* Author DP */}
              <Link href={`/profile/${currentPulse.authorAddress}`} onClick={(e) => e.stopPropagation()}>
                <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-[#00B7FF] to-purple-600 shadow-md">
                  <img
                    src={currentPulse.author.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentPulse.authorAddress}`}
                    alt="avatar"
                    className="w-full h-full rounded-full object-cover bg-slate-900"
                  />
                </div>
              </Link>

              {/* Like */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLike();
                }}
                className="flex flex-col items-center gap-0.5 cursor-pointer"
              >
                <div className={`p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white ${currentPulse.isLiked ? 'text-rose-500' : ''}`}>
                  <Heart className={`w-5 h-5 ${currentPulse.isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                </div>
                <span className="text-[10px] font-black text-white">{currentPulse.likeCount || 0}</span>
              </button>

              {/* Comment */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCommentOpen(true);
                }}
                className="flex flex-col items-center gap-0.5 cursor-pointer"
              >
                <div className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white hover:text-cyan-400">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black text-white">{currentPulse.commentCount || 0}</span>
              </button>

              {/* Save */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveToggle();
                }}
                className="flex flex-col items-center gap-0.5 cursor-pointer"
              >
                <div className={`p-2.5 rounded-full bg-black/40 backdrop-blur-md ${currentPulse.isSaved ? 'text-cyan-400' : 'text-white'}`}>
                  <Bookmark className={`w-5 h-5 ${currentPulse.isSaved ? 'fill-cyan-400' : ''}`} />
                </div>
                <span className="text-[10px] font-black text-white">{currentPulse.saveCount || 0}</span>
              </button>

              {/* Owner Delete Option */}
              {isOwnCurrentPulse && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteModal(true);
                  }}
                  className="flex flex-col items-center gap-0.5 cursor-pointer text-rose-400 hover:text-rose-500"
                  title="Delete reel"
                >
                  <div className="p-2.5 rounded-full bg-rose-500/20 backdrop-blur-md text-rose-400">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-bold">Delete</span>
                </button>
              )}
            </div>

            {/* Bottom Meta Overlay */}
            <div className="absolute left-3 right-16 bottom-3 z-30 space-y-1.5 text-left bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 rounded-2xl">
              <Link
                href={`/profile/${currentPulse.authorAddress}`}
                onClick={(e) => e.stopPropagation()}
                className="font-black text-xs text-white hover:underline block"
              >
                @{currentPulse.author.username}
              </Link>
              
              <p className="text-xs text-slate-200 font-semibold leading-snug">
                {currentPulse.caption}{' '}
                <span className="text-[#00B7FF]">{currentPulse.hashtags}</span>
              </p>

              {/* Audio badge */}
              <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 font-bold">
                <Music className="w-3 h-3 animate-spin" />
                <span className="truncate max-w-[180px]">{currentPulse.audioTitle || 'Original Audio'}</span>
              </div>
            </div>

          </div>
        ) : (
          <div className="text-center p-8 space-y-3">
            <Film className="w-12 h-12 text-[#00B7FF] mx-auto" />
            <h3 className="text-sm font-bold text-white">No Reels in this feed</h3>
            <p className="text-xs text-slate-400">Be the first creator to upload a short video!</p>
          </div>
        )}
      </div>

      {/* Vertical Navigation Arrows */}
      <div className="flex items-center justify-between px-2 pt-2 text-xs font-bold text-slate-400">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 disabled:opacity-30 cursor-pointer"
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
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 disabled:opacity-30 cursor-pointer"
        >
          <span>Next</span>
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* COMMENTS DRAWER */}
      {isCommentOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-[#131b2e] rounded-t-[32px] sm:rounded-[32px] border border-slate-800 p-5 space-y-4 max-h-[75vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#00B7FF]" />
                <span>Comments ({currentPulse?.commentCount || 0})</span>
              </h3>
              <button onClick={() => setIsCommentOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-64 no-scrollbar pr-1">
              {isLoadingComments ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading comments...</div>
              ) : comments.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No comments yet.</div>
              ) : (
                comments.map((c) => {
                  const isMyComment = account && c.authorAddress?.toLowerCase() === account.toLowerCase();
                  return (
                    <div key={c.id} className="flex items-start justify-between gap-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800/60 group/c">
                      <div className="flex items-start gap-2.5">
                        <img
                          src={c.authorProfile?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${c.authorAddress}`}
                          alt="avatar"
                          className="w-7 h-7 rounded-full object-cover bg-slate-950 mt-0.5"
                        />
                        <div>
                          <p className="font-bold text-xs text-[#00B7FF]">{c.authorProfile?.displayName || `User ${c.authorAddress?.slice(0, 6)}`}</p>
                          <p className="text-xs text-slate-200">{c.content}</p>
                        </div>
                      </div>
                      {isMyComment && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 opacity-0 group-hover/c:opacity-100 transition-opacity cursor-pointer"
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

            <form onSubmit={handleAddComment} className="flex gap-2 pt-2 border-t border-slate-800">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-[#00B7FF]"
              />
              <button
                type="submit"
                disabled={isSubmittingComment || !newCommentText.trim()}
                className="px-4 py-2.5 rounded-xl bg-[#00B7FF] text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                {isSubmittingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CREATE REEL MODAL WITH MUSIC PICKER */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-[#131b2e] border border-slate-800 p-6 text-left space-y-4 text-xs text-white relative shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-[#00B7FF] font-black text-sm">
                <Film className="w-5 h-5" />
                <span>Upload New Reel</span>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold text-xs">
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
                <div className="relative rounded-2xl overflow-hidden bg-slate-950 max-h-56 flex items-center justify-center border border-slate-800">
                  <video src={createVideoPreview} controls autoPlay loop className="w-full h-full max-h-56 object-contain" />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVideoFile(null);
                      setCreateVideoPreview(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-rose-500 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-[#00B7FF] rounded-2xl p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center"
                >
                  <Upload className="w-8 h-8 text-[#00B7FF] mb-2 animate-bounce" />
                  <span className="font-extrabold text-white">Select Video File</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">MP4 or WebM video</span>
                </div>
              )}

              {/* Music Selection Button */}
              <button
                type="button"
                onClick={() => setIsMusicPickerOpen(true)}
                className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                  selectedTrack
                    ? "bg-cyan-500/15 border-[#00B7FF] text-[#00B7FF]"
                    : "bg-slate-900 border-slate-800 text-slate-300 hover:border-[#00B7FF]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-[#00B7FF]" />
                  <span>{selectedTrack ? `${selectedTrack.title} (${selectedTrack.artist})` : "Add Bollywood / Regional Music"}</span>
                </div>
                <span className="text-[10px] text-cyan-400 font-mono">{selectedTrack ? "Change" : "+ Select"}</span>
              </button>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Caption</label>
                <textarea
                  value={createCaption}
                  onChange={(e) => setCreateCaption(e.target.value)}
                  rows={2}
                  placeholder="Tell your viewers about this reel..."
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-[#00B7FF]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Hashtags</label>
                <input
                  type="text"
                  value={createHashtags}
                  onChange={(e) => setCreateHashtags(e.target.value)}
                  placeholder="#Reels #Aura #Trending"
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-[#00B7FF]"
                />
              </div>

              <button
                type="submit"
                disabled={isPublishing}
                className="w-full py-3 rounded-xl bg-[#00B7FF] text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Publishing Reel...</span>
                  </>
                ) : (
                  <span>Publish Reel 🚀</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE REEL MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in select-none">
          <div className="w-full max-w-sm rounded-3xl bg-[#131b2e] border border-slate-800 p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="font-extrabold text-sm text-white">Delete this reel?</h4>
              <p className="text-xs text-slate-400">
                This will permanently delete this reel video and its comments from the database.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-400 font-bold text-xs hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteReel}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white font-extrabold text-xs hover:bg-rose-600 transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Delete</span>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
