'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../lib/authContext';
import { User, LogOut, Settings, PlusCircle, ChevronDown } from 'lucide-react';
import Link from 'next/link';

export const WalletDropdown: React.FC = () => {
  const { account, profile, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
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

  if (!account) return null;

  const displayName = profile?.displayName || `User ${account.slice(0, 6)}`;
  const username = profile?.username || `user_${account.slice(0, 8)}`;
  const avatarUrl = profile?.avatarUrl;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-full glass-panel hover:bg-white/80 dark:hover:bg-slate-800/80 border border-white/60 dark:border-white/10 transition-all cursor-pointer shadow-sm btn-tactile"
      >
        <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-tr from-[#00B7FF] to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            displayName.charAt(0).toUpperCase()
          )}
        </div>
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[90px] truncate hidden sm:inline-block">
          {displayName}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-3 z-50 text-slate-800 dark:text-slate-100 space-y-1 animate-in fade-in slide-in-from-top-2">
          
          {/* User Details */}
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 mb-1">
            <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{displayName}</p>
            <p className="text-[11px] text-cyan-500 font-semibold truncate">@{username}</p>
          </div>

          {/* Links */}
          <Link
            href="/profile"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/80 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
          >
            <User className="w-4 h-4 text-[#00B7FF]" />
            <span>My Profile</span>
          </Link>

          <Link
            href="/create"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/80 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
          >
            <PlusCircle className="w-4 h-4 text-purple-400" />
            <span>Create Post</span>
          </Link>

          <Link
            href="/settings"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/80 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Settings</span>
          </Link>

          <button
            onClick={() => {
              setIsOpen(false);
              logout();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-extrabold text-xs transition-colors text-left mt-1 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      )}
    </div>
  );
};
