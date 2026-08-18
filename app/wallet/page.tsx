"use client";

import React, { useState, useEffect } from "react";
import { 
  Wallet, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  LogOut, 
  Download, 
  AlertTriangle, 
  Loader2, 
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { useWeb3 } from "../../lib/web3Context";

export default function WalletPage() {
  const { 
    account, 
    isWeb3Connected, 
    isConnecting, 
    token, 
    profile, 
    loginStatus, 
    errorNotice, 
    isSupportedNetwork,
    networkName,
    loginWithMetaMask, 
    disconnectWallet, 
    switchNetwork,
    clearErrorNotice
  } = useWeb3();

  const [isMobile, setIsMobile] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    }
  }, []);

  const handleLogin = async () => {
    setLocalError(null);
    try {
      await loginWithMetaMask();
    } catch (err: any) {
      setLocalError(err.message || "Failed to authenticate.");
    }
  };

  const handleDownload = () => {
    if (isMobile) {
      const dappUrl = typeof window !== "undefined" ? `${window.location.host}${window.location.pathname}` : "";
      window.open(`https://metamask.app.link/dapp/${dappUrl}`, "_blank", "noopener,noreferrer");
    } else {
      window.open("https://metamask.io/download/", "_blank", "noopener,noreferrer");
    }
  };

  const hasMetaMask = typeof window !== "undefined" && Boolean((window as any).ethereum);

  return (
    <div className="max-w-md mx-auto py-8 px-4">
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#131b2e]/95 backdrop-blur-md shadow-2xl p-6 sm:p-8 space-y-6 text-center transition-all duration-300">
        
        {/* Animated Top Icon */}
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-600 p-0.5 mx-auto shadow-xl shadow-cyan-500/20 relative group">
          <div className="w-full h-full rounded-[22px] bg-slate-950 flex items-center justify-center text-cyan-400 transition-all duration-300 group-hover:scale-[0.98]">
            {isConnecting ? (
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            ) : token ? (
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
            ) : !isSupportedNetwork ? (
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            ) : (
              <Wallet className="w-8 h-8 text-cyan-400" />
            )}
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {token ? "Web3 Passport Secured" : "Web3 Wallet Portal"}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            {token 
              ? "Your decentralized identity is verified on BlockSocial." 
              : "Connect your MetaMask wallet to authenticate securely and sign transactions."}
          </p>
        </div>

        {/* 1. SECURED / LOGGED IN SESSION */}
        {token && account ? (
          <div className="space-y-4 text-left">
            <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/25 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-bold flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Session Active
                </span>
                <span className="text-emerald-500 dark:text-emerald-400 font-extrabold flex items-center gap-1 text-[11px] bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                  🟢 Verified
                </span>
              </div>
              <p className="text-xs font-mono font-bold break-all text-cyan-600 dark:text-cyan-400">{account}</p>
              {profile && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="Avatar" className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-white font-bold">W3</div>
                  )}
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Profile Linked: <span className="text-purple-500">@{profile.username}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
              🔑 **Secure Authentication**: Your session token (JWT) is stored locally on this browser. It will automatically authorize all decentralized posts, media uploads, and tips.
            </div>

            <button
              onClick={disconnectWallet}
              className="w-full py-3.5 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-extrabold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Disconnect Wallet</span>
            </button>
          </div>
        ) : (
          /* 2. NOT LOGGED IN / AUTHENTICATION INTERFACES */
          <div className="space-y-4">
            
            {/* Status logs and notifications */}
            {(loginStatus || errorNotice || localError) && (
              <div className="space-y-2 text-left">
                {loginStatus && (
                  <div className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2.5 transition-all duration-300 ${
                    loginStatus === "Login Successful" 
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400"
                      : loginStatus === "Connection Rejected" || loginStatus === "MetaMask Not Installed"
                      ? "bg-rose-500/10 border border-rose-500/30 text-rose-500"
                      : "bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400"
                  }`}>
                    {loginStatus.includes("...") ? (
                      <Loader2 className="w-4 h-4 animate-spin shrink-0 text-cyan-500" />
                    ) : loginStatus === "Login Successful" ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                    )}
                    <span>Status: {loginStatus}</span>
                  </div>
                )}

                {(errorNotice || localError) && (
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="flex-1 leading-normal">{errorNotice || localError}</span>
                  </div>
                )}
              </div>
            )}

            {/* A. MetaMask Not Installed */}
            {!hasMetaMask || loginStatus === "MetaMask Not Installed" ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-xs text-left space-y-2">
                  <div className="font-bold text-rose-500 flex items-center gap-1.5 text-sm">
                    <ShieldAlert className="w-4 h-4" />
                    <span>MetaMask Required</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    MetaMask is required for blockchain login. Please install the wallet extension or launch Aura inside the MetaMask mobile app to access the decentralized features.
                  </p>
                </div>

                <button
                  onClick={handleDownload}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all cursor-pointer transform hover:scale-[1.01]"
                >
                  <Download className="w-4.5 h-4.5" />
                  <span>Download MetaMask {isMobile ? "Mobile App" : "Extension"}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              /* B. MetaMask Installed */
              <div className="space-y-4">
                
                {/* Network enforcement block if wrong network detected */}
                {isWeb3Connected && !isSupportedNetwork && (
                  <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs text-left space-y-3">
                    <div className="font-bold text-amber-500 flex items-center gap-1.5 text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Network Switch Required</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      Your wallet is connected to <span className="font-bold text-amber-500">{networkName}</span>. However, the BlockSocial contract is deployed on <span className="font-bold text-cyan-500">Hardhat Localhost</span>. Please switch network to continue.
                    </p>
                    <button
                      onClick={() => switchNetwork(31337)}
                      className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 animate-spin-hover" />
                      <span>Switch Network to Localhost</span>
                    </button>
                  </div>
                )}

                {/* Primary MetaMask login trigger */}
                {(!isWeb3Connected || isSupportedNetwork) && (
                  <button
                    onClick={handleLogin}
                    disabled={isConnecting}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 text-white font-extrabold text-sm shadow-xl shadow-cyan-500/20 hover:opacity-95 transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 transform hover:scale-[1.01]"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Authenticating with MetaMask...</span>
                      </>
                    ) : (
                      <>
                        <Wallet className="w-5 h-5" />
                        <span>Login with MetaMask</span>
                        <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                      </>
                    )}
                  </button>
                )}

                <div className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase mt-2">
                  🔒 Cryptographic Ownership Proof • Dynamic Nonces
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
