"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../lib/authContext';
import { 
  Grid, 
  MoreVertical, 
  ArrowLeft, 
  Copy, 
  Check, 
  Heart, 
  MessageCircle, 
  PlayCircle, 
  Bookmark, 
  Plus, 
  Image as ImageIcon, 
  Loader2, 
  X, 
  UploadCloud, 
  Film,
  Briefcase,
  Settings
} from 'lucide-react';
import { audioHaptics } from '../../lib/audioHaptics';
import { ProfileHeader } from '../../components/ProfileHeader';
import { GlassModal } from '../../components/ui/GlassModal';
import { GlassLoader } from '../../components/ui/GlassLoader';
import { resolveMediaUrl, handleImageFallback } from '../../lib/mediaHelper';

interface ProfileData {
  id: string;
  username: string;
  displayName: string;
  nickname?: string;
  bio: string;
  avatarUrl: string;
  bannerUrl: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const { account } = useAuth();

  const addressParam = params?.address as string | undefined;
  const targetAddress = addressParam?.toLowerCase() || account?.toLowerCase();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState({
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
  });

  const [activeTab, setActiveTab] = useState<'posts' | 'reels' | 'saved'>('posts');
  const [loading, setLoading] = useState(true);

  // Lists of posts & reels & saved
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [userReels, setUserReels] = useState<any[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [savedReels, setSavedReels] = useState<any[]>([]);

  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // Direct Create Post / Reel Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createContentType, setCreateContentType] = useState<'post' | 'reel'>('post');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProfileDetails = useCallback(async () => {
    if (!targetAddress) return;
    try {
      setLoading(true);
      // 1. Fetch Profile Info & stats
      const res = await fetch(`/api/profile?walletAddress=${targetAddress}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        if (data.stats) {
          setStats(data.stats);
        }
      }

      // 2. Fetch User's standard posts
      const postsRes = await fetch(`/api/posts?authorAddress=${targetAddress}`);
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setUserPosts(postsData.posts || []);
      }

      // 3. Fetch User's short videos (reels)
      const reelsRes = await fetch(`/api/pulse?authorAddress=${targetAddress}`);
      if (reelsRes.ok) {
        const reelsData = await reelsRes.json();
        setUserReels(reelsData.pulses || []);
      }

      // 4. If own profile, fetch saved posts and reels
      if (account && account.toLowerCase() === targetAddress.toLowerCase()) {
        const savedRes = await fetch(`/api/saved?userAddress=${account}`);
        if (savedRes.ok) {
          const savedData = await savedRes.json();
          setSavedPosts(savedData.savedPosts || []);
          setSavedReels(savedData.savedReels || []);
        }
      }
    } catch (e) {
      console.error("Failed to fetch profile details:", e);
    } finally {
      setLoading(false);
    }
  }, [targetAddress, account]);

  useEffect(() => {
    fetchProfileDetails();
  }, [fetchProfileDetails]);

  // Clean up object URL when modal closes or file changes
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const isVideo = file.type.startsWith('video/');

      if (isVideo) {
        setCreateContentType('reel');
      } else {
        setCreateContentType('post');
      }

      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handlePublishContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError("Please select an image or video file.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      audioHaptics.playSend();
      const formData = new FormData();
      formData.append("file", selectedFile);

      const uploadRes = await fetch("/api/storage/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json();
        throw new Error(errData.error || "Failed to upload media file.");
      }

      const uploadData = await uploadRes.json();
      const mediaUrl = uploadData.url;
      const authorAddr = account || targetAddress || '';

      if (createContentType === 'reel') {
        const pulseRes = await fetch("/api/pulse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            authorAddress: authorAddr,
            videoUrl: mediaUrl,
            caption,
            hashtags: caption.match(/#[a-zA-Z0-9_]+/g)?.join(" ") || "#Pulse #Reels",
            category: "General",
            audioTitle: "Original Sound",
            privacy: "Everyone"
          }),
        });

        if (!pulseRes.ok) throw new Error("Failed to save Reel to database.");
      } else {
        const postRes = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            authorAddress: authorAddr,
            caption,
            mediaUrl,
            mediaType: "image",
            location,
            privacy: "public",
          }),
        });

        if (!postRes.ok) throw new Error("Failed to save Post to database.");
      }

      await fetchProfileDetails();
      setIsCreateModalOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setCaption("");
      setLocation("");
    } catch (err: any) {
      console.error("Publish error:", err);
      setUploadError(err.message || "Failed to publish content.");
    } finally {
      setIsUploading(false);
    }
  };

  const isOwnProfile = !addressParam || addressParam.toLowerCase() === account?.toLowerCase();

  return (
    <div className="max-w-2xl mx-auto space-y-4 text-left pb-10 select-none animate-fadeIn">
      
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-1 py-1">
        <button
          onClick={() => {
            audioHaptics.playNav();
            router.back();
          }}
          className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-sm hover:opacity-85 transition-opacity btn-tactile cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.8]" />
          <span>{isOwnProfile ? "My Profile" : "Creator Profile"}</span>
        </button>

        <div className="flex items-center gap-2">
          {isOwnProfile && (
            <button
              onClick={() => {
                audioHaptics.playTap();
                setIsCreateModalOpen(true);
              }}
              className="p-2 rounded-full glass-panel text-[#00B7FF] dark:text-[#7EDBE8] font-black text-xs flex items-center gap-1.5 px-3 btn-tactile shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Create</span>
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => {
                audioHaptics.playTap();
                setIsOptionsMenuOpen(!isOptionsMenuOpen);
              }}
              className="p-2 rounded-full glass-pill hover:bg-white/60 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors btn-tactile cursor-pointer"
              title="Profile Options"
            >
              <MoreVertical className="w-5 h-5 stroke-[2.5]" />
            </button>

            {isOptionsMenuOpen && (
              <div className="absolute right-0 top-10 z-40 w-52 rounded-2xl glass-panel border border-slate-200 dark:border-slate-800 shadow-2xl p-1.5 space-y-1 animate-in zoom-in-95 text-xs font-bold">
                <Link
                  href="/hiring"
                  onClick={() => setIsOptionsMenuOpen(false)}
                  className="w-full px-3 py-2.5 rounded-xl text-left flex items-center gap-2.5 text-[#00B7FF] hover:bg-cyan-500/10 transition-colors cursor-pointer"
                >
                  <Briefcase className="w-4 h-4" />
                  <span>Hiring / Promotion</span>
                </Link>

                <Link
                  href="/settings"
                  onClick={() => setIsOptionsMenuOpen(false)}
                  className="w-full px-3 py-2.5 rounded-xl text-left flex items-center gap-2.5 text-slate-700 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings & Preferences</span>
                </Link>

                <button
                  onClick={() => {
                    const url = typeof window !== "undefined" ? window.location.href : "";
                    navigator.clipboard.writeText(url);
                    setCopiedLink(true);
                    setTimeout(() => {
                      setCopiedLink(false);
                      setIsOptionsMenuOpen(false);
                    }, 1500);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl text-left flex items-center gap-2.5 text-slate-700 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? "Link Copied!" : "Copy Profile Link"}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-12 space-y-4">
          <GlassLoader count={1} type="feed" />
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* Header Card with Profile Info */}
          <ProfileHeader
            user={{
              walletAddress: targetAddress || '',
              profile: profile || undefined,
            }}
            stats={stats}
            onProfileUpdated={fetchProfileDetails}
          />

          {/* Sub Navigation Tabs (Posts | Reels | Saved) */}
          <div className="flex items-center glass-panel p-1 rounded-full text-xs font-black select-none mb-4">
            <button
              onClick={() => {
                audioHaptics.playTap();
                setActiveTab('posts');
              }}
              className={`flex-1 py-2.5 rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer btn-tactile ${
                activeTab === 'posts'
                  ? "bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 shadow-md shadow-cyan-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white"
              }`}
            >
              <Grid className="w-4 h-4" />
              <span>Posts ({userPosts.length})</span>
            </button>

            <button
              onClick={() => {
                audioHaptics.playTap();
                setActiveTab('reels');
              }}
              className={`flex-1 py-2.5 rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer btn-tactile ${
                activeTab === 'reels'
                  ? "bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 shadow-md shadow-cyan-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white"
              }`}
            >
              <PlayCircle className="w-4 h-4" />
              <span>Reels ({userReels.length})</span>
            </button>

            {isOwnProfile && (
              <button
                onClick={() => {
                  audioHaptics.playTap();
                  setActiveTab('saved');
                }}
                className={`flex-1 py-2.5 rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer btn-tactile ${
                  activeTab === 'saved'
                    ? "bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 shadow-md shadow-cyan-500/20"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white"
                }`}
              >
                <Bookmark className="w-4 h-4" />
                <span>Saved ({savedPosts.length + savedReels.length})</span>
              </button>
            )}
          </div>

          {/* Grid lists based on active tab */}
          <div className="min-h-60">
            {/* A. POSTS GRID */}
            {activeTab === 'posts' && (
              userPosts.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {userPosts.map((post) => (
                    <div 
                      key={post.id} 
                      onClick={() => {
                        audioHaptics.playTap();
                        router.push(`/post/${post.id}`);
                      }}
                      className="aspect-square rounded-[24px] overflow-hidden glass-card border border-white/70 dark:border-white/10 cursor-pointer relative group shadow-sm"
                    >
                      <img 
                        src={resolveMediaUrl(post.mediaUrl)} 
                        alt="Post image" 
                        onError={(e) => handleImageFallback(e, 'post')}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 text-white text-xs font-bold">
                        <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 fill-white" /> {post.likeCount || 0}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5 fill-white" /> {post.commentCount || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-14 text-center text-xs font-bold text-slate-400 flex flex-col items-center gap-3 glass-card rounded-[32px] p-6">
                  <div className="w-12 h-12 rounded-2xl glass-panel flex items-center justify-center text-[#00B7FF]">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <span>No posts published yet.</span>
                  {isOwnProfile && (
                    <button
                      onClick={() => {
                        audioHaptics.playTap();
                        setCreateContentType('post');
                        setIsCreateModalOpen(true);
                      }}
                      className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md btn-tactile"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Upload Your First Post</span>
                    </button>
                  )}
                </div>
              )
            )}

            {/* B. REELS GRID */}
            {activeTab === 'reels' && (
              userReels.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {userReels.map((reel) => (
                    <div 
                      key={reel.id} 
                      onClick={() => {
                        audioHaptics.playTap();
                        router.push(`/pulse?id=${reel.id}`);
                      }}
                      className="aspect-[9/14] rounded-[24px] overflow-hidden bg-slate-950 border border-white/70 dark:border-white/10 cursor-pointer hover:opacity-90 transition-opacity relative group shadow-sm"
                    >
                      <video 
                        src={reel.videoUrl} 
                        muted 
                        playsInline 
                        className="w-full h-full object-cover" 
                      />
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[9px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
                        <Heart className="w-2.5 h-2.5 text-rose-500 fill-rose-500" /> {reel.likeCount || 0}
                      </div>
                      <div className="absolute top-2 right-2 text-white opacity-80 group-hover:opacity-100">
                        <PlayCircle className="w-4 h-4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-14 text-center text-xs font-bold text-slate-400 flex flex-col items-center gap-3 glass-card rounded-[32px] p-6">
                  <div className="w-12 h-12 rounded-2xl glass-panel flex items-center justify-center text-[#9B6CFF]">
                    <Film className="w-6 h-6" />
                  </div>
                  <span>No Reels published yet.</span>
                  {isOwnProfile && (
                    <button
                      onClick={() => {
                        audioHaptics.playTap();
                        setCreateContentType('reel');
                        setIsCreateModalOpen(true);
                      }}
                      className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#9B6CFF] to-[#F45AA8] text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md btn-tactile"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Create Your First Reel</span>
                    </button>
                  )}
                </div>
              )
            )}

            {/* C. SAVED ITEMS */}
            {activeTab === 'saved' && (
              savedPosts.length > 0 || savedReels.length > 0 ? (
                <div className="space-y-4">
                  {savedPosts.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Saved Posts</h4>
                      <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        {savedPosts.map((post) => (
                          <div 
                            key={post.id} 
                            onClick={() => {
                              audioHaptics.playTap();
                              router.push(`/post/${post.id}`);
                            }}
                            className="aspect-square rounded-[24px] overflow-hidden glass-card border border-white/70 dark:border-white/10 cursor-pointer hover:opacity-90 transition-all relative group shadow-sm"
                          >
                            <img 
                              src={post.mediaUrl} 
                              alt="Saved post" 
                              className="w-full h-full object-cover" 
                            />
                            <div className="absolute top-2 right-2 text-cyan-400">
                              <Bookmark className="w-4 h-4 fill-current" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {savedReels.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Saved Reels</h4>
                      <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        {savedReels.map((reel) => (
                          <div 
                            key={reel.id} 
                            onClick={() => {
                              audioHaptics.playTap();
                              router.push(`/pulse?id=${reel.id}`);
                            }}
                            className="aspect-[9/14] rounded-[24px] overflow-hidden bg-slate-950 border border-white/70 dark:border-white/10 cursor-pointer hover:opacity-90 transition-opacity relative group shadow-sm"
                          >
                            <video 
                              src={reel.videoUrl} 
                              muted 
                              playsInline 
                              className="w-full h-full object-cover" 
                            />
                            <div className="absolute top-2 right-2 text-cyan-400">
                              <Bookmark className="w-4 h-4 fill-current" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-14 text-center text-xs font-bold text-slate-400 flex flex-col items-center gap-3 glass-card rounded-[32px] p-6">
                  <div className="w-12 h-12 rounded-2xl glass-panel flex items-center justify-center text-slate-500">
                    <Bookmark className="w-6 h-6" />
                  </div>
                  <span>No saved posts or reels yet.</span>
                </div>
              )
            )}

          </div>

        </div>
      )}

      {/* QUICK CREATE MODAL */}
      <GlassModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedFile(null);
          setPreviewUrl(null);
        }}
        title={createContentType === 'post' ? 'Create New Post' : 'Create New Reel'}
        maxWidth="lg"
      >
        <div className="space-y-4">
          {/* Type Switcher */}
          <div className="flex glass-panel p-1 rounded-full text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                audioHaptics.playTap();
                setCreateContentType('post');
                if (selectedFile?.type.startsWith('video/')) {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }
              }}
              className={`flex-1 py-2 rounded-full transition-all flex items-center justify-center gap-1.5 btn-tactile cursor-pointer ${
                createContentType === 'post' ? 'bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 shadow-sm font-black' : 'text-slate-400'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Photo Post</span>
            </button>

            <button
              type="button"
              onClick={() => {
                audioHaptics.playTap();
                setCreateContentType('reel');
              }}
              className={`flex-1 py-2 rounded-full transition-all flex items-center justify-center gap-1.5 btn-tactile cursor-pointer ${
                createContentType === 'reel' ? 'bg-gradient-to-r from-[#9B6CFF] to-[#F45AA8] text-white shadow-sm font-black' : 'text-slate-400'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Short Reel</span>
            </button>
          </div>

          {/* Error Message */}
          {uploadError && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold">
              {uploadError}
            </div>
          )}

          <form onSubmit={handlePublishContent} className="space-y-4">
            {/* Media Picker / Preview Box */}
            <div className="space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                accept={createContentType === 'post' ? 'image/png,image/jpeg,image/jpg,image/webp' : 'video/mp4,video/quicktime,video/webm,image/*'}
                onChange={handleFileChange}
                className="hidden"
              />

              {previewUrl ? (
                <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-white/60 flex items-center justify-center max-h-64 shadow-inner">
                  {createContentType === 'reel' || selectedFile?.type.startsWith('video/') ? (
                    <video
                      src={previewUrl}
                      controls
                      autoPlay
                      muted
                      loop
                      className="w-full h-full max-h-64 object-contain"
                    />
                  ) : (
                    <img
                      src={previewUrl}
                      alt="Selected Preview"
                      className="w-full h-full max-h-64 object-contain"
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      audioHaptics.playTap();
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-rose-500 transition-colors btn-tactile cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#00B7FF] rounded-2xl p-8 text-center cursor-pointer transition-colors glass-panel flex flex-col items-center justify-center btn-tactile"
                >
                  <UploadCloud className="w-10 h-10 text-[#00B7FF] mb-2 animate-bounce" />
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    {createContentType === 'post' ? 'Select Photo (JPG, PNG, WEBP)' : 'Select Video (MP4, MOV)'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">Click to browse your device files</span>
                </div>
              )}
            </div>

            {/* Caption Input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Caption</label>
              <textarea
                rows={2}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder={createContentType === 'post' ? "Write a caption for your post... #art #photography" : "Reel description & trending hashtags... #reels #trending"}
                className="w-full p-3 rounded-2xl glass-input text-slate-900 dark:text-white text-xs outline-none font-semibold"
                required
              />
            </div>

            {/* Location Input (for Posts) */}
            {createContentType === 'post' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Location (Optional)</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Mumbai, India"
                  className="w-full p-2.5 rounded-2xl glass-input text-slate-900 dark:text-white text-xs outline-none"
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isUploading}
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#00B7FF] via-[#7EDBE8] to-[#F45AA8] text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-glass hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-50 btn-tactile"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Saving to Database...</span>
                </>
              ) : (
                <span>{createContentType === 'post' ? 'Publish Post 🚀' : 'Upload Reel 🎬'}</span>
              )}
            </button>
          </form>
        </div>
      </GlassModal>
    </div>
  );
}
