"use client";

import React, { useState } from "react";
import { ShieldCheck, Copy, Check, ExternalLink, Cpu, X, Lock } from "lucide-react";

interface ProofBadgeProps {
  contentHash: string;
  mediaCid: string;
  authorAddress: string;
  txHash?: string | null;
  verificationStatus?: string;
}

export function ProofOfCreationBadge({
  contentHash,
  mediaCid,
  authorAddress,
  txHash,
  verificationStatus = "VERIFIED",
}: ProofBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyHash = () => {
    navigator.clipboard.writeText(contentHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all proof-glow"
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Proof-of-Creation</span>
      </button>

      {/* Verification Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-5 right-5 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <ShieldCheck className="w-7 h-7 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Proof-of-Creation Record
                  <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-extrabold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {verificationStatus}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Immutable Cryptographic Content Fingerprint</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Content Fingerprint */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-semibold flex items-center gap-1">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                    Cryptographic Content Hash (Keccak-256)
                  </span>
                  <button
                    onClick={copyHash}
                    className="flex items-center gap-1 text-cyan-500 hover:underline"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <p className="text-xs font-mono break-all text-slate-800 dark:text-slate-200">
                  {contentHash}
                </p>
              </div>

              {/* IPFS Media CID */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-semibold flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-purple-400" />
                    IPFS Media CID
                  </span>
                  <a
                    href={`https://ipfs.io/ipfs/${mediaCid}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-cyan-500 hover:underline"
                  >
                    <span>View IPFS</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-xs font-mono break-all text-slate-800 dark:text-slate-200">
                  {mediaCid}
                </p>
              </div>

              {/* Original Creator Address */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-400 font-semibold mb-1">Original Web3 Creator Address</p>
                <p className="text-xs font-mono break-all text-cyan-400 font-bold">
                  {authorAddress}
                </p>
              </div>

              {/* Transaction Hash */}
              {txHash && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                  <p className="text-xs text-slate-400 font-semibold mb-1">Blockchain Transaction Record</p>
                  <p className="text-xs font-mono break-all text-slate-400">
                    {txHash}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity"
              >
                Close Verification
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
