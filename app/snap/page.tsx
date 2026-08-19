"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/authContext";
import { 
  Camera, 
  SwitchCamera, 
  Image as ImageIcon, 
  Send, 
  X, 
  Sparkles, 
  Flame, 
  Clock, 
  Check, 
  Users, 
  Search, 
  Loader2, 
  Inbox, 
  Play, 
  CheckCheck, 
  AlertCircle, 
  Smile, 
  Type, 
  RefreshCw,
  Plus
} from "lucide-react";
import { SnapViewerModal } from "../../components/SnapViewerModal";
import { audioHaptics } from "../../lib/audioHaptics";
import { compressImage } from "../../lib/imageCompression";
import { appCache } from "../../lib/cache";

interface FriendItem {
  walletAddress: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  currentStreak: number;
  streakStatus: "active_today" | "pending_my_snap" | "pending_their_snap" | "no_streak";
  lastSnapAt: string | null;
}

interface ReceivedSnapItem {
  id: string;
  senderAddress: string;
  mediaUrl: string;
  mediaType: string;
  caption?: string | null;
  duration?: number;
  isOpened: boolean;
  openedAt?: string | null;
  createdAt: string;
  streakCount?: number;
  sender: {
    displayName: string;
    username: string;
    avatarUrl: string;
  };
}

interface SentSnapItem {
  id: string;
  receiverAddress: string;
  mediaUrl: string;
  mediaType: string;
  caption?: string | null;
  duration?: number;
  isOpened: boolean;
  openedAt?: string | null;
  createdAt: string;
  streakCount?: number;
  receiver: {
    displayName: string;
    username: string;
    avatarUrl: string;
  };
}

export default function SnapPage() {
  const router = useRouter();
  const { account, isLoggedIn } = useAuth();

  const [activeTab, setActiveTab] = useState<"camera" | "inbox" | "streaks">("camera");

  // Camera & Capture State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  
  // Captured Media State
  const [capturedMediaUrl, setCapturedMediaUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [snapCaption, setSnapCaption] = useState("");
  const [snapDuration, setSnapDuration] = useState(6);
  const [showCaptionInput, setShowCaptionInput] = useState(false);

  // Send Drawer State
  const [isSendDrawerOpen, setIsSendDrawerOpen] = useState(false);
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [friendSearch, setFriendSearch] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Inbox & Viewer State
  const [receivedSnaps, setReceivedSnaps] = useState<ReceivedSnapItem[]>([]);
  const [sentSnaps, setSentSnaps] = useState<SentSnapItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeViewingSnap, setActiveViewingSnap] = useState<ReceivedSnapItem | null>(null);
  const [isLoadingInbox, setIsLoadingInbox] = useState(false);

  // 1. Initialize Camera
  const startCamera = useCallback(async () => {
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: false,
      });

      setStream(mediaStream);
      setHasCameraPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn("Camera access not available or denied:", err);
      setHasCameraPermission(false);
    }
  }, [facingMode]);

  // Stop camera when not on camera tab or unmounting
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    if (activeTab === "camera" && !capturedMediaUrl) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab, capturedMediaUrl, facingMode]);

  // 2. Fetch Data (Snaps & Friends with Streaks)
  const fetchSnapsData = useCallback(async () => {
    if (!account) return;
    try {
      setIsLoadingInbox(true);
      const [snapsRes, friendsRes] = await Promise.all([
        fetch(`/api/snaps?userAddress=${account}`),
        fetch(`/api/snaps/friends?userAddress=${account}`),
      ]);

      if (snapsRes.ok) {
        const snapsData = await snapsRes.json();
        setReceivedSnaps(snapsData.received || []);
        setSentSnaps(snapsData.sent || []);
        setUnreadCount(snapsData.unreadCount || 0);
      }

      if (friendsRes.ok) {
        const friendsData = await friendsRes.json();
        setFriends(friendsData.friends || []);
      }
    } catch (err) {
      console.error("Failed to load snaps/friends data:", err);
    } finally {
      setIsLoadingInbox(false);
    }
  }, [account]);

  useEffect(() => {
    if (account) {
      fetchSnapsData();
    }
  }, [account, fetchSnapsData]);

  // Handle Photo Capture from Live Video
  const handleCapturePhoto = () => {
    audioHaptics.playTap();
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 1280;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle mirror effect for front camera
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `snap_${Date.now()}.jpg`, { type: "image/jpeg" });
        setCapturedFile(file);
        setCapturedMediaUrl(URL.createObjectURL(blob));
        stopCamera();
      }
    }, "image/jpeg", 0.9);
  };

  // Handle Upload from Gallery
  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCapturedFile(file);
      setCapturedMediaUrl(URL.createObjectURL(file));
      stopCamera();
    }
  };

  // Switch camera between front and rear
  const toggleCamera = () => {
    audioHaptics.playTap();
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  // Discard captured media
  const handleDiscardCapture = () => {
    audioHaptics.playTap();
    if (capturedMediaUrl && capturedMediaUrl.startsWith("blob:")) {
      URL.revokeObjectURL(capturedMediaUrl);
    }
    setCapturedMediaUrl(null);
    setCapturedFile(null);
    setSnapCaption("");
    setIsSendDrawerOpen(false);
    setSelectedFriends([]);
  };

  // Toggle friend selection for sending
  const toggleSelectFriend = (addr: string) => {
    audioHaptics.playTap();
    setSelectedFriends((prev) =>
      prev.includes(addr) ? prev.filter((a) => a !== addr) : [...prev, addr]
    );
  };

  // Send Snap to selected friends
  const handleSendSnap = async () => {
    if (!capturedFile || selectedFriends.length === 0) return;
    if (!account) {
      router.push("/login");
      return;
    }

    try {
      setIsSending(true);
      audioHaptics.playTap();

      // 1. Compress photo & upload media to storage
      const fileToUpload = capturedFile.type.startsWith("image/")
        ? await compressImage(capturedFile, { maxWidth: 1400, quality: 0.85 })
        : capturedFile;

      const formData = new FormData();
      formData.append("file", fileToUpload);

      const uploadRes = await fetch("/api/storage/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Failed to upload snap image");
      const uploadData = await uploadRes.json();
      const mediaUrl = uploadData.url;

      // 2. Post Snap to selected friends
      const res = await fetch("/api/snaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderAddress: account,
          receiverAddresses: selectedFriends,
          mediaUrl,
          mediaType: "image",
          caption: snapCaption || null,
          duration: snapDuration,
        }),
      });

      if (!res.ok) throw new Error("Failed to deliver snap");

      handleDiscardCapture();
      fetchSnapsData();
      triggerToast(`👻 Snap sent to ${selectedFriends.length} friend${selectedFriends.length > 1 ? "s" : ""}! Streak updated!`);
      setActiveTab("inbox");
    } catch (err: any) {
      console.error(err);
      triggerToast("Failed to send snap. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenReceivedSnap = (snap: ReceivedSnapItem) => {
    setActiveViewingSnap(snap);
  };

  const handleSnapOpenedCallback = (snapId: string) => {
    setReceivedSnaps((prev) =>
      prev.map((s) => (s.id === snapId ? { ...s, isOpened: true, openedAt: new Date().toISOString() } : s))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleQuickSnapBack = (friendAddress: string) => {
    setSelectedFriends([friendAddress]);
    setActiveTab("camera");
    if (!capturedMediaUrl) {
      startCamera();
    }
  };

  const filteredFriends = friends.filter(
    (f) =>
      f.displayName.toLowerCase().includes(friendSearch.toLowerCase()) ||
      f.username.toLowerCase().includes(friendSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full space-y-3 pb-8 text-slate-800 dark:text-slate-100 animate-in fade-in select-none">
      
      {/* Hidden Canvas for Video Frame Capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Header / Navigation Tabs */}
      <div className="flex items-center justify-between px-2 pt-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-[#00B7FF] to-[#F45AA8] p-0.5 flex items-center justify-center shadow-sm">
            <span className="text-base">👻</span>
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">Aura Snap</h1>
            <p className="text-[10px] text-slate-400 font-semibold">Instant snaps & daily streaks</p>
          </div>
        </div>

        {/* Tab Pills */}
        <div className="flex bg-slate-200/60 dark:bg-slate-900/80 p-1 rounded-2xl border border-slate-300/40 dark:border-slate-800 text-xs font-black">
          <button
            onClick={() => {
              audioHaptics.playTap();
              setActiveTab("camera");
            }}
            className={`px-3 py-1 rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === "camera"
                ? "bg-[#00B7FF] text-slate-950 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Snap</span>
          </button>

          <button
            onClick={() => {
              audioHaptics.playTap();
              setActiveTab("inbox");
            }}
            className={`px-3 py-1 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer relative ${
              activeTab === "inbox"
                ? "bg-[#00B7FF] text-slate-950 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Inbox</span>
            {unreadCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#F45AA8] animate-pulse" />
            )}
          </button>

          <button
            onClick={() => {
              audioHaptics.playTap();
              setActiveTab("streaks");
            }}
            className={`px-3 py-1 rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === "streaks"
                ? "bg-[#00B7FF] text-slate-950 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            <span>👻 Streaks</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-slate-900/95 text-white border border-[#00B7FF]/40 shadow-2xl text-xs font-black flex items-center gap-2 animate-in slide-in-from-top-3">
          <Sparkles className="w-4 h-4 text-[#00B7FF]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: CAMERA & CAPTURE VIEW */}
      {/* ========================================================================= */}
      {activeTab === "camera" && (
        <div className="flex-1 flex flex-col justify-between relative rounded-3xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl min-h-[480px]">
          
          {/* Main Viewfinder / Canvas */}
          {!capturedMediaUrl ? (
            <div className="relative w-full h-full flex-1 flex items-center justify-center overflow-hidden bg-slate-950">
              {hasCameraPermission === false ? (
                <div className="text-center p-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-400">
                    <Camera className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-slate-300 font-bold">Camera Access Disabled or Unavailable</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    You can still pick any photo or video from your device gallery to send snaps and build streaks!
                  </p>
                  <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#00B7FF] text-slate-950 text-xs font-black cursor-pointer shadow-md">
                    <ImageIcon className="w-4 h-4" />
                    <span>Upload from Gallery</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleGalleryUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
                />
              )}

              {/* Top Viewfinder Controls */}
              <div className="absolute top-4 inset-x-4 flex justify-between items-center z-20">
                <button
                  onClick={toggleCamera}
                  className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all cursor-pointer"
                  title="Flip Camera"
                >
                  <SwitchCamera className="w-4.5 h-4.5" />
                </button>

                <div className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-[10px] font-black tracking-widest uppercase border border-white/10 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Live</span>
                </div>

                <label className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all cursor-pointer">
                  <ImageIcon className="w-4.5 h-4.5" />
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleGalleryUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          ) : (
            /* Preview of Captured / Uploaded Media */
            <div className="relative w-full h-full flex-1 flex items-center justify-center overflow-hidden bg-black">
              <img
                src={capturedMediaUrl}
                alt="Captured Snap"
                className="w-full h-full object-cover"
              />

              {/* Caption Overlay */}
              {snapCaption && (
                <div className="absolute inset-x-4 bottom-24 flex justify-center pointer-events-none">
                  <div className="bg-black/60 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/20 text-white font-black text-sm tracking-wide text-center max-w-[90%] shadow-2xl">
                    {snapCaption}
                  </div>
                </div>
              )}

              {/* Editing Controls Overlay */}
              <div className="absolute top-4 inset-x-4 flex justify-between items-center z-20">
                <button
                  onClick={handleDiscardCapture}
                  className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-rose-500/80 transition-all cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>

                <div className="flex items-center gap-2">
                  {/* Timer selection */}
                  <select
                    value={snapDuration}
                    onChange={(e) => setSnapDuration(Number(e.target.value))}
                    className="px-2.5 py-1.5 rounded-full bg-black/40 backdrop-blur-md text-white text-xs font-black border border-white/10 outline-none cursor-pointer"
                  >
                    <option value={3}>3s ⏱️</option>
                    <option value={6}>6s ⏱️</option>
                    <option value={10}>10s ⏱️</option>
                  </select>

                  {/* Caption Toggle */}
                  <button
                    onClick={() => setShowCaptionInput(!showCaptionInput)}
                    className={`p-2.5 rounded-full backdrop-blur-md text-white border border-white/10 transition-all cursor-pointer ${
                      showCaptionInput ? "bg-[#00B7FF] text-slate-950" : "bg-black/40"
                    }`}
                  >
                    <Type className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Caption Input Popover */}
              {showCaptionInput && (
                <div className="absolute top-18 inset-x-4 z-30 p-2 rounded-2xl bg-black/70 backdrop-blur-md border border-white/20 animate-in fade-in">
                  <input
                    type="text"
                    placeholder="Add a snappy caption..."
                    value={snapCaption}
                    onChange={(e) => setSnapCaption(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-transparent text-white placeholder:text-slate-400 font-bold outline-none"
                    autoFocus
                  />
                </div>
              )}
            </div>
          )}

          {/* Bottom Shutter & Action Bar */}
          <div className="p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-between z-20">
            {!capturedMediaUrl ? (
              <div className="w-full flex items-center justify-center py-2">
                <button
                  onClick={handleCapturePhoto}
                  className="w-18 h-18 rounded-full border-4 border-white/80 p-1 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer shadow-2xl"
                >
                  <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#00B7FF] to-[#F45AA8]" />
                </button>
              </div>
            ) : (
              <div className="w-full flex items-center justify-between gap-3">
                <button
                  onClick={handleDiscardCapture}
                  className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Retake
                </button>

                <button
                  onClick={() => setIsSendDrawerOpen(true)}
                  className="flex-1 py-3 px-6 rounded-2xl bg-gradient-to-r from-[#00B7FF] via-[#7EDBE8] to-indigo-600 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg hover:opacity-95 transition-opacity cursor-pointer"
                >
                  <span>Send To Friends</span>
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INBOX & RECEIVED SNAPS */}
      {/* ========================================================================= */}
      {activeTab === "inbox" && (
        <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar">
          
          {/* Header Banner */}
          <div className="p-4 rounded-3xl bg-gradient-to-tr from-[#00B7FF]/15 via-purple-500/10 to-[#F45AA8]/15 border border-[#00B7FF]/20 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Received Snaps</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#F45AA8] text-white text-[10px] font-black">
                    {unreadCount} Unopened
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Tap any snap to view full screen before it expires</p>
            </div>
            <button
              onClick={fetchSnapsData}
              className="p-2 rounded-2xl glass-pill text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingInbox ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Received Snaps Feed */}
          <div className="space-y-2.5">
            {receivedSnaps.length === 0 ? (
              <div className="py-12 text-center p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-[#131b2e]/60 space-y-3">
                <div className="w-12 h-12 rounded-full bg-cyan-500/10 text-[#00B7FF] flex items-center justify-center mx-auto">
                  <Inbox className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">No Snaps in Inbox</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Snap your friends first to start exchanging moments and build up your daily 👻 streaks!
                </p>
                <button
                  onClick={() => setActiveTab("camera")}
                  className="px-5 py-2.5 rounded-2xl bg-[#00B7FF] text-slate-950 font-black text-xs shadow-md cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Camera className="w-4 h-4" />
                  <span>Take a Snap</span>
                </button>
              </div>
            ) : (
              receivedSnaps.map((snap) => (
                <div
                  key={snap.id}
                  onClick={() => !snap.isOpened && handleOpenReceivedSnap(snap)}
                  className={`p-3.5 rounded-3xl border transition-all flex items-center justify-between gap-3 ${
                    !snap.isOpened
                      ? "bg-white dark:bg-[#131b2e] border-[#00B7FF]/40 shadow-md hover:border-[#00B7FF] cursor-pointer"
                      : "bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 opacity-70 cursor-default"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      <div className={`w-11 h-11 rounded-full p-0.5 ${
                        !snap.isOpened
                          ? "bg-gradient-to-tr from-[#00B7FF] to-[#F45AA8] shadow-sm"
                          : "border-2 border-slate-300 dark:border-slate-700"
                      }`}>
                        <img
                          src={snap.sender.avatarUrl}
                          alt={snap.sender.displayName}
                          className="w-full h-full rounded-full object-cover bg-slate-900"
                        />
                      </div>
                      {!snap.isOpened && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#00B7FF] border-2 border-white dark:border-slate-900" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                          {snap.sender.displayName}
                        </h4>
                        {snap.streakCount !== undefined && snap.streakCount > 0 && (
                          <span className="text-[11px] font-black text-amber-500 flex items-center gap-0.5">
                            👻 {snap.streakCount}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {!snap.isOpened ? "Tap to view snap 🔥" : "Opened • Snap expired"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!snap.isOpened ? (
                      <span className="px-3 py-1.5 rounded-xl bg-[#00B7FF]/15 text-[#00B7FF] text-xs font-extrabold flex items-center gap-1">
                        <Play className="w-3 h-3 fill-current" />
                        <span>View</span>
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickSnapBack(snap.senderAddress);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Camera className="w-3 h-3 text-[#00B7FF]" />
                        <span>Reply</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Sent Snaps Section */}
          {sentSnaps.length > 0 && (
            <div className="pt-4 space-y-2.5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Sent Snaps Status</h3>
              <div className="space-y-2">
                {sentSnaps.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={s.receiver.avatarUrl}
                        alt={s.receiver.displayName}
                        className="w-8 h-8 rounded-full object-cover bg-slate-900"
                      />
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{s.receiver.displayName}</p>
                        <p className="text-[10px] text-slate-400">
                          {s.isOpened ? `Opened • 👻 ${s.streakCount || 1}` : "Delivered • Unopened"}
                        </p>
                      </div>
                    </div>
                    <div>
                      {s.isOpened ? (
                        <CheckCheck className="w-4 h-4 text-[#00B7FF]" />
                      ) : (
                        <Check className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: STREAKS & FRIENDS */}
      {/* ========================================================================= */}
      {activeTab === "streaks" && (
        <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar">
          
          {/* Header Banner */}
          <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-[#F45AA8]/15 border border-amber-500/20 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl shrink-0">
              👻
            </div>
            <div>
              <h3 className="font-black text-xs text-slate-900 dark:text-white">Daily Snap Streaks</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                Exchange snaps with friends daily to keep your 👻 streak numbers growing!
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search friends by name..."
              value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-[#00B7FF]"
            />
          </div>

          {/* Friends with Streaks list */}
          <div className="space-y-2.5">
            {filteredFriends.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 font-semibold">
                No matching friends found.
              </div>
            ) : (
              filteredFriends.map((f) => (
                <div
                  key={f.walletAddress}
                  className="p-3.5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-[#00B7FF] to-purple-600 shrink-0">
                      <img
                        src={f.avatarUrl}
                        alt={f.displayName}
                        className="w-full h-full rounded-full object-cover bg-slate-900"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                          {f.displayName}
                        </h4>
                        {f.currentStreak > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 text-[11px] font-black flex items-center gap-0.5">
                            👻 {f.currentStreak}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold">No streak yet</span>
                        )}
                      </div>

                      <p className="text-[10px] text-slate-400 font-medium">
                        {f.streakStatus === "active_today" && "Streak active for today 🔥"}
                        {f.streakStatus === "pending_my_snap" && "Waiting for your snap! ⏳"}
                        {f.streakStatus === "pending_their_snap" && "Snap sent, waiting for reply 📩"}
                        {f.streakStatus === "no_streak" && "Send a snap to start 👻 1"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleQuickSnapBack(f.walletAddress)}
                    className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-[#00B7FF] to-indigo-600 text-slate-950 font-black text-xs flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-sm shrink-0"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Snap</span>
                  </button>
                </div>
              ))
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SEND TO FRIENDS DRAWER / MODAL */}
      {/* ========================================================================= */}
      {isSendDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#131b2e] rounded-t-[32px] sm:rounded-[32px] border border-slate-200 dark:border-slate-800 p-5 space-y-4 max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-4">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Send Snap To</h3>
                <p className="text-[10px] text-slate-400 font-medium">Select friends to share this snap and update streaks</p>
              </div>
              <button
                onClick={() => setIsSendDrawerOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Friend Search Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search friends..."
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-[#00B7FF]"
              />
            </div>

            {/* Friends Selector List */}
            <div className="flex-1 overflow-y-auto space-y-2 max-h-64 pr-1 no-scrollbar">
              {filteredFriends.map((f) => {
                const isSelected = selectedFriends.includes(f.walletAddress);
                return (
                  <div
                    key={f.walletAddress}
                    onClick={() => toggleSelectFriend(f.walletAddress)}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-cyan-500/10 border-[#00B7FF] shadow-xs"
                        : "bg-slate-50 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={f.avatarUrl}
                        alt={f.displayName}
                        className="w-9 h-9 rounded-full object-cover bg-slate-900"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                            {f.displayName}
                          </h4>
                          {f.currentStreak > 0 && (
                            <span className="text-[11px] font-black text-amber-500">
                              👻 {f.currentStreak}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">@{f.username}</p>
                      </div>
                    </div>

                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-[#00B7FF] border-[#00B7FF] text-slate-950"
                        : "border-slate-400 bg-transparent"
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Send CTA Button */}
            <button
              onClick={handleSendSnap}
              disabled={isSending || selectedFriends.length === 0}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#00B7FF] via-[#7EDBE8] to-indigo-600 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-40"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Delivering Snap...</span>
                </>
              ) : (
                <>
                  <span>Send Snap to ({selectedFriends.length})</span>
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FULL SCREEN EPHEMERAL SNAP VIEWER */}
      {/* ========================================================================= */}
      {activeViewingSnap && (
        <SnapViewerModal
          snap={activeViewingSnap}
          onClose={() => setActiveViewingSnap(null)}
          onSnapOpened={handleSnapOpenedCallback}
          onReplySnap={handleQuickSnapBack}
        />
      )}

    </div>
  );
}
