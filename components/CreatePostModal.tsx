"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  UploadCloud, 
  ShieldCheck, 
  Sparkles, 
  MapPin, 
  Lock, 
  Loader2, 
  X,
  Info,
  ExternalLink,
  Music,
  Sliders,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  Type
} from "lucide-react";
import { useWeb3 } from "../lib/web3Context";
import { generateContentHash } from "../lib/contract-helper";

interface Song {
  id: string;
  title: string;
  artist: string;
  url: string;
}

export function CreatePostModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialAudioId = searchParams.get("audioId") || null;
  const initialAudioTitle = searchParams.get("audioTitle") || null;
  const initialFilter = searchParams.get("filterName") || null;

  const { account, isWeb3Connected, connectWallet, registerProofOnChain, mintNftOnChain } = useWeb3();

  // Workflow Stepper state
  const [creationStep, setCreationStep] = useState<"upload" | "enhance" | "publish">("upload");

  // Media upload state
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");

  // Enhancement States
  const [audioList, setAudioList] = useState<Song[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(initialAudioId);
  const [selectedAudioTitle, setSelectedAudioTitle] = useState<string | null>(initialAudioTitle || "Original Sound");
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioPreviewObj, setAudioPreviewObj] = useState<HTMLAudioElement | null>(null);

  // Filters State
  const visualFilters = [
    { name: "Cinematic Glow", class: "brightness-[1.1] saturate-[1.15] contrast-[1.1] hue-rotate-[5deg]" },
    { name: "Vintage Dream", class: "sepia-[0.35] brightness-[0.95] contrast-[0.9] saturate-[0.85]" },
    { name: "Cyber Punk Glow", class: "saturate-[1.4] hue-rotate-[320deg] brightness-[1.05]" },
    { name: "Retro Film Vibe", class: "sepia-[0.15] contrast-[1.05] brightness-[1.02]" },
    { name: "Aesthetic Portrait", class: "contrast-[0.95] saturate-[1.05] brightness-[1.03]" },
    { name: "AI Dreamscape", class: "hue-rotate-[180deg] saturate-[1.5] brightness-[1.1]" },
    { name: "Noir Film", class: "grayscale-[1] contrast-[1.2]" },
    { name: "None", class: "" }
  ];
  const [selectedFilter, setSelectedFilter] = useState(
    visualFilters.find(f => f.name === initialFilter) || visualFilters[7]
  );

  // Text Overlay State
  const [textOverlay, setTextOverlay] = useState("");
  const [showTextControl, setShowTextControl] = useState(false);

  // Details States
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [privacy, setPrivacy] = useState("public");
  
  // Optional Blockchain Toggles
  const [isBlockchainProofEnabled, setIsBlockchainProofEnabled] = useState(false);
  const [mintAsNft, setMintAsNft] = useState(false);
  const [showTxExplanation, setShowTxExplanation] = useState(false);

  // Upload/Transaction Stepper States
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [stepperStep, setStepperStep] = useState<"idle" | "ipfs" | "hash" | "contract" | "nft" | "done">("idle");

  // Fetch audio tracks on mount
  useEffect(() => {
    fetch("/api/audio")
      .then(res => res.json())
      .then(data => {
        if (data.audio) setAudioList(data.audio);
      })
      .catch(e => console.error("Failed to load tracks:", e));
  }, []);

  // Cleanup audio preview on unmount
  useEffect(() => {
    return () => {
      if (audioPreviewObj) {
        audioPreviewObj.pause();
      }
    };
  }, [audioPreviewObj]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      const isVideo = selected.type.startsWith("video/");
      setMediaType(isVideo ? "video" : "image");
      setPreviewUrl(URL.createObjectURL(selected));
      setCreationStep("enhance");
    }
  };

  const handleAudioPlayback = (track: Song) => {
    if (playingAudioId === track.id) {
      if (audioPreviewObj) audioPreviewObj.pause();
      setPlayingAudioId(null);
    } else {
      if (audioPreviewObj) audioPreviewObj.pause();
      const audio = new Audio(track.url);
      audio.play().catch(e => console.warn(e));
      setAudioPreviewObj(audio);
      setPlayingAudioId(track.id);
      audio.onended = () => setPlayingSongId(null);
    }
  };

  const selectAudioTrack = (track: Song) => {
    setSelectedAudioId(track.id);
    setSelectedAudioTitle(track.title);
  };

  const setPlayingSongId = (id: string | null) => {
    setPlayingAudioId(id);
  };

  const handleCheckboxChange = (type: "proof" | "nft", checked: boolean) => {
    if (type === "proof") {
      setIsBlockchainProofEnabled(checked);
      if (checked) setShowTxExplanation(true);
    } else {
      setMintAsNft(checked);
      if (checked) setShowTxExplanation(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("Please select a photo or video first.");
      return;
    }

    const requiresWeb3 = isBlockchainProofEnabled || mintAsNft;
    if (requiresWeb3 && !isWeb3Connected) {
      alert("Please connect your wallet to execute smart contract operations.");
      await connectWallet();
      return;
    }

    try {
      setIsUploading(true);
      
      // Step 1: Upload to IPFS
      setStepperStep("ipfs");
      setStatusMessage("Uploading media file to IPFS storage network...");
      const formData = new FormData();
      formData.append("file", file);
      
      const ipfsRes = await fetch("/api/ipfs/upload", {
        method: "POST",
        body: formData,
      });

      if (!ipfsRes.ok) throw new Error("IPFS media upload failed");
      const ipfsData = await ipfsRes.json();
      const mediaCid = ipfsData.cid;
      const mediaUrl = ipfsData.url;

      // Step 2: Compute cryptographic content fingerprint
      setStepperStep("hash");
      setStatusMessage("Generating cryptographic content fingerprint...");
      const contentHash = generateContentHash(mediaCid, caption, account || "0x0000000000000000000000000000000000000000");

      let txHash = null;
      let nftTokenId = null;
      let nftTxHash = null;

      // Step 3: Register proof on blockchain (Optional)
      if (isBlockchainProofEnabled && isWeb3Connected) {
        setStepperStep("contract");
        setStatusMessage("Anchoring content proof on-chain via smart contract...");
        const metadataCid = `ipfs://${mediaCid}`;
        txHash = await registerProofOnChain(contentHash, metadataCid);
      }

      // Step 4: Optional NFT Minting
      if (mintAsNft && isWeb3Connected) {
        setStepperStep("nft");
        setStatusMessage("Minting post as verifiable ERC721 Creator NFT...");
        const metadataCid = `ipfs://${mediaCid}`;
        const nftResult = await mintNftOnChain(Date.now().toString(), contentHash, metadataCid);
        if (nftResult) {
          nftTokenId = nftResult.tokenId;
          nftTxHash = nftResult.txHash;
        }
      }

      // Step 5: Save record to local database
      setStatusMessage("Saving post details to social database...");
      
      if (mediaType === "video") {
        // Save to Pulse (reels/short-video table)
        const pulseRes = await fetch("/api/pulse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            authorAddress: account,
            videoUrl: mediaUrl,
            videoCid: mediaCid,
            caption,
            hashtags: caption.match(/#[a-zA-Z0-9_]+/g)?.join(" ") || "",
            category: "General",
            audioTitle: selectedAudioTitle,
            audioId: selectedAudioId,
            filterName: selectedFilter.name,
            privacy: privacy === "public" ? "Everyone" : "Private"
          }),
        });

        if (!pulseRes.ok) throw new Error("Failed to save short video to database.");
      } else {
        // Save to standard post table
        const postRes = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            authorAddress: account,
            caption,
            mediaUrl,
            mediaCid,
            mediaType,
            location,
            privacy,
            contentHash,
            txHash,
            isNft: mintAsNft,
            nftTokenId,
            nftTxHash,
          }),
        });

        if (!postRes.ok) {
          const errorData = await postRes.json();
          throw new Error(errorData.error || "Failed to save standard post");
        }
      }

      setStepperStep("done");
      setStatusMessage("Published successfully!");
      setTimeout(() => {
        router.push(mediaType === "video" ? "/pulse" : "/feed");
      }, 1500);

    } catch (error: any) {
      alert(`Error creating post: ${error.message}`);
      setStepperStep("idle");
    } finally {
      setIsUploading(false);
    }
  };

  const currentWalletDisplay = isWeb3Connected
    ? `🟢 Connected Address: ${account.slice(0, 6)}...${account.slice(-4)}`
    : "⚪ Guest Account (Offline Mode - Social Only)";

  return (
    <div className="max-w-2xl mx-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-2xl p-6 sm:p-8 text-left transition-all duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Sparkles className="w-6 h-6 text-[#00B7FF]" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Creation Workspace</h2>
            <p className="text-xs text-slate-400 font-semibold">{currentWalletDisplay}</p>
          </div>
        </div>
      </div>

      {/* STEP 1: UPLOAD WORKSPACE */}
      {creationStep === "upload" && (
        <div className="space-y-6">
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center hover:border-cyan-500 transition-colors bg-slate-50/50 dark:bg-slate-900/50">
            <label className="cursor-pointer flex flex-col items-center justify-center">
              <UploadCloud className="w-12 h-12 text-cyan-500 mb-3 animate-bounce" />
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Click to upload photo or short video
              </span>
              <span className="text-xs text-slate-400 mt-1.5 font-semibold">
                Supports MP4, MOV, PNG, JPG, WEBP (Max 50MB)
              </span>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* STEP 2: ENHANCE WORKSPACE */}
      {creationStep === "enhance" && previewUrl && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Visual Preview Side */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Visual Canvas Preview</span>
              <div className="relative rounded-3xl overflow-hidden bg-slate-950 flex items-center justify-center aspect-[9/14] max-h-[380px] border border-slate-800">
                
                {mediaType === "video" ? (
                  <video 
                    src={previewUrl} 
                    controls 
                    loop 
                    className={`w-full h-full object-cover ${selectedFilter.class}`} 
                  />
                ) : (
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className={`w-full h-full object-cover ${selectedFilter.class}`} 
                  />
                )}

                {/* Floating Text Overlay */}
                {textOverlay && (
                  <div className="absolute top-1/3 inset-x-4 text-center px-4 py-2 bg-black/55 text-white font-extrabold text-xs tracking-wide rounded-xl backdrop-blur-sm pointer-events-none">
                    {textOverlay}
                  </div>
                )}

                {/* Close/Remove btn */}
                <button
                  onClick={() => {
                    setFile(null);
                    setPreviewUrl(null);
                    setCreationStep("upload");
                  }}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-rose-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Editing Controls Side */}
            <div className="space-y-5">
              
              {/* Text Control */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowTextControl(!showTextControl)}
                  className="flex items-center gap-1.5 text-xs font-extrabold text-[#00B7FF] hover:opacity-80"
                >
                  <Type className="w-4 h-4" />
                  <span>Add Overlay Text</span>
                </button>
                {showTextControl && (
                  <input
                    type="text"
                    value={textOverlay}
                    onChange={(e) => setTextOverlay(e.target.value)}
                    placeholder="Type overlay text to burn into canvas..."
                    className="w-full p-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                )}
              </div>

              {/* Visual Filters list */}
              <div className="space-y-2 text-left">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Sliders className="w-4 h-4 text-cyan-400" /> Choose Filter Effect
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1 no-scrollbar">
                  {visualFilters.map((f) => (
                    <button
                      key={f.name}
                      type="button"
                      onClick={() => setSelectedFilter(f)}
                      className={`p-2 rounded-xl text-[10px] font-bold text-center border transition-all truncate cursor-pointer ${
                        selectedFilter.name === f.name
                          ? "bg-[#00B7FF]/10 border-[#00B7FF] text-[#00B7FF]"
                          : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-350 hover:bg-slate-100"
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Music Backing Tracks (For Videos) */}
              {mediaType === "video" && (
                <div className="space-y-2 text-left">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Music className="w-4 h-4 text-purple-400" /> Backing Sound Track
                  </label>
                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1 no-scrollbar">
                    {audioList.map((track) => (
                      <div 
                        key={track.id}
                        className={`flex items-center justify-between p-2 rounded-xl border transition-colors ${
                          selectedAudioId === track.id
                            ? "bg-purple-500/10 border-purple-500/35"
                            : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        <div className="min-w-0 text-left">
                          <p className="text-[10px] font-black text-slate-900 dark:text-white truncate">{track.title}</p>
                          <p className="text-[9px] text-slate-450 font-bold truncate">{track.artist}</p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleAudioPlayback(track)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-550 dark:text-slate-350"
                          >
                            {playingAudioId === track.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => selectAudioTrack(track)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-[9px] uppercase tracking-wider ${
                              selectedAudioId === track.id
                                ? "bg-purple-500 text-white"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            Select
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              onClick={() => setCreationStep("upload")}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-550 dark:text-slate-350 hover:bg-slate-100"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setCreationStep("publish")}
              className="px-5 py-2.5 rounded-xl bg-[#00B7FF] text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

        </div>
      )}

      {/* STEP 3: PUBLISH DETAILS & WEB3 SETTINGS */}
      {creationStep === "publish" && (
        <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-300">
          
          {/* Caption */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
              Caption & #Hashtags
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              required
              placeholder="Write your story... Use hashtags #Web3 #AI to tag trending indices."
              className="w-full p-4 text-xs sm:text-sm rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#00B7FF] transition-colors"
            />
          </div>

          {/* Details Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. MetaWorld / Singapore"
                className="w-full p-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-purple-400" /> Visibility
              </label>
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value)}
                className="w-full p-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="public">Everyone (Public)</option>
                <option value="followers">Followers Only</option>
                <option value="private">Private (Only Me)</option>
              </select>
            </div>
          </div>

          {/* Optional smart contract properties */}
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Anchor Blockchain Proof</p>
                  <p className="text-[10px] text-slate-400">Anchor cryptographic content hash to smart contract proof ledger</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isBlockchainProofEnabled}
                onChange={(e) => handleCheckboxChange("proof", e.target.checked)}
                className="w-5 h-5 accent-cyan-500 rounded cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-purple-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Mint as Creator NFT</p>
                  <p className="text-[10px] text-slate-400">Mint ownership token representing this visual asset in your wallet</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={mintAsNft}
                onChange={(e) => handleCheckboxChange("nft", e.target.checked)}
                className="w-5 h-5 accent-purple-600 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Smart Contract Explanation details */}
          {showTxExplanation && (isBlockchainProofEnabled || mintAsNft) && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <Info className="w-4 h-4 animate-bounce" />
                  <span>Blockchain Transactions Required</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowTxExplanation(false)} 
                  className="text-slate-400 hover:text-white font-bold"
                >
                  Hide
                </button>
              </div>
              
              <div className="space-y-1.5 font-mono text-[10px] text-slate-350">
                {isBlockchainProofEnabled && (
                  <div>
                    <span className="text-slate-500">Proof Anchor address:</span>{" "}
                    <span className="text-cyan-400">0x5FbDB2315678afecb367f032d93F642f64180aa3</span>
                  </div>
                )}
                {mintAsNft && (
                  <div>
                    <span className="text-slate-500">NFT ERC721 address:</span>{" "}
                    <span className="text-purple-400">0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 text-slate-400">
                  <span>Estimated gas fee:</span>
                  <span className="text-amber-400 font-bold">~0.001 ETH (Local Network)</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal pt-1 font-sans">
                  MetaMask will prompt you to authorize this signature call. This ensures your creation is permanently time-stamped and registered under your ownership profile.
                </p>
              </div>
            </div>
          )}

          {/* Status Stepper Loader */}
          {isUploading && (
            <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{statusMessage}</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-cyan-400 h-full transition-all duration-500"
                  style={{
                    width:
                      stepperStep === "ipfs"
                        ? "25%"
                        : stepperStep === "hash"
                        ? "50%"
                        : stepperStep === "contract"
                        ? "75%"
                        : stepperStep === "nft" || stepperStep === "done"
                        ? "100%"
                        : "10%",
                  }}
                />
              </div>
            </div>
          )}

          {/* Stepper controls */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              onClick={() => setCreationStep("enhance")}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-300 hover:bg-slate-100 text-xs font-bold"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 text-white font-extrabold text-xs shadow-md cursor-pointer"
            >
              {isUploading ? "Uploading..." : (isBlockchainProofEnabled || mintAsNft) ? "Publish & Register Proof" : "Publish to Aura"}
            </button>
          </div>

        </form>
      )}

    </div>
  );
}
