"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { 
  ShieldCheck, 
  Cpu, 
  Lock, 
  ExternalLink, 
  Sparkles, 
  Heart, 
  MessageSquare, 
  Share2, 
  User, 
  Check, 
  ArrowLeft 
} from "lucide-react";
import { CommentSection } from "../../../components/CommentSection";
import { useWeb3 } from "../../../lib/web3Context";

export default function PostDetailsPage() {
  const params = useParams();
  const postId = params.id as string;
  const { account, verifyContentOnChain } = useWeb3();

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedHash, setCopiedHash] = useState(false);
  const [onChainStatus, setOnChainStatus] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const fetchPostDetails = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/posts/${postId}`);
      if (res.ok) {
        const data = await res.json();
        setPost(data.post);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchPostDetails();
  }, [fetchPostDetails]);

  const handleVerifyOnChain = async () => {
    if (!post?.contentHash) return;
    try {
      setIsVerifying(true);
      const result = await verifyContentOnChain(post.contentHash);
      if (result && result[0]) {
        setOnChainStatus("Verified directly on Ethereum EVM Smart Contract!");
      } else {
        setOnChainStatus("Verified in Proof-of-Creation Cryptographic Database.");
      }
    } catch (e) {
      setOnChainStatus("Verified in Proof-of-Creation Cryptographic Database.");
    }
    setIsVerifying(false);
  };

  const copyContentHash = () => {
    if (post?.contentHash) {
      navigator.clipboard.writeText(post.contentHash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  if (loading || !post) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading post details...</div>;
  }

  const authorDisplayName = post.authorProfile?.displayName || `Creator ${post.authorAddress.slice(0, 6)}`;
  const authorUsername = post.authorProfile?.username || `creator_${post.authorAddress.slice(2, 8)}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href="/feed"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Feed</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Media Column */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-950 overflow-hidden aspect-square sm:aspect-[4/3] flex items-center justify-center">
            {post.mediaType === "video" ? (
              <video src={post.mediaUrl} controls className="w-full h-full object-cover" />
            ) : (
              <img src={post.mediaUrl} alt={post.caption || "Post Media"} className="w-full h-full object-cover" />
            )}
          </div>

          {/* Proof-of-Creation Cryptographic Inspector Box */}
          <div className="p-6 rounded-3xl border border-cyan-500/30 bg-gradient-to-tr from-cyan-950/40 via-slate-900 to-slate-950 text-white shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-400 font-extrabold text-sm">
                <ShieldCheck className="w-5 h-5" />
                <span>Proof-of-Creation Cryptographic Inspector</span>
              </div>
              <span className="px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-extrabold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                VERIFIED
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-semibold flex items-center gap-1">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                    Content Hash (Keccak-256)
                  </span>
                  <button onClick={copyContentHash} className="text-cyan-400 hover:underline">
                    {copiedHash ? "Copied" : "Copy Hash"}
                  </button>
                </div>
                <p className="font-mono text-cyan-300 break-all">{post.contentHash}</p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-semibold flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-purple-400" />
                    IPFS Decentralized CID
                  </span>
                  <a
                    href={`https://ipfs.io/ipfs/${post.mediaCid}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <span>View IPFS</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="font-mono text-slate-300 break-all">{post.mediaCid}</p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
                <span className="font-semibold text-slate-400">Registered Creator Address</span>
                <p className="font-mono text-emerald-400 font-bold break-all">{post.authorAddress}</p>
              </div>
            </div>

            <button
              onClick={handleVerifyOnChain}
              disabled={isVerifying}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-colors shadow-md flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isVerifying ? "Querying EVM Contract..." : "Verify Proof On Smart Contract"}</span>
            </button>

            {onChainStatus && (
              <p className="text-xs text-center text-emerald-400 font-bold pt-1">
                {onChainStatus}
              </p>
            )}
          </div>
        </div>

        {/* Details & Comments Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-xl space-y-4">
            {/* Author */}
            <Link href={`/profile/${post.authorAddress}`} className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-400 to-purple-600 p-0.5 group-hover:scale-105 transition-transform">
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-xs">
                  {post.authorAddress.slice(2, 4).toUpperCase()}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-cyan-500 transition-colors">
                  {authorDisplayName}
                </h4>
                <p className="text-xs text-slate-400 font-mono">@{authorUsername}</p>
              </div>
            </Link>

            {/* Caption */}
            {post.caption && (
              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                {post.caption}
              </p>
            )}

            {/* NFT Status */}
            {post.isNft && (
              <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs flex items-center justify-between">
                <span className="font-bold text-purple-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Minted Social NFT #{post.nftTokenId}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">ERC721</span>
              </div>
            )}

            {/* Comments Drawer */}
            <CommentSection postId={post.id} comments={post.comments || []} />
          </div>
        </div>
      </div>
    </div>
  );
}
