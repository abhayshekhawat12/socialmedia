"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useWeb3 } from '../../lib/web3Context';
import { 
  ShieldCheck, 
  Grid, 
  MoreVertical, 
  ArrowLeft, 
  Copy, 
  Check, 
  Settings,
  Heart,
  MessageCircle,
  PlayCircle,
  Bookmark,
  UserPlus,
  UserCheck,
  Share2,
  Lock,
  Globe
} from 'lucide-react';

interface ProfileData {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  bannerUrl: string;
  web3ProfileId: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const { account, token } = useWeb3();

  // If address param is present, view that profile; otherwise, view personal account
  const addressParam = params?.address as string | undefined;
  const targetAddress = addressParam?.toLowerCase() || account?.toLowerCase();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState({
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
    nftsCount: 0
  });

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'reels' | 'saved'>('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Lists of posts & reels
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [userReels, setUserReels] = useState<any[]>([]);
  const [savedReels, setSavedReels] = useState<any[]>([]);

  const fetchProfileDetails = useCallback(async () => {
    if (!targetAddress) return;
    try {
      setLoading(true);
      // 1. Fetch Profile Info & stats
      const res = await fetch(`/api/profile?walletAddress=${targetAddress}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        if (data.stats) {
          setStats(data.stats);
        }
      }

      // 2. Fetch User's standard posts
      const postsRes = await fetch(`/api/posts?author=${targetAddress}`);
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setUserPosts(postsData.posts || []);
      }

      // 3. Fetch User's short videos (reels)
      const reelsRes = await fetch(`/api/pulse?author=${targetAddress}`);
      if (reelsRes.ok) {
        const reelsData = await reelsRes.json();
        setUserReels(reelsData.pulses || []);
      }

      // 4. Fetch Follow status if viewing other user
      if (account && addressParam && account.toLowerCase() !== targetAddress) {
        // Quick check if already following via a search check or follow check (we can simulate or get from stats)
        // For simplicity, we can fetch followers and check if account is in it, or toggle
      }
    } catch (e) {
      console.error("Failed to fetch profile details:", e);
    } finally {
      setLoading(false);
    }
  }, [targetAddress, account, addressParam]);

  useEffect(() => {
    fetchProfileDetails();
  }, [fetchProfileDetails]);

  const copyAddress = () => {
    if (targetAddress) {
      navigator.clipboard.writeText(targetAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFollowToggle = async () => {
    if (!account) {
      alert("Please connect your wallet first.");
      return;
    }
    try {
      const res = await fetch('/api/users/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          followerAddress: account,
          followingAddress: targetAddress
        })
      });
      if (res.ok) {
        const data = await res.json();
        setIsFollowing(data.isFollowing);
        // Refresh counts
        setStats(prev => ({
          ...prev,
          followersCount: data.isFollowing ? prev.followersCount + 1 : Math.max(0, prev.followersCount - 1)
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const shortAddress = targetAddress
    ? `${targetAddress.substring(0, 6)}...${targetAddress.substring(targetAddress.length - 4)}`
    : '0x0000...0000';

  const isOwnProfile = !addressParam || addressParam.toLowerCase() === account?.toLowerCase();

  return (
    <div className="max-w-2xl mx-auto space-y-5 text-left pb-8">
      
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-1 py-1">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-extrabold text-sm hover:opacity-85 transition-opacity"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          <span>{isOwnProfile ? "My Profile" : "Creator Profile"}</span>
        </button>

        <Link
          href="/settings"
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
        >
          <MoreVertical className="w-6 h-6 stroke-[2.5]" />
        </Link>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs font-bold text-slate-400 flex flex-col items-center gap-2">
          <span className="animate-spin w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full" />
          <span>Querying creator metadata...</span>
        </div>
      ) : (
        <div className="space-y-5">
          
          {/* Cover & Avatar Header Card */}
          <div className="bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800 rounded-[2rem] p-5 shadow-lg text-center space-y-4 relative overflow-hidden">
            
            {/* Avatar Circle */}
            <div className="flex justify-center">
              <div className="w-22 h-22 rounded-full p-1 bg-gradient-to-tr from-[#00B7FF] via-indigo-500 to-purple-600 shadow-md relative">
                <img
                  src={profile?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"}
                  alt="Profile avatar"
                  className="w-full h-full rounded-full object-cover border-2 border-white dark:border-[#131b2e]"
                />
              </div>
            </div>

            {/* User details */}
            <div className="space-y-1">
              <h1 className="text-lg font-black text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                <span>{profile?.displayName || `Web3 Creator`}</span>
                <div className="w-4 h-4 rounded-full bg-[#00B7FF] text-white flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              </h1>
              
              <p className="text-xs text-cyan-500 font-bold font-mono">@{profile?.username || `creator_${targetAddress?.slice(2, 8)}`}</p>
              
              <p className="text-xs text-slate-600 dark:text-slate-300 pt-1.5 max-w-xs mx-auto leading-relaxed">
                {profile?.bio || "Decentralized Creator on BlockSocial. Publishing verifiable cryptographic content proofs."}
              </p>

              {/* Wallet public key details */}
              <div className="pt-2 flex justify-center gap-2">
                <button
                  onClick={copyAddress}
                  className="px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-[#00B7FF] font-mono font-bold text-[10px] flex items-center gap-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  <span>{shortAddress}</span>
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Profile Statistics Grid */}
            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-center">
              <div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-white">{stats.followersCount}</div>
                <div className="text-[10px] text-slate-400 font-bold">Followers</div>
              </div>
              <div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-white">{stats.followingCount}</div>
                <div className="text-[10px] text-slate-400 font-bold">Following</div>
              </div>
              <div>
                <div className="text-sm font-extrabold text-[#00B7FF]">{userPosts.length + userReels.length}</div>
                <div className="text-[10px] text-slate-400 font-bold">Published</div>
              </div>
            </div>

            {/* Follow or Edit profile buttons */}
            {!isOwnProfile && (
              <div className="pt-2">
                <button
                  onClick={handleFollowToggle}
                  className={`w-full py-2.5 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isFollowing
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-700"
                      : "bg-[#00B7FF] text-slate-950 font-extrabold"
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 text-slate-950" />
                      <span>Follow Creator</span>
                    </>
                  )}
                </button>
              </div>
            )}

          </div>

          {/* Sub Navigation Tabs (Posts | Reels | Saved) */}
          <div className="flex items-center bg-[#EBF0F5] dark:bg-slate-900/60 p-1.5 rounded-2xl text-xs font-bold justify-between text-slate-500">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 py-2 rounded-xl transition-all font-black flex items-center justify-center gap-1 ${
                activeTab === 'posts' ? "bg-white dark:bg-[#131b2e] text-[#00B7FF] shadow-sm" : ""
              }`}
            >
              <Grid className="w-4 h-4" />
              <span>Posts ({userPosts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('reels')}
              className={`flex-1 py-2 rounded-xl transition-all font-black flex items-center justify-center gap-1 ${
                activeTab === 'reels' ? "bg-white dark:bg-[#131b2e] text-[#00B7FF] shadow-sm" : ""
              }`}
            >
              <PlayCircle className="w-4 h-4" />
              <span>Reels ({userReels.length})</span>
            </button>

            {isOwnProfile && (
              <button
                onClick={() => setActiveTab('saved')}
                className={`flex-1 py-2 rounded-xl transition-all font-black flex items-center justify-center gap-1 ${
                  activeTab === 'saved' ? "bg-white dark:bg-[#131b2e] text-[#00B7FF] shadow-sm" : ""
                }`}
              >
                <Bookmark className="w-4 h-4" />
                <span>Saved</span>
              </button>
            )}
          </div>

          {/* Grid lists based on active tab */}
          <div className="bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800 rounded-[2rem] p-4 shadow-md min-h-60">
            
            {/* A. POSTS GRID */}
            {activeTab === 'posts' && (
              userPosts.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {userPosts.map((post) => (
                    <div 
                      key={post.id} 
                      onClick={() => router.push(`/post/${post.id}`)}
                      className="aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:opacity-90 transition-opacity"
                    >
                      <img src={post.mediaUrl} alt="Post cover" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center text-xs font-bold text-slate-400 flex flex-col items-center gap-2">
                  <Grid className="w-8 h-8 text-slate-500 opacity-60" />
                  <span>No posts published yet.</span>
                </div>
              )
            )}

            {/* B. REELS GRID */}
            {activeTab === 'reels' && (
              userReels.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {userReels.map((reel) => (
                    <div 
                      key={reel.id}
                      onClick={() => router.push("/pulse")}
                      className="aspect-[9/14] rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer hover:opacity-90 transition-opacity relative group"
                    >
                      <video src={reel.videoUrl} muted className="w-full h-full object-cover" />
                      <div className="absolute bottom-2 left-2 flex items-center gap-0.5 text-[8px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-full">
                        <Heart className="w-2.5 h-2.5 text-red-500 fill-red-500" /> {reel.likeCount}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center text-xs font-bold text-slate-400 flex flex-col items-center gap-2">
                  <PlayCircle className="w-8 h-8 text-slate-500 opacity-60" />
                  <span>No Reels videos published yet.</span>
                </div>
              )
            )}

            {/* C. SAVED REELS (For personal profile tab only) */}
            {activeTab === 'saved' && (
              <div className="py-16 text-center text-xs font-bold text-slate-400 flex flex-col items-center gap-2">
                <Bookmark className="w-8 h-8 text-slate-500 opacity-60" />
                <span>Your saved collection is synced with blockchain profile.</span>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
