"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Edit3, 
  Check, 
  Settings, 
  Camera, 
  Trash2, 
  Loader2, 
  X,
  Share2,
  Sparkles,
  MessageCircle,
  UserPlus,
  UserCheck
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../lib/authContext";
import { audioHaptics } from "../lib/audioHaptics";
import { GlassModal } from "./ui/GlassModal";
import { resolveMediaUrl, handleImageFallback } from "../lib/mediaHelper";

interface ProfileHeaderProps {
  user: {
    walletAddress: string;
    profile?: {
      username?: string;
      displayName?: string;
      nickname?: string;
      bio?: string;
      avatarUrl?: string;
      bannerUrl?: string;
    };
  };
  stats: {
    postsCount: number;
    followersCount: number;
    followingCount: number;
  };
  onProfileUpdated?: () => void;
}

export function ProfileHeader({ user, stats, onProfileUpdated }: ProfileHeaderProps) {
  const router = useRouter();
  const { account, user: authUser, refreshProfile } = useAuth();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [displayName, setDisplayName] = useState(user.profile?.displayName || "");
  const [username, setUsername] = useState(user.profile?.username || "");
  const [bio, setBio] = useState(user.profile?.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(user.profile?.avatarUrl || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Follow State
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [localFollowersCount, setLocalFollowersCount] = useState(stats.followersCount);

  // Chat State
  const [isStartingChat, setIsStartingChat] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentLoggedInUser = authUser?.walletAddress || authUser?.id || account;
  const isOwnProfile = currentLoggedInUser && (
    currentLoggedInUser.toLowerCase() === user.walletAddress?.toLowerCase() ||
    currentLoggedInUser.toLowerCase() === user.profile?.username?.toLowerCase()
  );

  useEffect(() => {
    setLocalFollowersCount(stats.followersCount);
  }, [stats.followersCount]);

  const handleOpenEdit = () => {
    setDisplayName(user.profile?.displayName || "");
    setUsername(user.profile?.username || "");
    setBio(user.profile?.bio || "");
    setAvatarUrl(user.profile?.avatarUrl || "");
    setSelectedFile(null);
    setPreviewAvatar(null);
    setSaveSuccess(false);
    setSaveError(null);
    setIsEditOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewAvatar(URL.createObjectURL(file));
    }
  };

  const handleRemoveDP = () => {
    setSelectedFile(null);
    if (previewAvatar && previewAvatar.startsWith("blob:")) {
      URL.revokeObjectURL(previewAvatar);
    }
    setPreviewAvatar(null);
    setAvatarUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    try {
      setIsSaving(true);
      audioHaptics.playTap();

      let finalAvatarUrl = avatarUrl;

      if (selectedFile) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("folder", "avatars");

        const uploadRes = await fetch("/api/storage/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.url) {
          throw new Error(uploadData.error || "Failed to upload profile picture");
        }
        finalAvatarUrl = uploadData.url;
        setIsUploading(false);
      }

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: user.walletAddress || currentLoggedInUser,
          displayName: displayName.trim(),
          username: username.trim().toLowerCase().replace(/[^a-z0-9_]/g, ""),
          bio: bio.trim(),
          avatarUrl: finalAvatarUrl,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to update profile");
      }

      setSaveSuccess(true);
      if (refreshProfile) await refreshProfile();
      if (onProfileUpdated) onProfileUpdated();
      setTimeout(() => {
        setIsEditOpen(false);
        setSaveSuccess(false);
      }, 500);
    } catch (e: any) {
      console.error("Save profile error:", e);
      setSaveError(e.message || "Failed to save profile changes.");
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!currentLoggedInUser) {
      router.push("/login");
      return;
    }

    try {
      setIsFollowLoading(true);
      audioHaptics.playTap();
      const nextFollow = !isFollowing;
      setIsFollowing(nextFollow);
      setLocalFollowersCount((prev) => nextFollow ? prev + 1 : Math.max(0, prev - 1));

      const res = await fetch("/api/users/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followerAddress: currentLoggedInUser,
          followingAddress: user.walletAddress,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsFollowing(data.isFollowing);
      }
    } catch (e) {
      console.error("Follow error:", e);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleStartDirectChat = async () => {
    if (!currentLoggedInUser) {
      router.push("/login");
      return;
    }

    try {
      setIsStartingChat(true);
      audioHaptics.playTap();

      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAddress: currentLoggedInUser,
          targetAddress: user.walletAddress,
        }),
      });

      const data = await res.json();
      if (res.ok && data.conversationId) {
        router.push(`/chats?conversationId=${data.conversationId}`);
      } else {
        router.push("/chats");
      }
    } catch (e) {
      console.error("Start chat error:", e);
      router.push("/chats");
    } finally {
      setIsStartingChat(false);
    }
  };

  const handleCopyLink = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      navigator.share({
        title: `${user.profile?.displayName || "Profile"} on Pulse`,
        url,
      }).catch(() => {
        navigator.clipboard.writeText(url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      });
    } else {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const mainName = user.profile?.displayName || user.profile?.username || `User ${user.walletAddress?.slice(0, 6)}`;
  const displayUsername = user.profile?.username || `user_${user.walletAddress?.slice(0, 8)}`;
  const currentAvatar = user.profile?.avatarUrl;

  return (
    <div className="glass-card rounded-[32px] border border-white/80 dark:border-white/10 p-6 md:p-8 shadow-glass select-none">
      {/* Header Profile Identity */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        {/* Avatar with glowing ring */}
        <div className="w-24 h-24 rounded-full p-[3px] bg-gradient-to-tr from-[#00B7FF] via-[#7EDBE8] to-[#F45AA8] shadow-glow-cyan shrink-0">
          <div className="w-full h-full rounded-full overflow-hidden border-2 border-white dark:border-slate-900 bg-white dark:bg-slate-900">
            {currentAvatar ? (
              <img
                src={resolveMediaUrl(currentAvatar)}
                alt={mainName}
                onError={(e) => handleImageFallback(e, "avatar")}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-900 dark:text-white font-black text-2xl">
                {mainName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Info Column */}
        <div className="flex-1 text-center sm:text-left min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-1.5">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                  {mainName}
                </h1>
                <span className="w-4 h-4 rounded-full bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 flex items-center justify-center shrink-0 shadow-sm">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">@{displayUsername}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-2">
              {isOwnProfile ? (
                <>
                  <button
                    onClick={handleOpenEdit}
                    className="px-4 py-2 bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 text-xs font-black rounded-2xl shadow-sm hover:opacity-90 transition btn-tactile flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="p-2 glass-pill text-slate-700 dark:text-slate-200 rounded-2xl transition btn-tactile cursor-pointer"
                    title="Share Profile"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                  </button>
                  <Link
                    href="/settings"
                    className="p-2 glass-pill text-slate-700 dark:text-slate-200 rounded-2xl transition btn-tactile"
                    title="Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </Link>
                </>
              ) : (
                <>
                  <button
                    onClick={handleToggleFollow}
                    disabled={isFollowLoading}
                    className={`px-5 py-2 text-xs font-black rounded-2xl shadow-sm transition btn-tactile cursor-pointer flex items-center gap-1.5 ${
                      isFollowing
                        ? "glass-pill text-slate-700 dark:text-slate-200 border-cyan-500/30"
                        : "bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 hover:opacity-90"
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5 text-cyan-500" />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Follow</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleStartDirectChat}
                    disabled={isStartingChat}
                    className="px-4 py-2 glass-pill text-slate-800 dark:text-white text-xs font-bold rounded-2xl transition btn-tactile flex items-center gap-1.5 cursor-pointer"
                  >
                    {isStartingChat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5 text-[#00B7FF]" />}
                    <span>Message</span>
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="p-2 glass-pill text-slate-700 dark:text-slate-200 rounded-2xl transition btn-tactile cursor-pointer"
                    title="Share Profile"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Bio */}
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed mt-3 max-w-xl font-medium">
            {user.profile?.bio || "Pulse Creator & Visual Architect. Crafting seamless digital experiences."}
          </p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-2.5 border-t border-slate-200/60 dark:border-white/10 pt-4 mt-6 text-center">
        <div className="p-3 rounded-2xl glass-panel">
          <span className="block text-base font-black text-slate-900 dark:text-white">
            {stats.postsCount}
          </span>
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Posts</span>
        </div>
        <div className="p-3 rounded-2xl glass-panel">
          <span className="block text-base font-black text-slate-900 dark:text-white">
            {localFollowersCount}
          </span>
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Followers</span>
        </div>
        <div className="p-3 rounded-2xl glass-panel">
          <span className="block text-base font-black text-slate-900 dark:text-white">
            {stats.followingCount}
          </span>
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Following</span>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <GlassModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Profile"
        maxWidth="md"
      >
        <form onSubmit={handleSaveProfile} className="space-y-3.5">
          {saveError && (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs font-bold">
              {saveError}
            </div>
          )}

          {/* DP Row */}
          <div className="flex items-center gap-3 p-3 rounded-2xl glass-panel">
            <div className="w-14 h-14 rounded-full overflow-hidden border border-white/60 bg-white dark:bg-slate-900 shrink-0">
              {previewAvatar || avatarUrl ? (
                <img src={previewAvatar || avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-black text-slate-400">
                  {displayName.charAt(0) || "U"}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-[#00B7FF] text-slate-950 text-xs font-black rounded-xl hover:opacity-90 transition cursor-pointer"
              >
                Change Picture
              </button>
              {(previewAvatar || avatarUrl) && (
                <button
                  type="button"
                  onClick={handleRemoveDP}
                  className="px-3 py-1.5 bg-rose-500/15 text-rose-500 text-xs font-bold rounded-xl hover:bg-rose-500/25 transition cursor-pointer"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full p-2.5 rounded-xl glass-input text-xs text-slate-900 dark:text-white outline-none font-semibold"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              className="w-full p-2.5 rounded-xl glass-input text-xs text-slate-900 dark:text-white outline-none font-semibold"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full p-2.5 rounded-xl glass-input text-xs text-slate-900 dark:text-white outline-none font-semibold"
              placeholder="Tell others about yourself..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/60 dark:border-white/10">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-white/80 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="px-5 py-2 bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 text-xs font-black rounded-xl transition shadow-md hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>{isSaving ? "Saving..." : saveSuccess ? "Saved!" : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </GlassModal>
    </div>
  );
}
