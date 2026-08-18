'use client';

import React from 'react';
import { Download, ExternalLink, ShieldCheck, X, Wallet } from 'lucide-react';

interface InstallMetamaskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallMetamaskModal: React.FC<InstallMetamaskModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleInstallClick = () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      const dappUrl = typeof window !== 'undefined' ? `${window.location.host}${window.location.pathname}` : '';
      window.open(`https://metamask.app.link/dapp/${dappUrl}`, '_blank', 'noopener,noreferrer');
    } else {
      window.open('https://metamask.io/download/', '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-[2rem] p-6 max-w-md w-full shadow-2xl space-y-5 text-slate-800 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">MetaMask Required</h3>
              <p className="text-xs text-slate-500">Crypto wallet extension needed</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg font-bold">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Box */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-600">
          <div className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Connect to Web3 Blockchain</span>
          </div>
          <p className="leading-relaxed">
            MetaMask is a secure browser extension wallet that allows you to manage your decentralized identity, sign transactions, and interact with smart contracts safely.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <button
            onClick={handleInstallClick}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Install MetaMask Extension</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
          >
            Continue Browsing Read-Only Feed
          </button>
        </div>

      </div>
    </div>
  );
};
