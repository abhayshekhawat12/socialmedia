'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Trash2, Send, Heart, Flame, MessageSquare, ChevronLeft, ChevronRight, Music, Volume2, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { audioHaptics } from '../lib/audioHaptics';

interface Story {
  id: string;
  authorAddress: string;
  mediaUrl?: string;
  mediaType: string;
  textContent?: string;
  textBgColor?: string;
  audioTitle?: string;
  audioUrl?: string;
  createdAt: string;
}

interface StoryGroup {
  authorAddress: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  stories: Story[];
}

interface StoryViewerModalProps {
  groups: StoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
  onStoryDeleted?: () => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  groups,
  initialGroupIndex,
  onClose,
  onStoryDeleted,
}) => {
  const { account } = useAuth();
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const timerRef = useRef<any>(null);
  const progressIntervalRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const activeGroup = groups[groupIndex];
  const activeStory = activeGroup?.stories[storyIndex];
  const isOwnStory = account && activeStory && activeStory.authorAddress.toLowerCase() === account.toLowerCase();

  // Play audio if present
  useEffect(() => {
    if (activeStory?.audioUrl && audioPlayerRef.current) {
      audioPlayerRef.current.src = activeStory.audioUrl;
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current.play().catch((err) => console.warn("Story audio playback prevented:", err));
    } else if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
  }, [groupIndex, storyIndex, activeStory]);

  // Auto-advance logic (5 seconds per story)
  useEffect(() => {
    if (showDeleteModal) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      return;
    }

    setProgress(0);
    if (!activeStory) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    const duration = 5000;
    const interval = 50;

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressIntervalRef.current);
          return 100;
        }
        return prev + (100 / (duration / interval));
      });
    }, interval);

    timerRef.current = setTimeout(() => {
      handleNext();
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [groupIndex, storyIndex, showDeleteModal]);

  if (!activeGroup || !activeStory) {
    return null;
  }

  const handleNext = () => {
    if (storyIndex < activeGroup.stories.length - 1) {
      setStoryIndex(prev => prev + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex(prev => prev + 1);
      setStoryIndex(0);
    } else {
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
      onClose();
    }
  };

  const handlePrev = () => {
    if (storyIndex > 0) {
      setStoryIndex(prev => prev - 1);
    } else if (groupIndex > 0) {
      setGroupIndex(prev => prev - 1);
      setStoryIndex(groups[groupIndex - 1].stories.length - 1);
    } else {
      setProgress(0);
    }
  };

  const handleDelete = async () => {
    if (!account || !activeStory || !isOwnStory) return;

    try {
      setIsDeleting(true);
      audioHaptics.playTap();

      const res = await fetch(`/api/stories?id=${activeStory.id}&authorAddress=${account}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (onStoryDeleted) onStoryDeleted();
        setShowDeleteModal(false);
        if (activeGroup.stories.length === 1) {
          if (audioPlayerRef.current) audioPlayerRef.current.pause();
          onClose();
        } else {
          handleNext();
        }
      }
    } catch (e) {
      console.error("Delete story error:", e);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !account) return;

    try {
      audioHaptics.playSend();
      const savedToken = typeof window !== 'undefined' ? localStorage.getItem("block_social_jwt") : null;

      const chatRes = await fetch("/api/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(savedToken ? { "Authorization": `Bearer ${savedToken}` } : {})
        },
        body: JSON.stringify({ targetAddress: activeGroup.authorAddress })
      });
      
      const chatData = await chatRes.json();
      if (!chatRes.ok) throw new Error(chatData.error || "Failed to initialize conversation.");

      const conversationId = chatData.conversationId;

      await fetch("/api/chats/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(savedToken ? { "Authorization": `Bearer ${savedToken}` } : {})
        },
        body: JSON.stringify({
          conversationId,
          content: `🎬 Replied to story: "${replyText}"`
        })
      });

      setReplyText("");
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md select-none animate-in fade-in">
      
      {/* Hidden Audio Player */}
      <audio ref={audioPlayerRef} className="hidden" />

      {/* Close Button */}
      <button
        onClick={() => {
          if (audioPlayerRef.current) audioPlayerRef.current.pause();
          onClose();
        }}
        className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-black/40 text-white hover:bg-black/60 cursor-pointer"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Navigation Left / Right Chevrons */}
      <button
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-black/40 text-white hover:bg-black/60 hidden sm:flex cursor-pointer"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-black/40 text-white hover:bg-black/60 hidden sm:flex cursor-pointer"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Main Story Container */}
      <div className="relative w-full max-w-sm h-full sm:h-[88vh] bg-slate-900 sm:rounded-[32px] overflow-hidden flex flex-col justify-between shadow-2xl border border-slate-800">
        
        {/* Top Progress Bars */}
        <div className="absolute top-3 inset-x-3 z-30 flex gap-1">
          {activeGroup.stories.map((s, idx) => {
            const isCompleted = idx < storyIndex;
            const isCurrent = idx === storyIndex;
            return (
              <div key={s.id} className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-75"
                  style={{
                    width: isCompleted ? "100%" : isCurrent ? `${progress}%` : "0%",
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Top Story Header */}
        <div className="absolute top-6 inset-x-4 z-30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={activeGroup.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${activeGroup.authorAddress}`}
              alt={activeGroup.displayName}
              className="w-9 h-9 rounded-full object-cover border border-white/40"
            />
            <div>
              <span className="font-extrabold text-xs text-white drop-shadow block">
                {activeGroup.displayName}
              </span>
              <span className="text-[10px] text-white/80 font-mono drop-shadow">
                @{activeGroup.username}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Story Audio Badge */}
            {activeStory.audioTitle && (
              <div className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold flex items-center gap-1">
                <Music className="w-3 h-3 text-[#00B7FF] animate-spin" />
                <span className="truncate max-w-[100px]">{activeStory.audioTitle}</span>
              </div>
            )}

            {/* Owner Delete Button */}
            {isOwnStory && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="p-1.5 rounded-full bg-rose-500/30 text-rose-300 hover:bg-rose-500 hover:text-white cursor-pointer transition-colors"
                title="Delete story"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Story Media / Content Area */}
        <div className="relative w-full h-full flex items-center justify-center">
          {activeStory.mediaType === 'image' && activeStory.mediaUrl ? (
            <img
              src={activeStory.mediaUrl}
              alt="Story"
              className="w-full h-full object-cover"
            />
          ) : activeStory.mediaType === 'video' && activeStory.mediaUrl ? (
            <video
              src={activeStory.mediaUrl}
              autoPlay
              playsInline
              loop
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center p-8 text-center"
              style={{ backgroundColor: activeStory.textBgColor || '#4f46e5' }}
            >
              <p className="text-xl sm:text-2xl font-black text-white leading-relaxed drop-shadow-md">
                {activeStory.textContent}
              </p>
            </div>
          )}

          {/* Left/Right Tap zones for mobile touch navigation */}
          <div className="absolute inset-y-0 left-0 w-1/3 z-20" onClick={handlePrev} />
          <div className="absolute inset-y-0 right-0 w-2/3 z-20" onClick={handleNext} />
        </div>

        {/* Bottom Reply Bar */}
        <div className="relative z-30 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
          <form onSubmit={handleSendReply} className="flex items-center gap-2">
            <input
              type="text"
              placeholder={`Reply to ${activeGroup.displayName}...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="flex-1 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-xs text-white placeholder-white/60 outline-none focus:border-[#00B7FF]"
            />
            <button
              type="submit"
              disabled={!replyText.trim()}
              className="p-2 rounded-full bg-[#00B7FF] text-slate-950 hover:opacity-90 disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>

      {/* CONFIRM DELETE STORY MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-[#131b2e] border border-slate-800 p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h4 className="font-extrabold text-sm text-white">Delete this story?</h4>
              <p className="text-xs text-slate-400">
                This will permanently delete this active story before its 24h expiration.
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
                onClick={handleDelete}
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
};
