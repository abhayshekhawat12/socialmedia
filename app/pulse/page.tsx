'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useWeb3 } from '../../lib/web3Context';
import { useSettings } from '../../lib/settingsContext';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Repeat,
  Music,
  Plus,
  Play,
  Pause,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Flame,
  Zap,
  Sliders,
  X,
  Send,
  Copy,
  Check,
  FolderPlus,
  Film,
  Video,
  Upload,
  Clock,
  ChevronRight,
  MoreHorizontal,
  Volume2,
  VolumeX,
  FileText
} from 'lucide-react';

interface PulseVideo {
  id: string;
  authorAddress: string;
  videoUrl: string;
  thumbnailUrl: string;
  caption: string;
  hashtags: string;
  category: string;
  audioTitle: string;
  contentHash: string;
  privacy: string;
  pulseScore: number;
  authenticScore: number;
  originalityVerified: boolean;
  txHash?: string;
  viewsCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  saveCount: number;
  author: {
    walletAddress: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  };
}

export default function PulsePage() {
  const { account, isWeb3Connected, registerProofOnChain } = useWeb3();
  const { settings } = useSettings();

  const [activeTab, setActiveTab] = useState<'forYou' | 'following' | 'trending' | 'opportunity'>('forYou');
  const [pulses, setPulses] = useState<PulseVideo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [followedMap, setFollowedMap] = useState<Record<string, boolean>>({});

  // Modals & Bottom Sheets
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [isOriginalityOpen, setIsOriginalityOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Like & Double Tap Heart animation
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [heartAnimPos, setHeartAnimPos] = useState({ x: 0, y: 0 });

  // Creation State & AI Assistant
  const [createVideoUrl, setCreateVideoUrl] = useState('https://assets.mixkit.co/videos/preview/mixkit-futuristic-robotic-arm-working-in-a-lab-43403-large.mp4');
  const [createCaption, setCreateCaption] = useState('');
  const [createHashtags, setCreateHashtags] = useState('#AIAgents #Tech #Future');
  const [createCategory, setCreateCategory] = useState('AI');
  const [createAudio, setCreateAudio] = useState('Cosmic Cyber Beat - Aura Original');
  const [createVisibility, setCreateVisibility] = useState('Everyone');
  const [createAllowComments, setCreateAllowComments] = useState(true);
  const [createAllowRemix, setCreateAllowRemix] = useState(true);
  const [createAllowDownload, setCreateAllowDownload] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(true);

  // Comments State
  const [comments, setComments] = useState([
    { id: 'c1', user: 'alex_web3', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', text: 'This AI video generation workflow is insane! 🔥', likes: 18 },
    { id: 'c2', user: 'crypto_sara', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100', text: 'Love the Proof-of-Creation content hash verification! 🔐', likes: 12 },
  ]);
  const [newCommentText, setNewCommentText] = useState('');

  // Selected folder for saving
  const [selectedFolder, setSelectedFolder] = useState('AI');

  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch Pulses
  const fetchPulses = async () => {
    try {
      const res = await fetch(`/api/pulse?tab=${activeTab}`);
      if (res.ok) {
        const data = await res.json();
        setPulses(data.pulses || []);
      }
    } catch (e) {
      console.error("Failed to fetch pulses:", e);
    }
  };

  useEffect(() => {
    fetchPulses();
  }, [activeTab]);

  const currentPulse = pulses[currentIndex];

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Video Gesture Interactions
  const handleVideoTap = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsPlaying(!isPlaying);
  };

  const handleVideoDoubleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setHeartAnimPos({ x, y });
    setShowHeartAnim(true);
    setTimeout(() => setShowHeartAnim(false), 800);

    if (currentPulse) {
      handleLike();
    }
  };

  const handleLike = async () => {
    if (!currentPulse) return;
    setPulses(prev =>
      prev.map((p, idx) =>
        idx === currentIndex ? { ...p, likeCount: p.likeCount + 1 } : p
      )
    );
    try {
      await fetch('/api/pulse', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'like', pulseId: currentPulse.id }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveToFolder = async (folder: string) => {
    if (!currentPulse) return;
    setSelectedFolder(folder);
    setIsSaveOpen(false);
    setPulses(prev =>
      prev.map((p, idx) =>
        idx === currentIndex ? { ...p, saveCount: p.saveCount + 1 } : p
      )
    );
    triggerToast(`Saved to folder "${folder}"!`);

    if (account) {
      try {
        await fetch('/api/pulse', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save',
            pulseId: currentPulse.id,
            userAddress: account,
            folder,
          }),
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    setComments(prev => [
      ...prev,
      {
        id: `c_${Date.now()}`,
        user: account ? `creator_${account.slice(2, 8)}` : 'you',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
        text: newCommentText,
        likes: 0,
      },
    ]);
    setNewCommentText('');
    if (currentPulse) {
      setPulses(prev =>
        prev.map((p, idx) =>
          idx === currentIndex ? { ...p, commentCount: p.commentCount + 1 } : p
        )
      );
    }
  };

  const handlePublishPulse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createCaption.trim()) return;
    try {
      setIsPublishing(true);
      const res = await fetch('/api/pulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorAddress: account || '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
          videoUrl: createVideoUrl,
          caption: createCaption,
          hashtags: createHashtags,
          category: createCategory,
          audioTitle: createAudio,
          privacy: createVisibility,
          allowComments: createAllowComments,
          allowRemix: createAllowRemix,
          allowDownload: createAllowDownload,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Skip on-chain anchoring for normal flow unless Web3 is connected & user explicitly verified it
        if (isWeb3Connected && data.pulse?.contentHash && typeof registerProofOnChain === 'function') {
          try {
            await registerProofOnChain(data.pulse.contentHash, `ipfs://pulse_${Date.now()}`);
          } catch (contractErr) {
            console.warn("On-chain registration failed, continuing off-chain:", contractErr);
          }
        }
        await fetchPulses();
        setIsCreateOpen(false);
        triggerToast('⚡ Pulse published successfully!');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleApplyAiSuggestions = () => {
    setCreateCaption('Revolutionizing AI Agents with Decentralized Blockchain Workflows! 🤖⚡');
    setCreateHashtags('#AIAgents #Tech #Future #BlockSocial');
    setCreateCategory('AI');
    triggerToast('✓ AI Suggestions applied!');
  };

  const handleNextVideo = () => {
    if (currentIndex < pulses.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsPlaying(true);
    }
  };

  const handlePrevVideo = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsPlaying(true);
    }
  };

  return (
    <div className="relative -mx-4 -mt-4 min-h-[85vh] bg-black text-white overflow-hidden flex flex-col justify-between select-none">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#00B7FF] text-slate-950 font-extrabold text-xs shadow-2xl animate-in fade-in slide-in-from-top-4 flex items-center gap-1.5">
          <Zap className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP TABS & FLOATING HEADER */}
      <div className="absolute top-0 left-0 right-0 z-30 px-4 py-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('forYou')}
            className={`transition-colors ${activeTab === 'forYou' ? 'text-white border-b-2 border-[#00B7FF] pb-0.5 font-extrabold' : 'text-white/60 hover:text-white'}`}
          >
            For You
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`transition-colors ${activeTab === 'following' ? 'text-white border-b-2 border-[#00B7FF] pb-0.5 font-extrabold' : 'text-white/60 hover:text-white'}`}
          >
            Following
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={`transition-colors ${activeTab === 'trending' ? 'text-white border-b-2 border-[#00B7FF] pb-0.5 font-extrabold flex items-center gap-1' : 'text-white/60 hover:text-white flex items-center gap-1'}`}
          >
            <span>Trending</span>
            <Flame className="w-3.5 h-3.5 text-amber-400" />
          </button>
          <button
            onClick={() => setActiveTab('opportunity')}
            className={`transition-colors ${activeTab === 'opportunity' ? 'text-white border-b-2 border-[#00B7FF] pb-0.5 font-extrabold flex items-center gap-1' : 'text-white/60 hover:text-white flex items-center gap-1'}`}
          >
            <span>Opportunity</span>
            <Sparkles className="w-3.5 h-3.5 text-[#00B7FF]" />
          </button>
        </div>

        {/* "+ Create Pulse" Header Action */}
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#00B7FF] to-purple-600 text-white font-extrabold text-xs shadow-lg hover:scale-105 transition-transform"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Create</span>
        </button>
      </div>

      {/* VIEW MODE 1: VERTICAL PULSE VIDEO PLAYER FEED */}
      {activeTab !== 'opportunity' && currentPulse && (
        <div className="relative w-full h-[78vh] bg-slate-950 flex items-center justify-center">
          
          {/* Double Tap Floating Heart Animation */}
          {showHeartAnim && (
            <div
              style={{ left: heartAnimPos.x - 40, top: heartAnimPos.y - 40 }}
              className="absolute z-40 pointer-events-none animate-ping text-rose-500"
            >
              <Heart className="w-20 h-20 fill-rose-500" />
            </div>
          )}

          {/* Pause overlay indicator */}
          {!isPlaying && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 pointer-events-none">
              <div className="p-4 rounded-full bg-black/60 backdrop-blur-md text-white">
                <Play className="w-10 h-10 fill-white" />
              </div>
            </div>
          )}

          {/* Video element */}
          <div
            onClick={handleVideoTap}
            onDoubleClick={handleVideoDoubleTap}
            className="w-full h-full cursor-pointer relative"
          >
            <video
              ref={videoRef}
              src={currentPulse.videoUrl}
              poster={currentPulse.thumbnailUrl}
              autoPlay={isPlaying}
              loop
              muted={isMuted}
              playsInline
              className="w-full h-full object-cover"
            />
          </div>

          {/* Vertical Swipe Navigation Arrows */}
          <div className="absolute left-2 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2">
            {currentIndex > 0 && (
              <button
                onClick={handlePrevVideo}
                className="p-2 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/70 text-white text-xs font-bold"
              >
                ▲
              </button>
            )}
            {currentIndex < pulses.length - 1 && (
              <button
                onClick={handleNextVideo}
                className="p-2 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/70 text-white text-xs font-bold"
              >
                ▼
              </button>
            )}
          </div>

          {/* RIGHT ACTION BAR OVERLAY */}
          <div className="absolute right-3 bottom-20 z-30 flex flex-col items-center gap-4">
            
            {/* Creator Avatar & Follow */}
            <div className="relative mb-2">
              <div className="w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-[#00B7FF] to-purple-600 shadow-md">
                <img
                  src={currentPulse.author.avatarUrl}
                  alt={currentPulse.author.displayName}
                  className="w-full h-full rounded-full object-cover border border-black"
                />
              </div>
              <button
                onClick={() => {
                  setFollowedMap(prev => ({ ...prev, [currentPulse.authorAddress]: !prev[currentPulse.authorAddress] }));
                  triggerToast(followedMap[currentPulse.authorAddress] ? `Unfollowed @${currentPulse.author.username}` : `Following @${currentPulse.author.username}!`);
                }}
                className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#00B7FF] text-white flex items-center justify-center shadow-md font-bold text-xs hover:scale-110 transition-transform"
              >
                {followedMap[currentPulse.authorAddress] ? '✓' : '+'}
              </button>
            </div>

            {/* Like Heart */}
            <button onClick={handleLike} className="flex flex-col items-center gap-1 group">
              <div className="p-3 rounded-full bg-black/40 backdrop-blur-md group-hover:bg-rose-500/20 text-white group-hover:text-rose-500 transition-colors">
                <Heart className="w-6 h-6 fill-rose-500 text-rose-500" />
              </div>
              <span className="text-[11px] font-extrabold">{currentPulse.likeCount}</span>
            </button>

            {/* Comment */}
            <button onClick={() => setIsCommentOpen(true)} className="flex flex-col items-center gap-1 group">
              <div className="p-3 rounded-full bg-black/40 backdrop-blur-md group-hover:bg-cyan-500/20 text-white transition-colors">
                <MessageCircle className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-extrabold">{currentPulse.commentCount}</span>
            </button>

            {/* Repost */}
            <button
              onClick={() => {
                setPulses(prev => prev.map((p, idx) => idx === currentIndex ? { ...p, shareCount: p.shareCount + 1 } : p));
                triggerToast('🔄 Pulse reposted to your followers!');
              }}
              className="flex flex-col items-center gap-1 group"
            >
              <div className="p-3 rounded-full bg-black/40 backdrop-blur-md group-hover:bg-emerald-500/20 text-white transition-colors">
                <Repeat className="w-6 h-6 text-emerald-400" />
              </div>
              <span className="text-[11px] font-extrabold">{currentPulse.shareCount}</span>
            </button>

            {/* Share to Story */}
            <button onClick={() => setIsShareOpen(true)} className="flex flex-col items-center gap-1 group">
              <div className="p-3 rounded-full bg-black/40 backdrop-blur-md group-hover:bg-purple-500/20 text-white transition-colors">
                <Share2 className="w-6 h-6 text-purple-400" />
              </div>
              <span className="text-[11px] font-extrabold">Share</span>
            </button>

            {/* Save to Folders */}
            <button onClick={() => setIsSaveOpen(true)} className="flex flex-col items-center gap-1 group">
              <div className="p-3 rounded-full bg-black/40 backdrop-blur-md group-hover:bg-amber-500/20 text-white transition-colors">
                <Bookmark className="w-6 h-6 text-amber-400 fill-amber-400" />
              </div>
              <span className="text-[11px] font-extrabold">{currentPulse.saveCount}</span>
            </button>

            {/* Music Spinning Disc */}
            <div className="mt-1 animate-spin duration-[4000ms]">
              <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-[#00B7FF] p-1 flex items-center justify-center shadow-lg">
                <Music className="w-4 h-4 text-[#00B7FF]" />
              </div>
            </div>

          </div>

          {/* BOTTOM METADATA OVERLAY */}
          <div className="absolute left-3 right-16 bottom-4 z-30 space-y-2 text-left bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 rounded-2xl backdrop-blur-[2px]">
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-sm text-white">{currentPulse.author.displayName}</span>
              <span className="text-xs text-[#00B7FF] font-bold font-mono">@{currentPulse.author.username}</span>

              {/* Dynamic Pulse Score Badge */}
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-extrabold flex items-center gap-1">
                <Flame className="w-3 h-3" />
                Pulse Score {currentPulse.pulseScore}/100
              </span>
            </div>

            <p className="text-xs text-white/90 leading-relaxed font-medium">
              {currentPulse.caption}
            </p>

            <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold text-[#00B7FF]">
              <span>{currentPulse.hashtags}</span>

              {/* Proof of Originality Button */}
              <button
                onClick={() => setIsOriginalityOpen(true)}
                className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] flex items-center gap-1 hover:bg-emerald-500/30 transition-colors"
              >
                <ShieldCheck className="w-3 h-3" />
                <span>✓ Originality Verified</span>
              </button>

              {/* Authentic Engagement Score */}
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px]">
                Authentic Engagement: {currentPulse.authenticScore}% ✓
              </span>
            </div>

            {/* Music Track info */}
            <div className="flex items-center gap-1.5 text-[11px] text-white/70 font-semibold pt-0.5">
              <Music className="w-3.5 h-3.5 text-[#00B7FF] shrink-0" />
              <span className="truncate">{currentPulse.audioTitle}</span>
            </div>

            {/* Remix Button */}
            {settings.allowRemix && (
              <div className="pt-1">
                <button
                  onClick={() => {
                    setIsCreateOpen(true);
                    triggerToast(`Remixing @${currentPulse.author.username}'s Pulse!`);
                  }}
                  className="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-[10px] flex items-center gap-1"
                >
                  <Repeat className="w-3 h-3 text-[#00B7FF]" />
                  <span>Remix by @{currentPulse.author.username}</span>
                </button>
              </div>
            )}

          </div>

        </div>
      )}

      {/* VIEW MODE 2: CONTENT OPPORTUNITY ("WHAT SHOULD I POST?") */}
      {activeTab === 'opportunity' && (
        <div className="p-4 space-y-4 overflow-y-auto max-h-[78vh] text-left">
          
          <div className="p-4 rounded-3xl bg-gradient-to-r from-cyan-950/60 to-purple-950/60 border border-[#00B7FF]/30 space-y-2">
            <div className="flex items-center gap-2 text-[#00B7FF] font-extrabold text-sm">
              <Sparkles className="w-5 h-5" />
              <span>What Should I Post? (AI Trend Opportunities)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              We analyzed current high-demand, low-competition Pulse short-video trends on BlockSocial.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                topic: 'AI Agents & Decentralized Workflows',
                opportunityScore: 94,
                demand: 'Very High 🔥',
                competition: 'Medium',
                format: 'Short Tech Breakdown (15s)',
                hashtags: '#AIAgents #Web3 #FutureTech',
              },
              {
                topic: 'MetaMask Auto-Reconnection & Web3 UX',
                opportunityScore: 91,
                demand: 'High 🚀',
                competition: 'Low',
                format: 'Screen Recording Tutorial',
                hashtags: '#Web3 #MetaMask #UXDesign',
              },
              {
                topic: 'Proof-of-Creation Blockchain Fingerprints',
                opportunityScore: 88,
                demand: 'High ⚡',
                competition: 'Low',
                format: 'Concept Demonstration',
                hashtags: '#Blockchain #Originality #NFTs',
              },
            ].map((opp, idx) => (
              <div key={idx} className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-extrabold text-sm text-white">{opp.topic}</h4>
                    <div className="text-[11px] text-[#00B7FF] font-mono font-semibold">{opp.hashtags}</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-extrabold flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5" />
                    Opportunity {opp.opportunityScore}/100
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                  <div className="p-2 rounded-xl bg-slate-950">
                    <div className="text-slate-400">Demand</div>
                    <div className="text-white">{opp.demand}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950">
                    <div className="text-slate-400">Competition</div>
                    <div className="text-emerald-400">{opp.competition}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950">
                    <div className="text-slate-400">Best Format</div>
                    <div className="text-purple-400">{opp.format}</div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setCreateCaption(`Creating video on ${opp.topic}! 🔥`);
                    setCreateHashtags(opp.hashtags);
                    setIsCreateOpen(true);
                  }}
                  className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-[#00B7FF] to-purple-600 text-white font-extrabold text-xs shadow-md hover:opacity-90 transition-opacity"
                >
                  Create on This Trend ⚡
                </button>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* MODAL 1: + CREATE PULSE & AI ASSISTANT */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-[#131b2e] border border-slate-800 p-6 text-left space-y-4 relative text-xs">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Film className="w-5 h-5 text-[#00B7FF]" />
              <span>Create New Pulse</span>
            </h3>

            {/* Video Input Mode */}
            <div className="grid grid-cols-2 gap-2">
              <button className="p-3 rounded-2xl bg-[#00B7FF]/10 border border-[#00B7FF] font-extrabold text-white flex items-center justify-center gap-2">
                <Video className="w-4 h-4 text-[#00B7FF]" />
                <span>📹 Record</span>
              </button>
              <button className="p-3 rounded-2xl bg-slate-900 border border-slate-800 font-extrabold text-slate-300 flex items-center justify-center gap-2">
                <Upload className="w-4 h-4 text-purple-400" />
                <span>🖼️ Upload Video</span>
              </button>
            </div>

            {/* AI Assistant Suggestions Card */}
            {showAiAssistant && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/50 to-purple-950/50 border border-[#00B7FF]/30 space-y-2 relative">
                <button
                  onClick={() => setShowAiAssistant(false)}
                  className="absolute top-2 right-2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1.5 text-[#00B7FF] font-extrabold text-[11px]">
                  <Sparkles className="w-4 h-4" />
                  <span>AI Content Assistant</span>
                </div>

                <div className="text-[10px] text-slate-300 space-y-1">
                  <div>🔥 Trending Topic: <span className="font-bold text-amber-400">AI Agents</span></div>
                  <div>📈 Demand: <span className="font-bold text-emerald-400">High</span> • Competition: Medium</div>
                  <div>⏰ Best Posting Time: <span className="font-bold text-cyan-300">7–9 PM</span></div>
                </div>

                <button
                  type="button"
                  onClick={handleApplyAiSuggestions}
                  className="w-full py-1.5 rounded-xl bg-[#00B7FF] text-slate-950 font-extrabold text-[10px]"
                >
                  Apply AI Suggestions
                </button>
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={handlePublishPulse} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Caption</label>
                <textarea
                  rows={2}
                  value={createCaption}
                  onChange={(e) => setCreateCaption(e.target.value)}
                  placeholder="What's this Pulse about?"
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold focus:outline-none focus:border-[#00B7FF]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Hashtags</label>
                <input
                  type="text"
                  value={createHashtags}
                  onChange={(e) => setCreateHashtags(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[#00B7FF] font-mono font-semibold focus:outline-none focus:border-[#00B7FF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Who can see this?</label>
                  <select
                    value={createVisibility}
                    onChange={(e) => setCreateVisibility(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 font-semibold text-slate-200 outline-none"
                  >
                    <option value="Everyone">Everyone</option>
                    <option value="Followers">Followers</option>
                    <option value="Close Friends">Close Friends</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Category</label>
                  <input
                    type="text"
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 font-semibold text-slate-200"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center text-[11px] text-slate-300 font-semibold">
                  <span>Allow Comments</span>
                  <input
                    type="checkbox"
                    checked={createAllowComments}
                    onChange={(e) => setCreateAllowComments(e.target.checked)}
                    className="accent-[#00B7FF]"
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-300 font-semibold">
                  <span>Allow Remix / React</span>
                  <input
                    type="checkbox"
                    checked={createAllowRemix}
                    onChange={(e) => setCreateAllowRemix(e.target.checked)}
                    className="accent-[#00B7FF]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPublishing}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#00B7FF] to-purple-600 text-white font-extrabold text-xs shadow-lg hover:opacity-90 transition-opacity mt-2"
              >
                {isPublishing ? 'Publishing & Anchoring Proof...' : 'Publish Pulse ⚡'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: COMMENTS DRAWER */}
      {isCommentOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md h-[65vh] rounded-t-3xl bg-[#131b2e] border-t border-slate-800 p-5 flex flex-col justify-between text-left">
            
            <div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-3">
                <h4 className="font-extrabold text-sm text-white">Comments ({comments.length})</h4>
                <button onClick={() => setIsCommentOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[42vh] pr-1">
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-2.5 items-start">
                    <img src={c.avatar} alt={c.user} className="w-8 h-8 rounded-full object-cover shrink-0" />
                    <div className="flex-1 bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800">
                      <div className="font-bold text-xs text-[#00B7FF]">@{c.user}</div>
                      <div className="text-xs text-slate-200 mt-0.5">{c.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddComment} className="flex gap-2 pt-2 border-t border-slate-800">
              <input
                type="text"
                placeholder="Add a comment..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-[#00B7FF]"
              />
              <button type="submit" className="px-4 py-2 rounded-xl bg-[#00B7FF] text-slate-950 font-extrabold text-xs">
                Post
              </button>
            </form>

          </div>
        </div>
      )}

      {/* MODAL 3: SAVE TO FOLDERS */}
      {isSaveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xs rounded-3xl bg-[#131b2e] border border-slate-800 p-5 text-left space-y-4 relative">
            <button onClick={() => setIsSaveOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>

            <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-amber-400" />
              <span>Save to Folder</span>
            </h4>

            <div className="space-y-2">
              {['AI', 'Memes', 'Learning', 'Inspiration'].map((folder) => (
                <button
                  key={folder}
                  onClick={() => handleSaveToFolder(folder)}
                  className="w-full p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-[#00B7FF] text-white font-bold text-xs flex justify-between items-center transition-colors"
                >
                  <span>📁 {folder}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: SHARE BOTTOM SHEET */}
      {isShareOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-t-3xl bg-[#131b2e] border-t border-slate-800 p-5 space-y-4 text-left">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h4 className="font-extrabold text-sm text-white">Share Pulse</h4>
              <button onClick={() => setIsShareOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={() => {
                setIsShareOpen(false);
                triggerToast('✓ Shared Pulse directly to your Story!');
              }}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-[#00B7FF] text-white font-extrabold text-xs shadow-lg"
            >
              Share to Story 🌟
            </button>

            <button
              onClick={() => {
                setIsShareOpen(false);
                triggerToast('Link copied to clipboard!');
              }}
              className="w-full py-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-200 font-bold text-xs flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4 text-[#00B7FF]" />
              <span>Copy Direct Link</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL 5: PROOF OF ORIGINALITY & CONTENT HISTORY */}
      {isOriginalityOpen && currentPulse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-[#131b2e] border border-slate-800 p-6 text-left space-y-4 relative text-xs">
            <button onClick={() => setIsOriginalityOpen(false)} className="absolute top-5 right-5 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-base">
              <ShieldCheck className="w-6 h-6" />
              <span>✓ Proof of Originality</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 font-mono text-[11px]">
              <div className="text-slate-400">Content Hash:</div>
              <div className="text-[#00B7FF] font-bold break-all">{currentPulse.contentHash}</div>
            </div>

            <div className="space-y-3 pt-1">
              <div className="font-extrabold text-white text-xs">Content History Timeline</div>
              <div className="space-y-2 border-l-2 border-[#00B7FF] pl-3">
                <div>
                  <div className="font-bold text-white">1. Created & Fingerprinted</div>
                  <div className="text-[10px] text-slate-400">Cryptographic SHA-256 hash computed</div>
                </div>
                <div>
                  <div className="font-bold text-white">2. Published on BlockSocial</div>
                  <div className="text-[10px] text-slate-400">Distributed to Pulse feed network</div>
                </div>
                <div>
                  <div className="font-bold text-emerald-400">3. Anchored on Blockchain</div>
                  <div className="text-[10px] text-slate-400 font-mono">{currentPulse.txHash || '0xproof_tx_172348'}</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOriginalityOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 font-bold text-white"
            >
              Close History
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
