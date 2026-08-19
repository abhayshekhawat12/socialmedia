'use client';

import React, { useState, useEffect } from 'react';
import { Plus, X, Image as ImageIcon, Sparkles, Loader2, Music, Sliders, Type } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { StoryViewerModal } from './StoryViewerModal';
import { MusicPickerModal, SelectedTrack } from './MusicPickerModal';
import { audioHaptics } from '../lib/audioHaptics';
import { compressImage } from '../lib/imageCompression';
import { appCache } from '../lib/cache';

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

export const StoryBar: React.FC = () => {
  const { account } = useAuth();
  const [groups, setGroups] = useState<StoryGroup[]>(() => {
    return appCache.get<StoryGroup[]>("stories_groups") || [];
  });
  const [viewerGroupIndex, setViewerGroupIndex] = useState<number | null>(null);
  
  // Creation modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [storyType, setStoryType] = useState<'text' | 'media'>('media');
  const [textContent, setTextContent] = useState("");
  const [textBgColor, setTextBgColor] = useState("#4f46e5");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Music & Filters
  const [isMusicPickerOpen, setIsMusicPickerOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<SelectedTrack | null>(null);
  const [selectedFilter, setSelectedFilter] = useState("");

  const filters = [
    { name: "None", class: "" },
    { name: "Cinematic", class: "brightness-[1.1] saturate-[1.15] contrast-[1.1]" },
    { name: "Sunset", class: "sepia-[0.25] saturate-[1.3] brightness-[1.05]" },
    { name: "Vintage", class: "sepia-[0.35] brightness-[0.95]" },
    { name: "Noir", class: "grayscale-[1] contrast-[1.2]" },
  ];

  const fetchStories = async () => {
    try {
      const freshGroups = await appCache.getOrFetch<StoryGroup[]>(
        "stories_groups",
        async () => {
          const res = await fetch('/api/stories');
          if (res.ok) {
            const data = await res.json();
            return data.groups || [];
          }
          return [];
        },
        30,
        (updated) => setGroups(updated)
      );
      setGroups(freshGroups);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (mediaPreview && mediaPreview.startsWith('blob:')) {
        URL.revokeObjectURL(mediaPreview);
      }
    };
  }, [mediaPreview]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMediaFile(file);
      const url = URL.createObjectURL(file);
      setMediaPreview(url);
      setStoryType('media');
      audioHaptics.playTap();
    }
  };

  const handlePublishStory = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    if (storyType === 'text' && !textContent.trim()) {
      setUploadError("Please type a story message.");
      return;
    }
    if (storyType === 'media' && !mediaFile) {
      setUploadError("Please choose an image or video for your story.");
      return;
    }

    try {
      setIsUploading(true);
      audioHaptics.playSend();
      let mediaUrl = "";
      let actualMediaType = storyType === 'text' ? 'text' : (mediaFile?.type.startsWith('video/') ? 'video' : 'image');

      if (storyType === 'media' && mediaFile) {
        // Compress image if photo
        const fileToUpload = mediaFile.type.startsWith("image/") 
          ? await compressImage(mediaFile, { maxWidth: 1400, quality: 0.85 })
          : mediaFile;

        const formData = new FormData();
        formData.append("file", fileToUpload);
        
        const uploadRes = await fetch("/api/storage/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json();
          throw new Error(errData.error || "Failed to upload story media.");
        }

        const uploadData = await uploadRes.json();
        mediaUrl = uploadData.url;
      }

      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorAddress: account || 'usr_guest_creator',
          mediaUrl,
          mediaType: actualMediaType,
          textContent: storyType === 'text' ? textContent : '',
          textBgColor: storyType === 'text' ? textBgColor : '',
          audioTitle: selectedTrack ? selectedTrack.title : null,
          audioUrl: selectedTrack ? selectedTrack.url : null,
          privacy: 'everyone',
        }),
      });

      if (res.ok) {
        appCache.invalidate("stories_");
        await fetchStories();
        setIsCreateOpen(false);
        setTextContent("");
        setMediaFile(null);
        setMediaPreview(null);
        setSelectedTrack(null);
      } else {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to publish story.");
      }
    } catch (e: any) {
      console.error(e);
      setUploadError(e.message || "Failed to publish story.");
    } finally {
      setIsUploading(false);
    }
  };

  const ownGroup = groups.find(g => g.authorAddress.toLowerCase() === account?.toLowerCase());

  return (
    <div className="w-full flex items-center justify-start gap-4 overflow-x-auto no-scrollbar py-2 px-1 text-left select-none">
      
      {/* Music Picker Bottom Sheet */}
      <MusicPickerModal
        isOpen={isMusicPickerOpen}
        onClose={() => setIsMusicPickerOpen(false)}
        onSelectTrack={(track) => setSelectedTrack(track)}
        selectedTrackId={selectedTrack?.id}
      />

      {/* Current User Story Item */}
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
                src={`https://api.dicebear.com/7.x/bottts/svg?seed=${account || "me"}`} 
                alt="Your Avatar" 
                className="w-full h-full object-cover bg-slate-900" 
              />
            </div>
          </div>

          <button
            onClick={() => {
              audioHaptics.playTap();
              setIsCreateOpen(true);
            }}
            className="absolute bottom-0 right-0 w-4.5 h-4.5 rounded-full bg-[#00B7FF] text-slate-950 flex items-center justify-center border-2 border-white dark:border-[#131b2e] shadow-sm hover:scale-110 transition-transform cursor-pointer"
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
            onClick={() => {
              audioHaptics.playTap();
              setViewerGroupIndex(idx);
            }}
            className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
          >
            <div className="w-14 h-14 rounded-full p-[2.5px] bg-gradient-to-tr from-[#00B7FF] via-purple-500 to-indigo-500 group-hover:scale-105 transition-transform duration-250">
              <div className="w-full h-full rounded-full border border-white dark:border-[#131b2e] overflow-hidden bg-slate-100 dark:bg-slate-900">
                <img 
                  src={group.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${group.authorAddress}`} 
                  alt={group.displayName} 
                  className="w-full h-full object-cover bg-slate-900" 
                />
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

      {/* CREATE STORY MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm rounded-[32px] bg-[#131b2e] border border-slate-800 p-6 space-y-4 shadow-2xl relative text-xs">
            
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-sm font-extrabold text-white">
              <Sparkles className="w-5 h-5 text-[#00B7FF]" />
              <span>Create Story</span>
            </div>

            {uploadError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold">
                {uploadError}
              </div>
            )}

            {/* Type selector */}
            <div className="flex bg-slate-900 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setStoryType('media')}
                className={`flex-1 py-1.5 rounded-lg font-bold text-[11px] cursor-pointer ${storyType === 'media' ? 'bg-[#00B7FF] text-slate-950 font-black' : 'text-slate-400'}`}
              >
                Photo / Video
              </button>
              <button
                type="button"
                onClick={() => setStoryType('text')}
                className={`flex-1 py-1.5 rounded-lg font-bold text-[11px] cursor-pointer ${storyType === 'text' ? 'bg-[#00B7FF] text-slate-950 font-black' : 'text-slate-400'}`}
              >
                Text Story
              </button>
            </div>

            <form onSubmit={handlePublishStory} className="space-y-3.5">
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
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5">Select Background Color</label>
                    <div className="flex gap-2">
                      {['#4f46e5', '#db2777', '#0891b2', '#059669', '#d97706', '#dc2626'].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setTextBgColor(color)}
                          style={{ backgroundColor: color }}
                          className={`w-6 h-6 rounded-full border-2 cursor-pointer ${textBgColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-[11px] font-bold text-slate-400">Media Upload (Photo / Video)</label>
                  <div className="border border-dashed border-slate-800 rounded-2xl p-3 text-center bg-slate-900 flex flex-col items-center justify-center relative min-h-36">
                    {mediaPreview ? (
                      <div className="relative max-h-44 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center w-full">
                        {mediaFile?.type.startsWith('video/') ? (
                          <video src={mediaPreview} controls autoPlay muted className={`max-h-44 object-contain rounded-lg ${selectedFilter}`} />
                        ) : (
                          <img src={mediaPreview} alt="Preview" className={`max-h-44 object-contain rounded-lg ${selectedFilter}`} />
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setMediaFile(null);
                            setMediaPreview(null);
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-rose-500 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center py-4">
                        <ImageIcon className="w-8 h-8 text-[#00B7FF] mb-2 animate-bounce" />
                        <span className="text-[11px] text-slate-200 font-bold">Select Image or Short Video</span>
                        <span className="text-[9px] text-slate-400 mt-1">Supports JPG, PNG, WEBP, MP4</span>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* Filters Selector */}
                  {mediaPreview && (
                    <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[10px] font-bold">
                      {filters.map((f) => (
                        <button
                          key={f.name}
                          type="button"
                          onClick={() => setSelectedFilter(f.class)}
                          className={`px-2.5 py-1 rounded-lg border whitespace-nowrap cursor-pointer ${
                            selectedFilter === f.class
                              ? "bg-[#00B7FF] text-slate-950 border-[#00B7FF]"
                              : "border-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          {f.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Add Music Option */}
              <button
                type="button"
                onClick={() => setIsMusicPickerOpen(true)}
                className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold transition-all cursor-pointer ${
                  selectedTrack
                    ? "bg-cyan-500/15 border-[#00B7FF] text-[#00B7FF]"
                    : "bg-slate-900 border-slate-800 text-slate-300 hover:border-[#00B7FF]"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Music className="w-4 h-4 text-[#00B7FF] shrink-0" />
                  <span className="truncate">{selectedTrack ? `${selectedTrack.title}` : "Add Music / Song"}</span>
                </div>
                <span className="text-[10px] text-cyan-400 font-mono shrink-0">{selectedTrack ? "Change" : "+ Select"}</span>
              </button>

              <button
                type="submit"
                disabled={isUploading}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#00B7FF] to-purple-600 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg hover:opacity-95 cursor-pointer disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Publishing Story...</span>
                  </>
                ) : (
                  <span>Share to Story 🚀</span>
                )}
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
