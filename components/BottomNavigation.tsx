'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlayCircle, MessageCircle, Camera, Flame, User } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { audioHaptics } from '../lib/audioHaptics';

export const BottomNavigation: React.FC = () => {
  const pathname = usePathname();
  const { account } = useAuth();

  const profileHref = account ? `/profile/${account}` : '/profile';

  const navItems = [
    { label: 'Home', href: '/feed', icon: Home },
    { label: 'Snap', href: '/snap', icon: Camera, badge: '👻' },
    { label: 'Pulse', href: '/pulse', icon: PlayCircle, badge: '⚡' },
    { label: 'Trending', href: '/trending', icon: Flame, badge: '🔥' },
    { label: 'Chat', href: '/chats', icon: MessageCircle, badge: '1' },
    { label: 'Profile', href: profileHref, icon: User },
  ];

  return (
    <nav className="shrink-0 z-40 p-2 w-full">
      <div className="glass-panel rounded-full px-2 py-1.5 flex items-center justify-around gap-1 shadow-floating border border-white/60 dark:border-white/10">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href === '/feed' && pathname === '/') || (item.href !== '/feed' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => audioHaptics.playNav()}
              className={`flex flex-col items-center gap-0.5 transition-all relative py-1 px-2 rounded-2xl btn-tactile cursor-pointer ${
                isActive
                  ? 'bg-white/80 dark:bg-white/15 text-[#00B7FF] dark:text-[#7EDBE8] font-black shadow-sm scale-[1.04]'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-4.5 h-4.5 ${isActive ? 'stroke-[2.8] text-[#00B7FF] dark:text-[#7EDBE8]' : 'stroke-[2.2]'}`} />
                {item.badge && item.label === 'Chat' && (
                  <span className="absolute -top-1 -right-2 bg-gradient-to-r from-[#F45AA8] to-[#9B6CFF] text-white text-[8px] font-extrabold px-1 rounded-full border border-white dark:border-[#131b2e] shadow-sm">
                    {item.badge}
                  </span>
                )}
                {item.badge && item.label !== 'Chat' && (
                  <span className="absolute -top-1.5 -right-2.5 text-[9px]">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[8.5px] tracking-tight font-bold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
