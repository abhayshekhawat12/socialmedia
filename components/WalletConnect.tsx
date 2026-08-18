'use client';

import React from 'react';
import { useWeb3 } from '../lib/web3Context';
import { WalletDropdown } from './WalletDropdown';
import { Wallet, Loader2, AlertTriangle, X } from 'lucide-react';

export const WalletConnect: React.FC = () => {
  const { account, isWeb3Connected, connectWallet, isConnecting, isSupportedNetwork, switchNetwork, errorNotice, clearErrorNotice } = useWeb3();

  if (isWeb3Connected && account) {
    return <WalletDropdown />;
  }

  return (
    <div className="relative flex items-center gap-2">
      {errorNotice && (
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold animate-in fade-in">
          <span>{errorNotice}</span>
          <button onClick={clearErrorNotice} className="p-0.5 hover:opacity-80">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {!isSupportedNetwork ? (
        <button
          onClick={() => switchNetwork(31337)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md transition-all cursor-pointer"
        >
          <AlertTriangle className="w-4 h-4 text-slate-950" />
          <span>⚠️ Switch Network</span>
        </button>
      ) : (
        <button
          onClick={connectWallet}
          disabled={isConnecting}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <Wallet className="w-4 h-4" />
              <span>Connect Wallet</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};
