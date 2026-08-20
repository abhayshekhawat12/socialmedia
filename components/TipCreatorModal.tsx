"use client";

import React, { useState } from "react";
import { GlassModal } from "./ui/GlassModal";
import { useMetaMask, SEPOLIA_TESTNET } from "../lib/web3/web3Context";
import { audioHaptics } from "../lib/audioHaptics";
import { 
  Sparkles, 
  Wallet, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  Coins
} from "lucide-react";

interface TipCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorAddress: string;
  creatorName?: string;
  creatorAvatar?: string;
  onOpenConnectWallet?: () => void;
}

export const TipCreatorModal: React.FC<TipCreatorModalProps> = ({
  isOpen,
  onClose,
  creatorAddress,
  creatorName = "Creator",
  creatorAvatar,
  onOpenConnectWallet,
}) => {
  const {
    walletAddress,
    isWalletConnected,
    isSupportedNetwork,
    switchNetwork,
    sendTip,
  } = useMetaMask();

  const [selectedAmount, setSelectedAmount] = useState<string>("0.005");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successTxHash, setSuccessTxHash] = useState<string | null>(null);

  const presets = ["0.001", "0.005", "0.01", "0.05"];

  const handleSendTip = async () => {
    setErrorMessage(null);
    setSuccessTxHash(null);

    const finalAmount = customAmount.trim() ? customAmount.trim() : selectedAmount;
    if (!finalAmount || isNaN(parseFloat(finalAmount)) || parseFloat(finalAmount) <= 0) {
      setErrorMessage("Please enter a valid tip amount.");
      return;
    }

    if (!creatorAddress || !creatorAddress.startsWith("0x")) {
      setErrorMessage("This creator has not connected a valid EVM wallet yet.");
      return;
    }

    try {
      setIsSubmitting(true);
      setStatusMessage("Requesting MetaMask approval...");
      audioHaptics.playTap();

      const result = await sendTip(creatorAddress, finalAmount);

      if (!result.success) {
        throw new Error(result.error || "Tip transaction could not be completed.");
      }

      setSuccessTxHash(result.txHash || null);
      audioHaptics.playLike();
      setStatusMessage("Tip sent successfully on Sepolia Testnet! 🎉");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to send tip.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. If viewer does NOT have wallet connected: Show the required small clean modal
  if (!isWalletConnected) {
    return (
      <GlassModal isOpen={isOpen} onClose={onClose} title="Tip Creator" maxWidth="sm">
        <div className="space-y-4 py-2 text-center select-none">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00B7FF] to-[#9B6CFF] text-white flex items-center justify-center mx-auto shadow-md shadow-cyan-500/25">
            <Coins className="w-6 h-6 animate-pulse" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Connect your wallet to send blockchain rewards.
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-xs mx-auto">
              Tip {creatorName} in testnet ETH directly from your MetaMask wallet.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenConnectWallet) onOpenConnectWallet();
              }}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#00B7FF] via-[#7EDBE8] to-[#9B6CFF] text-slate-950 font-black text-xs shadow-md hover:opacity-95 transition-opacity btn-tactile cursor-pointer"
            >
              Connect MetaMask
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-2xl glass-pill text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer btn-tactile"
            >
              Cancel
            </button>
          </div>
        </div>
      </GlassModal>
    );
  }

  // 2. If viewer has wallet connected: Show standard tipping dialog
  return (
    <GlassModal
      isOpen={isOpen}
      onClose={() => {
        setErrorMessage(null);
        setSuccessTxHash(null);
        setStatusMessage(null);
        onClose();
      }}
      title="Tip Creator 💎"
      maxWidth="sm"
    >
      <div className="space-y-4 py-1 text-left select-none">
        {/* Creator Info Card */}
        <div className="p-3.5 rounded-2xl glass-panel flex items-center gap-3">
          <div className="w-11 h-11 rounded-full overflow-hidden p-0.5 bg-gradient-to-tr from-[#00B7FF] to-[#9B6CFF] shrink-0">
            {creatorAvatar ? (
              <img src={creatorAvatar} alt={creatorName} className="w-full h-full rounded-full object-cover bg-slate-900" />
            ) : (
              <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-white font-black text-xs">
                {creatorName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-black text-xs text-slate-900 dark:text-white truncate">
              {creatorName}
            </h4>
            <p className="font-mono text-[10px] text-cyan-500 dark:text-cyan-400 truncate">
              {creatorAddress.slice(0, 6)}...{creatorAddress.slice(-4)}
            </p>
          </div>
        </div>

        {/* Error Notice */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {/* Success Notice */}
        {successTxHash && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold space-y-1.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
            <a
              href={`https://sepolia.etherscan.io/tx/${successTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-[#00B7FF] hover:underline"
            >
              <span>View transaction on Sepolia Explorer</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Amount Selector */}
        {!successTxHash && (
          <div className="space-y-3">
            <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Select Tip Amount (Sepolia ETH)
            </label>

            <div className="grid grid-cols-4 gap-2">
              {presets.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    audioHaptics.playTap();
                    setSelectedAmount(amt);
                    setCustomAmount("");
                  }}
                  className={`py-2 px-2 rounded-2xl font-black text-xs transition-all cursor-pointer btn-tactile ${
                    selectedAmount === amt && !customAmount
                      ? "bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 shadow-md shadow-cyan-500/25"
                      : "glass-pill text-slate-700 dark:text-slate-200 hover:text-slate-900"
                  }`}
                >
                  {amt} ETH
                </button>
              ))}
            </div>

            <div>
              <input
                type="number"
                step="0.001"
                min="0.0001"
                placeholder="Or enter custom amount in ETH..."
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedAmount("");
                }}
                className="w-full p-3 rounded-2xl glass-input text-xs font-semibold text-slate-900 dark:text-white outline-none"
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2 pt-1">
          {!successTxHash ? (
            !isSupportedNetwork ? (
              <button
                type="button"
                onClick={() => switchNetwork(SEPOLIA_TESTNET.chainId)}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 font-black text-xs shadow-md btn-tactile cursor-pointer"
              >
                Switch to Sepolia Testnet
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSendTip}
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#00B7FF] via-[#7EDBE8] to-[#F45AA8] text-slate-950 font-black text-xs shadow-md hover:opacity-95 transition-opacity flex items-center justify-center gap-2 btn-tactile cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>{statusMessage || "Processing Tip..."}</span>
                  </>
                ) : (
                  <span>Send Tip 💎</span>
                )}
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 font-black text-xs shadow-md btn-tactile cursor-pointer"
            >
              Done
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl glass-pill text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer btn-tactile"
          >
            Cancel
          </button>
        </div>
      </div>
    </GlassModal>
  );
};
