'use client';

import React from 'react';
import { useWeb3 } from '../lib/web3Context';
import { Network } from 'lucide-react';

export const NetworkSwitcher: React.FC = () => {
  const { chainId, account } = useWeb3();

  if (!account) return null;

  const networkName = chainId === 11155111 ? 'Sepolia Testnet' : 'Local Node (31337)';

  return (
    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
      <Network className="w-3.5 h-3.5" />
      <span>{networkName}</span>
    </div>
  );
};
