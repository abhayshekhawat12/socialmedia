"use client";

import React, { useState } from "react";
import { Sparkles, ExternalLink, X, Tag } from "lucide-react";

interface NFTBadgeProps {
  tokenId: number;
  contractAddress?: string;
  txHash?: string | null;
  metadataCid?: string;
}

export function NFTBadge({
  tokenId,
  contractAddress = "0xSocialNFTContract",
  txHash,
  metadataCid,
}: NFTBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-all nft-glow"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>NFT #{tokenId}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Tag className="w-7 h-7 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Social Post NFT Token
                  <span className="px-2 py-0.5 text-xs font-extrabold rounded-full bg-purple-500/20 text-purple-300">
                    #{tokenId}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Minted ERC721 Digital Social Asset</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                <p className="text-slate-400 font-semibold mb-1">Contract Address</p>
                <p className="font-mono text-purple-400 font-bold break-all">{contractAddress}</p>
              </div>

              {metadataCid && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="font-semibold">Metadata Token URI</span>
                    <a
                      href={`https://ipfs.io/ipfs/${metadataCid}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-purple-400 hover:underline flex items-center gap-1"
                    >
                      <span>IPFS</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="font-mono text-slate-300 break-all">{metadataCid}</p>
                </div>
              )}

              {txHash && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                  <p className="text-slate-400 font-semibold mb-1">Minting Transaction Hash</p>
                  <p className="font-mono text-slate-400 break-all">{txHash}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors"
              >
                Close NFT Details
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
