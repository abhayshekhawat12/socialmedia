'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlayCircle, MessageCircle, Globe, Flame, User } from 'lucide-react';
import { useWeb3 } from '../lib/web3Context';

export const BottomNavigation: React.FC = () => {
  const pathname = usePathname();
  const { account } = useWeb3();

  const profileHref = account ? `/profile/${account}` : '/profile';

  const navItems = [
    { label: 'Home', href: '/feed', icon: Home },
    { label: 'Pulse', href: '/pulse', icon: PlayCircle, badge: '⚡' },
    { label: 'Trending', href: '/trending', icon: Flame, badge: '🔥' },
    { label: 'Community', href: '/community', icon: Globe, badge: '🌐' },
    { label: 'Chat', href: '/chats', icon: MessageCircle, badge: '1' },
    { label: 'Profile', href: profileHref, icon: User },
  ];

  return (
    <nav className="shrink-0 z-40 px-2 py-1.5 w-full bg-white/95 dark:bg-[#131b2e]/95 border-t border-slate-100 dark:border-slate-800">
      <div className="flex items-center justify-around gap-0.5 text-[9px] font-bold">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href === '/feed' && pathname === '/') || (item.href !== '/feed' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 transition-all relative px-1 py-0.5 shrink-0 ${
                isActive
                  ? 'text-[#00B7FF] font-extrabold scale-105'
                  : 'text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-4.5 h-4.5 ${isActive ? 'stroke-[2.5] text-[#00B7FF]' : 'stroke-[2.2]'}`} />
                {item.badge && item.label === 'Chat' && (
                  <span className="absolute -top-1 -right-2 bg-[#00B7FF] text-white text-[8px] font-extrabold px-1 rounded-full border border-white dark:border-[#131b2e]">
                    {item.badge}
                  </span>
                )}
                {item.badge && item.label !== 'Chat' && (
                  <span className="absolute -top-1.5 -right-2.5 text-[9px]">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[8.5px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
