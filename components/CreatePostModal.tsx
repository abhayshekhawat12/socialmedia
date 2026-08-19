"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  UploadCloud, 
  Sparkles, 
  MapPin, 
  Lock, 
  Loader2, 
  Music, 
  Sliders, 
  ChevronRight, 
  ChevronLeft, 
  Type,
  Volume2,
  Check
} from "lucide-react";
import { useAuth } from "../lib/authContext";
import { MusicPickerModal, SelectedTrack } from "./MusicPickerModal";
import { audioHaptics } from "../lib/audioHaptics";
import { compressImage } from "../lib/imageCompression";
import { appCache } from "../lib/cache";

export function CreatePostModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { account } = useAuth();

  // Stepper state: upload -> enhance -> publish
  const [creationStep, setCreationStep] = useState<"upload" | "enhance" | "publish">("upload");

  // Media upload state
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");

  // Music Picker State
  const [isMusicPickerOpen, setIsMusicPickerOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<SelectedTrack | null>(null);

  // Filters State
  const visualFilters = [
    { name: "Normal", class: "" },
    { name: "Cinematic Glow", class: "brightness-[1.1] saturate-[1.15] contrast-[1.1] hue-rotate-[5deg]" },
    { name: "Vintage Dream", class: "sepia-[0.35] brightness-[0.95] contrast-[0.9] saturate-[0.85]" },
    { name: "Cyber Punk", class: "saturate-[1.4] hue-rotate-[320deg] brightness-[1.05]" },
    { name: "Noir Mono", class: "grayscale-[1] contrast-[1.2]" },
    { name: "Golden Sunset", class: "sepia-[0.25] saturate-[1.3] brightness-[1.05]" },
  ];
  const [selectedFilter, setSelectedFilter] = useState(visualFilters[0]);

  // Adjustments State
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturate, setSaturate] = useState(100);
  const [showAdjustPanel, setShowAdjustPanel] = useState(false);

  // Text Overlay State
  const [textOverlay, setTextOverlay] = useState("");
  const [showTextControl, setShowTextControl] = useState(false);

  // Details States
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [privacy, setPrivacy] = useState("public");

  // Upload Stepper States
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      const isVideo = selected.type.startsWith("video/");
      setMediaType(isVideo ? "video" : "image");
      setPreviewUrl(URL.createObjectURL(selected));
      setCreationStep("enhance");
      audioHaptics.playTap();
    }
  };

  const handleFinalPublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const currentAuthor = account || "0x2db4b41ce192d3daaacbd23e87690c3d024c9e7e";

    try {
      setIsUploading(true);
      audioHaptics.playSend();
      setStatusMessage("Optimizing & uploading media...");

      const fileToUpload = file.type.startsWith("image/")
        ? await compressImage(file, { maxWidth: 1600, quality: 0.85 })
        : file;

      const formData = new FormData();
      formData.append("file", fileToUpload);

      const uploadRes = await fetch("/api/storage/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Media upload failed");
      const uploadData = await uploadRes.json();
      const mediaUrl = uploadData.url;
      const mediaCid = uploadData.cid || "";

      setStatusMessage("Saving to database...");

      if (mediaType === "video") {
        const pulseRes = await fetch("/api/pulse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            authorAddress: currentAuthor,
            videoUrl: mediaUrl,
            videoCid: mediaCid,
            caption,
            hashtags: caption.match(/#[a-zA-Z0-9_]+/g)?.join(" ") || "",
            category: "General",
            audioTitle: selectedTrack?.title || "Original Sound",
            audioId: selectedTrack?.id || null,
            filterName: selectedFilter.name,
            privacy: privacy === "public" ? "Everyone" : "Private",
          }),
        });

        if (!pulseRes.ok) throw new Error("Failed to save short video to database.");
        appCache.clear();
        router.push("/pulse");
      } else {
        const postRes = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            authorAddress: currentAuthor,
            caption,
            mediaUrl,
            mediaCid,
            mediaType: "image",
            location,
            privacy,
          }),
        });

        if (!postRes.ok) throw new Error("Failed to save post to database.");
        appCache.clear();
        router.push("/feed");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("pulse_post_created"));
        }
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage(err.message || "Failed to publish. Please try again.");
      setIsUploading(false);
    }
  };

  const adjustStyle = {
    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`,
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 text-left pb-12 animate-fadeIn select-none">
      
      {/* Music Picker Bottom Sheet Modal */}
      <MusicPickerModal
        isOpen={isMusicPickerOpen}
        onClose={() => setIsMusicPickerOpen(false)}
        onSelectTrack={(track) => setSelectedTrack(track)}
        selectedTrackId={selectedTrack?.id}
      />

      {/* Top Workflow Stepper Navigation */}
      <div className="flex items-center justify-between px-2 pt-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-[#00B7FF] via-[#7EDBE8] to-[#F45AA8] flex items-center justify-center text-slate-950 shadow-sm font-black text-xs">
            {creationStep === "upload" ? "1" : creationStep === "enhance" ? "2" : "3"}
          </div>
          <div>
            <h1 className="font-black text-sm text-slate-900 dark:text-white">
              {creationStep === "upload" && "Select Content"}
              {creationStep === "enhance" && "Creative Studio"}
              {creationStep === "publish" && "Publish Details"}
            </h1>
            <p className="text-[10px] text-slate-400 font-bold">
              {creationStep === "upload" && "Upload photo or reel from your device"}
              {creationStep === "enhance" && "Add music, filters, adjustments & text overlay"}
              {creationStep === "publish" && "Add caption, location and share"}
            </p>
          </div>
        </div>

        {/* Step Indicator Badges */}
        <div className="flex items-center gap-1 text-[11px] font-black text-slate-400">
          <span className={creationStep === "upload" ? "text-[#00B7FF]" : ""}>Upload</span>
          <span>→</span>
          <span className={creationStep === "enhance" ? "text-[#00B7FF]" : ""}>Edit</span>
          <span>→</span>
          <span className={creationStep === "publish" ? "text-[#00B7FF]" : ""}>Share</span>
        </div>
      </div>

      {/* STEP 1: UPLOAD MEDIA */}
      {creationStep === "upload" && (
        <div className="p-8 rounded-[32px] glass-card border border-white/80 dark:border-white/10 text-center space-y-5">
          <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#00B7FF] rounded-[28px] p-10 block cursor-pointer transition-colors glass-panel group btn-tactile">
            <UploadCloud className="w-14 h-14 text-[#00B7FF] mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-black text-sm text-slate-900 dark:text-white">
              Choose Photo or Video to Upload
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto font-medium">
              High resolution JPG, PNG, WEBP images or MP4, MOV short videos
            </p>
            <span className="inline-block mt-4 px-6 py-2.5 rounded-full bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 font-black text-xs shadow-md">
              Browse Device Files
            </span>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* STEP 2: CREATIVE STUDIO */}
      {creationStep === "enhance" && previewUrl && (
        <div className="space-y-4">
          {/* Visual Preview Canvas */}
          <div className="relative rounded-[28px] overflow-hidden bg-slate-950 max-h-[440px] flex items-center justify-center border border-white/80 dark:border-white/10 shadow-glass">
            {mediaType === "video" ? (
              <video
                src={previewUrl}
                controls
                playsInline
                className={`w-full h-full max-h-[440px] object-contain ${selectedFilter.class}`}
                style={adjustStyle}
              />
            ) : (
              <img
                src={previewUrl}
                alt="Studio preview"
                className={`w-full h-full max-h-[440px] object-contain ${selectedFilter.class}`}
                style={adjustStyle}
              />
            )}

            {/* Text Overlay */}
            {textOverlay && (
              <div className="absolute inset-x-4 bottom-16 flex justify-center pointer-events-none">
                <div className="glass-dock px-4 py-2 rounded-2xl text-white font-black text-xs text-center shadow-lg">
                  {textOverlay}
                </div>
              </div>
            )}

            {/* Selected Music Badge */}
            {selectedTrack && (
              <div className="absolute top-3 left-3 z-20 px-3 py-1.5 rounded-full glass-dock text-white text-xs font-bold flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-[#00B7FF] animate-pulse" />
                <span className="truncate max-w-[130px]">{selectedTrack.title}</span>
              </div>
            )}
          </div>

          {/* Enhancement Toolbar */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold select-none">
            <button
              onClick={() => setIsMusicPickerOpen(true)}
              className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-1 cursor-pointer btn-tactile ${
                selectedTrack
                  ? "bg-cyan-500/15 border-[#00B7FF] text-[#00B7FF] font-black"
                  : "glass-pill text-slate-700 dark:text-slate-200 hover:text-slate-900"
              }`}
            >
              <Music className="w-4 h-4" />
              <span>{selectedTrack ? "Music Added" : "Music"}</span>
            </button>

            <button
              onClick={() => {
                setShowAdjustPanel(!showAdjustPanel);
                setShowTextControl(false);
              }}
              className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-1 cursor-pointer btn-tactile ${
                showAdjustPanel
                  ? "bg-cyan-500/15 border-[#00B7FF] text-[#00B7FF] font-black"
                  : "glass-pill text-slate-700 dark:text-slate-200 hover:text-slate-900"
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Adjust</span>
            </button>

            <button
              onClick={() => {
                setShowTextControl(!showTextControl);
                setShowAdjustPanel(false);
              }}
              className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-1 cursor-pointer btn-tactile ${
                showTextControl || textOverlay
                  ? "bg-cyan-500/15 border-[#00B7FF] text-[#00B7FF] font-black"
                  : "glass-pill text-slate-700 dark:text-slate-200 hover:text-slate-900"
              }`}
            >
              <Type className="w-4 h-4" />
              <span>Text</span>
            </button>

            <button
              onClick={() => {
                audioHaptics.playTap();
                setCreationStep("publish");
              }}
              className="p-3 rounded-2xl bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 font-black shadow-md flex flex-col items-center gap-1 cursor-pointer btn-tactile"
            >
              <ChevronRight className="w-4 h-4" />
              <span>Next</span>
            </button>
          </div>

          {/* Adjust Panel */}
          {showAdjustPanel && (
            <div className="p-4 rounded-3xl glass-card border border-white/80 dark:border-white/10 space-y-3 animate-fadeIn">
              <h4 className="font-black text-xs text-slate-900 dark:text-white">Color Adjustments</h4>
              
              <div className="space-y-2 text-xs font-bold">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Brightness</span>
                  <input
                    type="range"
                    min={50}
                    max={150}
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-44 accent-[#00B7FF] cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-slate-400">{brightness}%</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Contrast</span>
                  <input
                    type="range"
                    min={50}
                    max={150}
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-44 accent-[#00B7FF] cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-slate-400">{contrast}%</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Saturation</span>
                  <input
                    type="range"
                    min={50}
                    max={150}
                    value={saturate}
                    onChange={(e) => setSaturate(Number(e.target.value))}
                    className="w-44 accent-[#00B7FF] cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-slate-400">{saturate}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Text Input Panel */}
          {showTextControl && (
            <div className="p-3 rounded-2xl glass-card border border-white/80 dark:border-white/10 space-y-2 animate-fadeIn">
              <input
                type="text"
                placeholder="Type text sticker..."
                value={textOverlay}
                onChange={(e) => setTextOverlay(e.target.value)}
                className="w-full p-2.5 rounded-xl glass-input text-xs font-semibold text-slate-900 dark:text-white outline-none"
              />
            </div>
          )}

          {/* Filters Carousel */}
          <div className="space-y-2">
            <h4 className="font-black text-xs text-slate-800 dark:text-slate-200 px-1">Visual Filters</h4>
            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar text-xs font-bold">
              {visualFilters.map((f) => (
                <button
                  key={f.name}
                  onClick={() => {
                    audioHaptics.playTap();
                    setSelectedFilter(f);
                  }}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer btn-tactile ${
                    selectedFilter.name === f.name
                      ? "bg-[#00B7FF] text-slate-950 font-black shadow-sm"
                      : "glass-pill text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: PUBLISH DETAILS */}
      {creationStep === "publish" && (
        <form onSubmit={handleFinalPublish} className="space-y-4">
          <div className="p-6 rounded-[32px] glass-card border border-white/80 dark:border-white/10 space-y-4 shadow-glass">
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
                Caption & Hashtags
              </label>
              <textarea
                rows={3}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Share your thoughts, hashtags, or mention creators..."
                className="w-full p-3.5 rounded-2xl glass-input text-xs font-semibold text-slate-900 dark:text-white outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
                Location (Optional)
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Mumbai, India"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl glass-input text-xs font-semibold text-slate-900 dark:text-white outline-none"
                />
              </div>
            </div>

            {selectedTrack && (
              <div className="p-3 rounded-2xl glass-panel border border-cyan-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-[#00B7FF]" />
                  <div>
                    <p className="font-black text-xs text-[#00B7FF]">{selectedTrack.title}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{selectedTrack.artist} • {selectedTrack.category}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMusicPickerOpen(true)}
                  className="text-xs font-black text-cyan-400 hover:underline cursor-pointer"
                >
                  Change
                </button>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCreationStep("enhance")}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold glass-pill text-slate-500 hover:text-slate-900 cursor-pointer inline-flex items-center gap-1 btn-tactile"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to Edit</span>
              </button>

              <button
                type="submit"
                disabled={isUploading}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#00B7FF] via-[#7EDBE8] to-[#F45AA8] text-slate-950 font-black text-xs shadow-md hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 inline-flex items-center gap-2 btn-tactile"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <span>Publish Content 🚀</span>
                )}
              </button>
            </div>

            {statusMessage && (
              <p className="text-center text-[11px] font-black text-cyan-500">{statusMessage}</p>
            )}
          </div>
        </form>
      )}

    </div>
  );
}
