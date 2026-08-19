'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PlusSquare, PlayCircle, User } from 'lucide-react';
import { useWeb3 } from '../lib/web3Context';

export const MobileNavbar: React.FC = () => {
  const pathname = usePathname();
  const { account } = useWeb3();

  const navItems = [
    { href: '/feed', icon: Home, label: 'Home' },
    { href: '/explore', icon: Search, label: 'Search' },
    { href: '/create', icon: PlusSquare, label: 'Create' },
    { href: '/pulse', icon: PlayCircle, label: 'Reels' },
    { href: account ? `/profile/${account}` : '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 px-3 py-2 flex items-center justify-around">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href.startsWith('/profile') && pathname.startsWith('/profile'));

        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-semibold transition-colors ${
              isActive ? 'text-[#00B7FF] font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-[#00B7FF]' : 'text-slate-400'}`} />
            <span className="text-[10px]">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
