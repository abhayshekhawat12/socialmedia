'use client';

import React from 'react';
import Link from 'next/link';
import { Search, Moon, Sun, Bell, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { useTheme } from '../lib/themeContext';
import { WalletConnect } from './WalletConnect';
import { audioHaptics } from '../lib/audioHaptics';

export const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/50 dark:border-white/10 px-4 py-3 flex items-center justify-between transition-colors">
      
      {/* Left: Aura Logo & Title */}
      <Link 
        href="/feed" 
        onClick={() => audioHaptics.playNav()}
        className="flex items-center gap-2.5 group btn-tactile"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00B7FF] via-[#7EDBE8] to-[#F45AA8] p-0.5 shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
          <div className="w-full h-full rounded-full bg-white dark:bg-[#131b2e] flex items-center justify-center text-[#00B7FF]">
            <Sparkles className="w-4 h-4 text-[#00B7FF] fill-current" />
          </div>
        </div>
        <span className="font-black text-xl tracking-tight bg-gradient-to-r from-[#101820] to-[#00B7FF] dark:from-white dark:to-[#7EDBE8] bg-clip-text text-transparent font-sans">
          aura
        </span>
      </Link>

      {/* Right: Search, Dark Mode, Notifications & Wallet */}
      <div className="flex items-center gap-1.5 text-[#101820] dark:text-slate-200">
        
        {/* Search */}
        <Link
          href="/explore"
          onClick={() => audioHaptics.playTap()}
          className="p-2 rounded-full glass-pill hover:bg-white/60 dark:hover:bg-slate-800 transition-all btn-tactile"
          title="Search"
        >
          <Search className="w-4.5 h-4.5 stroke-[2.4]" />
        </Link>

        {/* Theme Toggle */}
        <button
          onClick={() => {
            audioHaptics.playTap();
            toggleTheme();
          }}
          className="p-2 rounded-full glass-pill hover:bg-white/60 dark:hover:bg-slate-800 transition-all btn-tactile"
          title="Toggle Dark/Light Mode"
        >
          {theme === 'dark' ? <Sun className="w-4.5 h-4.5 text-amber-400 stroke-[2.4]" /> : <Moon className="w-4.5 h-4.5 stroke-[2.4]" />}
        </button>

        {/* Notifications */}
        <Link
          href="/notifications"
          onClick={() => audioHaptics.playTap()}
          className="p-2 rounded-full glass-pill hover:bg-white/60 dark:hover:bg-slate-800 transition-all relative btn-tactile"
          title="Notifications"
        >
          <Bell className="w-4.5 h-4.5 stroke-[2.4]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#F45AA8] ring-2 ring-white dark:ring-[#131b2e] shadow-sm animate-pulse" />
        </Link>

        {/* Wallet Connection */}
        <WalletConnect />
      </div>

    </header>
  );
};
