"use client";

import React, { useState } from "react";
import { GlassModal } from "./ui/GlassModal";
import { useMetaMask, SEPOLIA_TESTNET } from "../lib/web3/web3Context";
import { audioHaptics } from "../lib/audioHaptics";
import { 
  Link2, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Sparkles,
  ShieldCheck
} from "lucide-react";

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ConnectWalletModal: React.FC<ConnectWalletModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const {
    isMetaMaskInstalled,
    walletState,
    errorMessage,
    isSupportedNetwork,
    networkName,
    connectMetaMask,
    switchNetwork,
    clearError,
  } = useMetaMask();

  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    audioHaptics.playTap();
    setIsConnecting(true);
    try {
      const success = await connectMetaMask();
      if (success) {
        audioHaptics.playLike();
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
        }, 500);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSwitchNetwork = async () => {
    audioHaptics.playTap();
    setIsConnecting(true);
    try {
      await switchNetwork(SEPOLIA_TESTNET.chainId);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={() => {
        clearError();
        onClose();
      }}
      title="Connect Wallet"
      maxWidth="sm"
    >
      <div className="space-y-4 py-1 text-center select-none">
        {/* Glowing Wallet Icon */}
        <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-[#00B7FF] via-[#7EDBE8] to-[#9B6CFF] p-0.5 mx-auto shadow-md shadow-cyan-500/25 flex items-center justify-center">
          <div className="w-full h-full rounded-[22px] bg-white dark:bg-slate-900 flex items-center justify-center text-[#00B7FF]">
            <Link2 className="w-7 h-7 stroke-[2.5]" />
          </div>
        </div>

        {/* Heading & Subtitle */}
        <div className="space-y-1.5">
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            Connect Wallet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-xs mx-auto">
            Connect your wallet to unlock blockchain ownership, verification and creator rewards.
          </p>
        </div>

        {/* Key Features Pill List */}
        <div className="grid grid-cols-3 gap-1.5 py-1 text-[10px] font-bold text-slate-600 dark:text-slate-300">
          <div className="p-2 rounded-2xl glass-panel flex flex-col items-center gap-1 text-center">
            <ShieldCheck className="w-4 h-4 text-[#00B7FF]" />
            <span>Ownership</span>
          </div>
          <div className="p-2 rounded-2xl glass-panel flex flex-col items-center gap-1 text-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Verification</span>
          </div>
          <div className="p-2 rounded-2xl glass-panel flex flex-col items-center gap-1 text-center">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Tipping</span>
          </div>
        </div>

        {/* Error / Not Installed Notice */}
        {!isMetaMaskInstalled ? (
          <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold space-y-2 text-left">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-bold">MetaMask isn&apos;t installed.</span>
            </div>
            <p className="text-[11px] leading-snug">
              Install the MetaMask browser extension or mobile app to use optional Web3 features.
            </p>
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-[11px] shadow-sm hover:opacity-90 transition btn-tactile"
            >
              <span>Install MetaMask</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : errorMessage ? (
          <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        ) : !isSupportedNetwork ? (
          <div className="p-3 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 text-xs font-semibold space-y-2 text-left">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-bold">Unsupported Network ({networkName || "Unknown"})</span>
            </div>
            <p className="text-[11px] leading-snug">
              Please switch to Ethereum Sepolia Testnet for zero-cost testing.
            </p>
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          {isMetaMaskInstalled ? (
            !isSupportedNetwork ? (
              <button
                type="button"
                onClick={handleSwitchNetwork}
                disabled={isConnecting}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 font-black text-xs shadow-md hover:opacity-95 transition-opacity flex items-center justify-center gap-2 btn-tactile cursor-pointer disabled:opacity-50"
              >
                {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Switch to Sepolia Testnet</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnect}
                disabled={isConnecting || walletState === "CONNECTING"}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#00B7FF] via-[#7EDBE8] to-[#9B6CFF] text-slate-950 font-black text-xs shadow-md hover:opacity-95 transition-opacity flex items-center justify-center gap-2 btn-tactile cursor-pointer disabled:opacity-50"
              >
                {isConnecting || walletState === "CONNECTING" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Connecting MetaMask...</span>
                  </>
                ) : (
                  <span>Connect MetaMask</span>
                )}
              </button>
            )
          ) : (
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 font-black text-xs shadow-md hover:opacity-95 transition-opacity flex items-center justify-center gap-2 btn-tactile cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Get MetaMask</span>
            </a>
          )}

          <button
            type="button"
            onClick={() => {
              clearError();
              onClose();
            }}
            className="w-full py-2.5 rounded-2xl glass-pill text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer btn-tactile"
          >
            Cancel
          </button>
        </div>
      </div>
    </GlassModal>
  );
};
