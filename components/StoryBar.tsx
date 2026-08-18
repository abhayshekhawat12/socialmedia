'use client';

import React, { useState, useEffect } from 'react';
import { Plus, X, Image as ImageIcon, Sparkles, Smile, ShieldCheck } from 'lucide-react';
import { useWeb3 } from '../lib/web3Context';
import { StoryViewerModal } from './StoryViewerModal';

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

export const StoryBar: React.FC = () => {
  const { account, isWeb3Connected } = useWeb3();
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [viewerGroupIndex, setViewerGroupIndex] = useState<number | null>(null);
  
  // Creation modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [storyType, setStoryType] = useState<'text' | 'media'>('text');
  const [textContent, setTextContent] = useState("");
  const [textBgColor, setTextBgColor] = useState("#4f46e5");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchStories = async () => {
    try {
      const res = await fetch('/api/stories');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
      setStoryType('media');
    }
  };

  const handlePublishStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (storyType === 'text' && !textContent.trim()) return;
    if (storyType === 'media' && !mediaFile) return;

    try {
      setIsUploading(true);
      let mediaUrl = "";

      if (storyType === 'media' && mediaFile) {
        const formData = new FormData();
        formData.append("file", mediaFile);
        
        const ipfsRes = await fetch("/api/ipfs/upload", {
          method: "POST",
          body: formData,
        });

        if (ipfsRes.ok) {
          const ipfsData = await ipfsRes.json();
          mediaUrl = ipfsData.url;
        }
      }

      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorAddress: account || '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
          mediaUrl,
          mediaType: storyType,
          textContent: storyType === 'text' ? textContent : '',
          textBgColor: storyType === 'text' ? textBgColor : '',
          privacy: 'everyone',
        }),
      });

      if (res.ok) {
        await fetchStories();
        setIsCreateOpen(false);
        setTextContent("");
        setMediaFile(null);
        setMediaPreview(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUploading(false);
    }
  };

  // Find own user's story group
  const ownGroup = groups.find(g => g.authorAddress.toLowerCase() === account?.toLowerCase());

  return (
    <div className="w-full flex items-center justify-start gap-4 overflow-x-auto no-scrollbar py-2 px-1 text-left">
      
      {/* Current User Story Item (Click to view if has stories, else click + to create) */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div className="relative">
          <div 
            onClick={() => {
              if (ownGroup) {
                const idx = groups.findIndex(g => g.authorAddress.toLowerCase() === account?.toLowerCase());
                setViewerGroupIndex(idx);
              } else {
                setIsCreateOpen(true);
              }
            }}
            className={`w-14 h-14 rounded-full p-[2.5px] cursor-pointer hover:scale-105 transition-transform duration-250 ${
              ownGroup 
                ? 'bg-gradient-to-tr from-[#00B7FF] via-[#36C4FF] to-indigo-500' 
                : 'border-2 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="w-full h-full rounded-full border border-white dark:border-[#131b2e] overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400">
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" 
                alt="Your Avatar" 
                className="w-full h-full object-cover" 
              />
            </div>
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="absolute bottom-0 right-0 w-4.5 h-4.5 rounded-full bg-[#00B7FF] text-slate-950 flex items-center justify-center border-2 border-white dark:border-[#131b2e] shadow-sm hover:scale-110 transition-transform"
            title="Create Story"
          >
            <Plus className="w-3 h-3 stroke-[3]" />
          </button>
        </div>
        <span className="text-[10px] font-bold text-slate-400 w-14 truncate text-center">Your Story</span>
      </div>

      {/* Other Users' Stories */}
      {groups.map((group, idx) => {
        if (group.authorAddress.toLowerCase() === account?.toLowerCase()) return null;
        return (
          <div 
            key={group.authorAddress} 
            onClick={() => setViewerGroupIndex(idx)}
            className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
          >
            <div className="w-14 h-14 rounded-full p-[2.5px] bg-gradient-to-tr from-[#00B7FF] via-purple-500 to-indigo-500 group-hover:scale-105 transition-transform duration-250">
              <div className="w-full h-full rounded-full border border-white dark:border-[#131b2e] overflow-hidden bg-slate-100 dark:bg-slate-900">
                <img src={group.avatarUrl} alt={group.displayName} className="w-full h-full object-cover" />
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 w-14 truncate text-center">
              {group.displayName.split(' ')[0]}
            </span>
          </div>
        );
      })}

      {/* STORY VIEWER MODAL */}
      {viewerGroupIndex !== null && (
        <StoryViewerModal
          groups={groups}
          initialGroupIndex={viewerGroupIndex}
          onClose={() => setViewerGroupIndex(null)}
          onStoryDeleted={fetchStories}
        />
      )}

      {/* STORY CREATOR MODAL (MetaMask Free) */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-[#131b2e] border border-slate-800 p-5 text-left space-y-4 text-xs text-white relative shadow-2xl">
            
            <button 
              onClick={() => setIsCreateOpen(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-[#00B7FF] font-extrabold text-sm border-b border-slate-800 pb-2">
              <Sparkles className="w-5 h-5" />
              <span>Create Story</span>
            </div>

            {/* Type selector */}
            <div className="flex bg-slate-900 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setStoryType('text')}
                className={`flex-1 py-1 rounded-lg font-bold text-[11px] ${storyType === 'text' ? 'bg-[#00B7FF] text-slate-950' : 'text-slate-400'}`}
              >
                Text Story
              </button>
              <button
                type="button"
                onClick={() => setStoryType('media')}
                className={`flex-1 py-1 rounded-lg font-bold text-[11px] ${storyType === 'media' ? 'bg-[#00B7FF] text-slate-950' : 'text-slate-400'}`}
              >
                Media Story
              </button>
            </div>

            <form onSubmit={handlePublishStory} className="space-y-4">
              {storyType === 'text' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Story Message</label>
                    <textarea
                      rows={3}
                      placeholder="Write your story message here..."
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold focus:outline-none focus:border-[#00B7FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 font-bold">Select Background Color</label>
                    <div className="flex gap-2">
                      {['#4f46e5', '#db2777', '#0891b2', '#059669', '#d97706', '#dc2626'].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setTextBgColor(color)}
                          style={{ backgroundColor: color }}
                          className={`w-6 h-6 rounded-full border-2 ${textBgColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-400">Media Upload</label>
                  <div className="border border-dashed border-slate-800 rounded-2xl p-4 text-center bg-slate-900 flex flex-col items-center justify-center relative min-h-32">
                    {mediaPreview ? (
                      <div className="relative">
                        <img src={mediaPreview} alt="Preview" className="max-h-32 rounded-lg object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setMediaFile(null);
                            setMediaPreview(null);
                          }}
                          className="absolute -top-2 -right-2 p-1 rounded-full bg-rose-500 text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center">
                        <ImageIcon className="w-8 h-8 text-[#00B7FF] mb-2" />
                        <span className="text-[10px] text-slate-300 font-bold">Upload Image / Video</span>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isUploading}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#00B7FF] to-purple-600 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Uploading to IPFS...</span>
                  </>
                ) : (
                  <span>Publish Story 🚀</span>
                )}
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

// Simple loader helper
const Loader2 = ({ className }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);
