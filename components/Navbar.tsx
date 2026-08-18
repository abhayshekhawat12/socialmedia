'use client';

import React from 'react';
import Link from 'next/link';
import { Search, Moon, Sun, Bell, Sparkles } from 'lucide-react';
import { useTheme } from '../lib/themeContext';
import { WalletConnect } from './WalletConnect';

export const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-[#131b2e]/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center justify-between transition-colors">
      
      {/* Left: Aura Logo & Title */}
      <Link href="/feed" className="flex items-center gap-2 group">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00B7FF] to-[#36C4FF] flex items-center justify-center text-white shadow-md shadow-[#00B7FF]/30 group-hover:scale-105 transition-transform">
          <Sparkles className="w-4 h-4 fill-white text-white" />
        </div>
        <span className="font-extrabold text-xl tracking-tight text-[#00B7FF] font-sans">
          aura
        </span>
      </Link>

      {/* Right: Search, Dark Mode, Notifications & Wallet */}
      <div className="flex items-center gap-2 text-[#1E293B] dark:text-slate-200">
        <Link
          href="/explore"
          className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Search"
        >
          <Search className="w-5 h-5 stroke-[2.2]" />
        </Link>

        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Toggle Dark/Light Mode"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400 stroke-[2.2]" /> : <Moon className="w-5 h-5 stroke-[2.2]" />}
        </button>

        <Link
          href="/notifications"
          className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
          title="Notifications"
        >
          <Bell className="w-5 h-5 stroke-[2.2]" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#00B7FF] ring-2 ring-white dark:ring-[#131b2e]" />
        </Link>

        <WalletConnect />
      </div>

    </header>
  );
};
