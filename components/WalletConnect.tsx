'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/authContext';
import { WalletDropdown } from './WalletDropdown';
import { LogIn } from 'lucide-react';

export const WalletConnect: React.FC = () => {
  const { account } = useAuth();

  if (account) {
    return <WalletDropdown />;
  }

  return (
    <Link
      href="/login"
      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#00B7FF] hover:bg-[#00B7FF]/90 text-slate-950 font-extrabold text-xs shadow-md transition-all cursor-pointer btn-tactile"
    >
      <LogIn className="w-3.5 h-3.5" />
      <span>Sign In</span>
    </Link>
  );
};
