'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Trash2, Send, Heart, Flame, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { useWeb3 } from '../lib/web3Context';

interface Story {
  id: string;
  authorAddress: string;
  mediaUrl?: string;
  mediaType: string;
  textContent?: string;
  textBgColor?: string;
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
  const { account } = useWeb3();
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState("");
  
  const timerRef = useRef<any>(null);
  const progressIntervalRef = useRef<any>(null);

  const activeGroup = groups[groupIndex];
  const activeStory = activeGroup?.stories[storyIndex];

  // Auto-advance logic (5 seconds per story)
  useEffect(() => {
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
  }, [groupIndex, storyIndex]);

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
      // Beginning of stories, restart current story
      setProgress(0);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete your story?")) return;

    try {
      const res = await fetch(`/api/stories?id=${activeStory.id}&authorAddress=${account}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (onStoryDeleted) onStoryDeleted();
        // Remove from UI
        if (activeGroup.stories.length === 1) {
          onClose();
        } else {
          handleNext();
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    // Simulate sending a chat message reply
    alert(`Story reply sent to ${activeGroup.displayName}: "${replyText}"`);
    setReplyText("");
  };

  const handleSendReaction = (emoji: string) => {
    alert(`Sent reaction ${emoji} to ${activeGroup.displayName}`);
  };

  const isOwnStory = account && account.toLowerCase() === activeStory.authorAddress.toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in select-none">
      
      {/* Left/Right Global Nav Controls */}
      <button 
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white transition-all shrink-0 z-20"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button 
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white transition-all shrink-0 z-20"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Main Container */}
      <div className="w-full max-w-sm h-full max-h-[85vh] sm:max-h-[800px] flex flex-col justify-between rounded-3xl overflow-hidden bg-slate-950 border border-slate-900 relative shadow-2xl">
        
        {/* Top Story Header & Progress Indicators */}
        <div className="absolute top-0 inset-x-0 p-3 bg-gradient-to-b from-black/80 to-transparent z-10 space-y-3">
          {/* Progress Bars */}
          <div className="flex gap-1">
            {activeGroup.stories.map((s, idx) => {
              let width = '0%';
              if (idx < storyIndex) width = '100%';
              if (idx === storyIndex) width = `${progress}%`;
              return (
                <div key={s.id} className="flex-1 bg-white/30 h-1 rounded-full overflow-hidden">
                  <div style={{ width }} className="bg-[#00B7FF] h-full transition-all duration-75" />
                </div>
              );
            })}
          </div>

          {/* User Info Header */}
          <div className="flex items-center justify-between text-white text-xs">
            <div className="flex items-center gap-2">
              <img 
                src={activeGroup.avatarUrl} 
                alt={activeGroup.displayName} 
                className="w-8 h-8 rounded-full object-cover border border-[#00B7FF]" 
              />
              <div>
                <div className="font-extrabold">{activeGroup.displayName}</div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {new Date(activeStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isOwnStory && (
                <button onClick={handleDelete} className="p-1 rounded-full hover:bg-white/10 text-rose-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-white">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Story Viewer Area */}
        <div 
          className="flex-1 flex items-center justify-center relative w-full h-full cursor-pointer"
          onClick={(e) => {
            const width = e.currentTarget.offsetWidth;
            const clickX = e.clientX - e.currentTarget.getBoundingClientRect().left;
            if (clickX < width / 3) {
              handlePrev();
            } else {
              handleNext();
            }
          }}
        >
          {activeStory.mediaType === 'image' && activeStory.mediaUrl && (
            <img 
              src={activeStory.mediaUrl} 
              alt="Story" 
              className="w-full h-full object-cover pointer-events-none" 
            />
          )}

          {activeStory.mediaType === 'video' && activeStory.mediaUrl && (
            <video 
              src={activeStory.mediaUrl} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover pointer-events-none" 
            />
          )}

          {activeStory.mediaType === 'text' && (
            <div 
              style={{ backgroundColor: activeStory.textBgColor || '#1e1b4b' }}
              className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-white"
            >
              <p className="text-base font-extrabold tracking-wide leading-relaxed">
                {activeStory.textContent}
              </p>
            </div>
          )}
        </div>

        {/* Story Reply Input Composer (IG Style) */}
        <div className="p-4 bg-gradient-to-t from-black/90 to-transparent space-y-3 z-10">
          
          {/* Reaction Shortcuts */}
          <div className="flex justify-around text-lg">
            {['❤️', '😂', '😮', '😢', '👍', '🔥'].map(emoji => (
              <button 
                key={emoji}
                onClick={() => handleSendReaction(emoji)}
                className="hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>

          <form onSubmit={handleSendReply} className="flex gap-2">
            <input
              type="text"
              placeholder="Send message..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/20 rounded-full px-4 py-2 text-xs text-white placeholder-slate-300 focus:outline-none focus:ring-1 focus:ring-[#00B7FF]"
            />
            <button 
              type="submit" 
              onClick={(e) => e.stopPropagation()}
              className="p-2 rounded-full bg-[#00B7FF] text-slate-950 hover:scale-105 transition-transform shrink-0"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
