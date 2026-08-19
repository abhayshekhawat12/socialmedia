"use client";

import React, { useState, useRef } from "react";
import { 
  Edit3, 
  Users, 
  Grid, 
  X, 
  Camera, 
  Trash2, 
  Upload, 
  Loader2, 
  Check, 
  Bookmark, 
  PlayCircle,
  MoreVertical,
  Briefcase,
  Settings
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "../lib/authContext";
import { audioHaptics } from "../lib/audioHaptics";

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
  const { account, refreshProfile } = useAuth();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [displayName, setDisplayName] = useState(user.profile?.displayName || "");
  const [nickname, setNickname] = useState(user.profile?.nickname || "");
  const [bio, setBio] = useState(user.profile?.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(user.profile?.avatarUrl || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = account && account.toLowerCase() === user.walletAddress.toLowerCase();

  const handleOpenEdit = () => {
    setDisplayName(user.profile?.displayName || "");
    setNickname(user.profile?.nickname || "");
    setBio(user.profile?.bio || "");
    setAvatarUrl(user.profile?.avatarUrl || "");
    setSelectedFile(null);
    setPreviewAvatar(null);
    setSaveSuccess(false);
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
    try {
      setIsSaving(true);
      audioHaptics.playTap();

      let finalAvatarUrl = avatarUrl;

      // 1. If new DP selected, upload to storage
      if (selectedFile) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", selectedFile);

        const uploadRes = await fetch("/api/storage/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) throw new Error("Failed to upload profile picture");
        const uploadData = await uploadRes.json();
        finalAvatarUrl = uploadData.url;
        setIsUploading(false);
      }

      // 2. Persist Profile to database
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: user.walletAddress,
          displayName: displayName.trim(),
          nickname: nickname.trim(),
          bio: bio.trim(),
          avatarUrl: finalAvatarUrl,
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        await refreshProfile();
        if (onProfileUpdated) onProfileUpdated();
        setTimeout(() => {
          setIsEditOpen(false);
          setSaveSuccess(false);
        }, 600);
      }
    } catch (e) {
      console.error("Save profile error:", e);
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  const mainName = user.profile?.displayName || `User ${user.walletAddress.slice(0, 6)}`;
  const displayNickname = user.profile?.nickname;
  const username = user.profile?.username || `user_${user.walletAddress.slice(0, 8)}`;
  const currentAvatar = user.profile?.avatarUrl;

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-xl overflow-hidden mb-6">
      {/* Banner */}
      <div className="h-32 sm:h-40 w-full bg-gradient-to-r from-[#00B7FF] via-indigo-600 to-purple-700 relative">
        <div className="absolute inset-0 bg-black/15" />
      </div>

      {/* Profile Details Header Bar */}
      <div className="px-6 pb-6 relative">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-16 mb-4">
          {/* Avatar */}
          <div className="relative">
            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-3xl bg-slate-900 border-4 border-white dark:border-[#131b2e] shadow-2xl p-1 bg-gradient-to-tr from-[#00B7FF] to-purple-600 overflow-hidden">
              {currentAvatar ? (
                <img src={currentAvatar} alt={mainName} className="w-full h-full rounded-2xl object-cover bg-slate-900" />
              ) : (
                <div className="w-full h-full rounded-2xl bg-slate-900 flex items-center justify-center text-white font-extrabold text-2xl sm:text-3xl">
                  {mainName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Action Triggers */}
          <div className="flex items-center gap-2">
            {isOwnProfile && (
              <button
                onClick={handleOpenEdit}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#00B7FF] to-indigo-600 text-slate-950 font-black shadow-md hover:opacity-90 transition-opacity cursor-pointer btn-tactile"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            )}

            {/* 3-Dot Options Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  audioHaptics.playTap();
                  setIsDropdownOpen(!isDropdownOpen);
                }}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-[#00B7FF] transition-colors cursor-pointer"
                title="Profile Options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 top-10 z-40 w-52 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-2xl p-1.5 space-y-1 animate-in zoom-in-95 text-xs font-bold">
                  <Link
                    href="/hiring"
                    onClick={() => setIsDropdownOpen(false)}
                    className="w-full px-3 py-2.5 rounded-xl text-left flex items-center gap-2.5 text-[#00B7FF] hover:bg-cyan-500/10 transition-colors cursor-pointer"
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>Hiring / Promotion</span>
                  </Link>

                  <Link
                    href="/settings"
                    onClick={() => setIsDropdownOpen(false)}
                    className="w-full px-3 py-2.5 rounded-xl text-left flex items-center gap-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings & Preferences</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Identity Details */}
        <div className="space-y-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {mainName}
              </h1>
              {displayNickname && (
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[#00B7FF] text-xs font-bold">
                  "{displayNickname}"
                </span>
              )}
            </div>
            <p className="text-xs text-cyan-500 font-bold mt-0.5">@{username}</p>
          </div>

          {user.profile?.bio ? (
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
              {user.profile.bio}
            </p>
          ) : (
            <p className="text-xs text-slate-400 italic">No bio added yet.</p>
          )}

          {/* Statistics Strip */}
          <div className="flex items-center gap-6 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
            <div className="flex items-center gap-1.5">
              <Grid className="w-4 h-4 text-cyan-500" />
              <span className="font-extrabold text-slate-900 dark:text-white">{stats.postsCount}</span>
              <span className="text-slate-400 font-semibold">Posts</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-purple-400" />
              <span className="font-extrabold text-slate-900 dark:text-white">{stats.followersCount}</span>
              <span className="text-slate-400 font-semibold">Followers</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-400" />
              <span className="font-extrabold text-slate-900 dark:text-white">{stats.followingCount}</span>
              <span className="text-slate-400 font-semibold">Following</span>
            </div>
          </div>
        </div>
      </div>

      {/* Minimal & Premium Edit Profile Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-[32px] p-6 w-full max-w-md shadow-2xl space-y-5 animate-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white">Edit Profile</h3>
                <p className="text-[10px] text-slate-400 font-medium">Update your photo, name, and nickname</p>
              </div>
              <button 
                onClick={() => setIsEditOpen(false)} 
                className="p-1 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              
              {/* Profile Picture Section */}
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  Profile Picture
                </label>
                
                <div className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  {/* Current DP / Preview */}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#00B7FF] to-purple-600 p-0.5 shadow-md overflow-hidden shrink-0">
                    {previewAvatar || avatarUrl ? (
                      <img
                        src={previewAvatar || avatarUrl}
                        alt="Profile DP"
                        className="w-full h-full rounded-2xl object-cover bg-slate-900"
                      />
                    ) : (
                      <div className="w-full h-full rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-lg">
                        {displayName.charAt(0).toUpperCase() || "U"}
                      </div>
                    )}
                  </div>

                  {/* Change DP / Remove DP Buttons */}
                  <div className="flex flex-col gap-2">
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
                      className="px-3.5 py-1.5 rounded-xl bg-[#00B7FF] text-slate-950 font-black text-xs inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Change DP</span>
                    </button>

                    {(previewAvatar || avatarUrl) && (
                      <button
                        type="button"
                        onClick={handleRemoveDP}
                        className="px-3 py-1 rounded-xl bg-slate-200 dark:bg-slate-800 text-rose-500 hover:bg-rose-500/15 font-bold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove DP</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Name */}
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#00B7FF]"
                  required
                />
              </div>

              {/* Nickname */}
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
                  Nickname
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Enter Nickname (optional)"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#00B7FF]"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:border-[#00B7FF]"
                  placeholder="Tell your friends something about yourself..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  disabled={isSaving || isUploading}
                  className="px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-[#00B7FF] to-indigo-600 text-slate-950 hover:opacity-90 transition-all cursor-pointer shadow-md disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isSaving || isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{isUploading ? "Uploading DP..." : "Saving..."}</span>
                    </>
                  ) : saveSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-950 stroke-[3]" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
