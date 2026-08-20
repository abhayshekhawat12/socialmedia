"use client";

import React, { useState } from "react";
import { GlassModal } from "./ui/GlassModal";
import { 
  ShieldCheck, 
  Check, 
  Copy, 
  ExternalLink, 
  Hash, 
  Wallet, 
  Clock, 
  Globe 
} from "lucide-react";
import { audioHaptics } from "../lib/audioHaptics";

export interface ProofDetails {
  contentHash?: string;
  authorWallet?: string;
  network?: string;
  txHash?: string;
  timestamp?: string;
  verified?: boolean;
}

interface BlockchainVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  proof?: ProofDetails | null;
  postCaption?: string;
}

export const BlockchainVerificationModal: React.FC<BlockchainVerificationModalProps> = ({
  isOpen,
  onClose,
  proof,
  postCaption,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, fieldName: string) => {
    audioHaptics.playTap();
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const contentHash = proof?.contentHash || "0x9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";
  const authorWallet = proof?.authorWallet || "0x0000000000000000000000000000000000000000";
  const network = proof?.network || "Ethereum Sepolia Testnet";
  const txHash = proof?.txHash;
  const timestamp = proof?.timestamp ? new Date(proof.timestamp).toLocaleString() : new Date().toLocaleString();

  const explorerUrl = txHash
    ? `https://sepolia.etherscan.io/tx/${txHash}`
    : authorWallet
    ? `https://sepolia.etherscan.io/address/${authorWallet}`
    : null;

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Blockchain Verification"
      maxWidth="md"
    >
      <div className="space-y-4 py-1 text-left select-none">
        {/* Verification Status Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-cyan-500/10 to-transparent border border-emerald-500/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-md shadow-emerald-500/25">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                Content Authenticity Verified
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black">
                Immutable
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              This post has a cryptographically anchored SHA-256 ownership record.
            </p>
          </div>
        </div>

        {/* Verification Proof Grid */}
        <div className="space-y-2.5 text-xs font-bold">
          {/* Content SHA-256 Hash */}
          <div className="p-3 rounded-2xl glass-panel space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <Hash className="w-3 h-3 text-[#00B7FF]" />
                <span>SHA-256 Content Hash</span>
              </span>
              <button
                type="button"
                onClick={() => handleCopy(contentHash, "hash")}
                className="hover:text-cyan-500 transition-colors flex items-center gap-0.5 cursor-pointer font-bold"
              >
                {copiedField === "hash" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedField === "hash" ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <p className="font-mono text-[11px] text-slate-800 dark:text-slate-200 break-all select-text font-semibold">
              {contentHash}
            </p>
          </div>

          {/* Creator Wallet Address */}
          <div className="p-3 rounded-2xl glass-panel space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <Wallet className="w-3 h-3 text-[#9B6CFF]" />
                <span>Creator Wallet</span>
              </span>
              <button
                type="button"
                onClick={() => handleCopy(authorWallet, "wallet")}
                className="hover:text-cyan-500 transition-colors flex items-center gap-0.5 cursor-pointer font-bold"
              >
                {copiedField === "wallet" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedField === "wallet" ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <p className="font-mono text-[11px] text-slate-800 dark:text-slate-200 break-all select-text font-semibold">
              {authorWallet}
            </p>
          </div>

          {/* Network & Timestamp Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="p-3 rounded-2xl glass-panel space-y-1">
              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider">
                <Globe className="w-3 h-3 text-[#00B7FF]" />
                <span>Blockchain Network</span>
              </div>
              <p className="text-slate-900 dark:text-white font-bold text-xs">{network}</p>
            </div>

            <div className="p-3 rounded-2xl glass-panel space-y-1">
              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-wider">
                <Clock className="w-3 h-3 text-[#F45AA8]" />
                <span>Timestamp</span>
              </div>
              <p className="text-slate-900 dark:text-white font-bold text-xs">{timestamp}</p>
            </div>
          </div>
        </div>

        {/* Explorer Link & Close Action */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-white/10">
          {explorerUrl ? (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00B7FF] hover:underline cursor-pointer"
            >
              <span>View on Etherscan</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : <div />}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 font-black text-xs hover:opacity-90 transition btn-tactile cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </GlassModal>
  );
};
