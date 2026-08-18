'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useWeb3 } from '../lib/web3Context';
import { Wallet, Copy, Check, ExternalLink, LogOut, ChevronDown, Shield, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export const WalletDropdown: React.FC = () => {
  const { account, chainId, networkName, isSupportedNetwork, switchNetwork, disconnectWallet, isWeb3Connected } = useWeb3();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isWeb3Connected || !account) return null;

  const shortAddress = `${account.substring(0, 6)}...${account.substring(account.length - 4)}`;

  const copyAddress = () => {
    navigator.clipboard.writeText(account);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-extrabold text-xs shadow-md transition-all cursor-pointer hover:opacity-90"
      >
        <span className="flex items-center gap-1.5 text-emerald-400 dark:text-emerald-600 font-bold text-[11px]">
          🟢 Connected
        </span>
        <span className="font-mono text-cyan-300 dark:text-cyan-700">{shortAddress}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-4 z-50 text-slate-800 dark:text-slate-100 space-y-4 animate-in fade-in slide-in-from-top-2">
          
          {/* Header Status */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-cyan-500/10 text-cyan-400">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-500">
                  <span>🟢 Connected</span>
                </div>
                <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">{shortAddress}</div>
              </div>
            </div>
            <button
              onClick={copyAddress}
              title="Copy Address"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Network Info */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 font-semibold">
              <span>Network:</span>
              <span className={`font-bold ${isSupportedNetwork ? "text-cyan-500" : "text-amber-500"}`}>
                {networkName}
              </span>
            </div>
            {!isSupportedNetwork && (
              <button
                onClick={() => switchNetwork(31337)}
                className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Switch to Supported Network</span>
              </button>
            )}
          </div>

          {/* Action Links */}
          <div className="space-y-1 text-xs font-bold">
            <Link
              href="/wallet"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>View Wallet Dashboard</span>
            </Link>

            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-purple-400" />
              <span>Blockchain & Ownership Settings</span>
            </Link>

            <button
              onClick={() => {
                disconnectWallet();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-extrabold transition-colors text-left mt-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Disconnect Wallet</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
