'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWeb3 } from '../../lib/web3Context';
import { useTheme } from '../../lib/themeContext';
import { useSettings } from '../../lib/settingsContext';
import {
  ArrowLeft,
  Search,
  User,
  Lock,
  Shield,
  Bell,
  Film,
  BarChart3,
  MessageCircle,
  Sparkles,
  Palette,
  HardDrive,
  UserX,
  Key,
  TrendingUp,
  HelpCircle,
  Info,
  LogOut,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Check,
  X,
  AlertTriangle,
  RefreshCw,
  Wallet,
  Copy,
  ExternalLink,
  Trash2,
  Sliders,
  Eye,
  Zap,
  Globe,
  Radio,
  Clock,
  Download,
  Share2
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { account, chainId, networkName, isSupportedNetwork, switchNetwork, disconnectWallet } = useWeb3();
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings, blockedAccounts, sessions, blockUser, unblockUser, clearCache, cacheSizeMB } = useSettings();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cacheClearedMsg, setCacheClearedMsg] = useState(false);

  const categories = [
    { id: 'account', label: 'Account', icon: User, desc: 'Profile, Username, Email, Password & Accounts' },
    { id: 'privacy', label: 'Privacy', icon: Lock, desc: 'Account privacy, Interactions & Story rules' },
    { id: 'security', label: 'Security', icon: Shield, desc: '2FA, Active Sessions & Trusted devices' },
    { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Alerts, Mute & Push notifications' },
    { id: 'content', label: 'Content & Preferences', icon: Film, desc: 'Sensitive content, Hidden words & Quality' },
    { id: 'activity', label: 'Your Activity', icon: BarChart3, desc: 'Posts, Pulse videos, Likes & Time spent' },
    { id: 'messaging', label: 'Messaging', icon: MessageCircle, desc: 'Requests, Read receipts & Auto-download' },
    { id: 'creator', label: 'Creator / Professional', icon: Sparkles, desc: 'Analytics, Reputation & Monetization' },
    { id: 'appearance', label: 'Appearance', icon: Palette, desc: 'Dark / Light Theme, Language & UI' },
    { id: 'storage', label: 'Data & Storage', icon: HardDrive, desc: 'Cache size, Data saver & Quality' },
    { id: 'blocked', label: 'Blocked & Restricted', icon: UserX, desc: 'Manage blocked, restricted & muted' },
    { id: 'blockchain', label: 'Blockchain & Ownership', icon: Key, desc: 'Wallet status, Verifications & Hashes' },
    { id: 'development', label: 'Development Preferences', icon: TrendingUp, desc: 'Trend alerts, AI suggestions & Best times' },
    { id: 'help', label: 'Help & Support', icon: HelpCircle, desc: 'Help center, Reports & Guidelines' },
    { id: 'about', label: 'About', icon: Info, desc: 'App version, Terms & Open source' },
  ];

  const filteredCategories = categories.filter(c =>
    c.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const copyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClearCache = () => {
    clearCache();
    setCacheClearedMsg(true);
    setTimeout(() => setCacheClearedMsg(false), 3000);
  };

  return (
    <div className="space-y-4 pb-20">
      
      {/* Top Bar Header */}
      <div className="flex items-center justify-between px-1 py-1">
        <button
          onClick={() => {
            if (activeCategory) setActiveCategory(null);
            else router.push('/profile');
          }}
          className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-extrabold text-sm hover:opacity-80 transition-opacity"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          <span>{activeCategory ? 'Back to Settings' : 'Settings & More'}</span>
        </button>

        {activeCategory && (
          <span className="text-xs font-bold text-[#00B7FF] uppercase tracking-wider">
            {categories.find(c => c.id === activeCategory)?.label}
          </span>
        )}
      </div>

      {/* Search Settings Bar */}
      {!activeCategory && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search settings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:outline-none focus:border-[#00B7FF]"
          />
        </div>
      )}

      {/* MAIN CATEGORIES GRID / LIST */}
      {!activeCategory && (
        <div className="space-y-2">
          {filteredCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800/80 hover:border-[#00B7FF]/50 transition-all text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 text-[#00B7FF] group-hover:scale-105 transition-transform">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-900 dark:text-white">{cat.label}</h3>
                    <p className="text-[11px] text-slate-400 font-medium">{cat.desc}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            );
          })}

          {/* DANGER ZONE / ACCOUNT ACTIONS */}
          <div className="pt-4 space-y-2">
            <div className="text-[11px] font-extrabold text-rose-500 uppercase tracking-wider px-1">
              Account Actions
            </div>

            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 font-extrabold text-xs hover:bg-rose-500/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </div>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowDeactivateConfirm(true)}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-amber-500 font-bold text-xs hover:border-amber-500/50 transition-colors"
            >
              <span>Deactivate Account</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-rose-500 font-bold text-xs hover:border-rose-500/50 transition-colors"
            >
              <span>Delete Account Permanently</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* CATEGORY DETAILED VIEWS */}
      {activeCategory && (
        <div className="bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-6 text-xs animate-in fade-in">
          
          {/* 1. ACCOUNT */}
          {activeCategory === 'account' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                ⚙️ Account Details
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Display Name</label>
                  <input
                    type="text"
                    defaultValue="Elena Rostova"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Username (@handle)</label>
                  <input
                    type="text"
                    defaultValue="elena_vibe"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Bio</label>
                  <textarea
                    rows={2}
                    defaultValue="Digital Creator & Web3 Photographer. Capturing coastal sunlight & cosmic views. 🌊✨"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Email</label>
                    <input
                      type="email"
                      defaultValue="elena@blocksocial.io"
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-semibold text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Phone</label>
                    <input
                      type="text"
                      defaultValue="+1 (555) 019-2834"
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-semibold text-[11px]"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">Connected Accounts</div>
                    <div className="text-[10px] text-slate-400">MetaMask, Google, GitHub</div>
                  </div>
                  <span className="text-[11px] font-extrabold text-[#00B7FF]">3 Connected</span>
                </div>
              </div>
            </div>
          )}

          {/* 2. PRIVACY */}
          {activeCategory === 'privacy' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                🔒 Privacy Settings
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">Private Account</div>
                    <div className="text-[10px] text-slate-400">Only approved followers can view your posts and Pulse videos.</div>
                  </div>
                  <button onClick={() => updateSettings({ privateAccount: !settings.privateAccount })}>
                    {settings.privateAccount ? <ToggleRight className="w-7 h-7 text-[#00B7FF]" /> : <ToggleLeft className="w-7 h-7 text-slate-400" />}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">Activity Status</div>
                    <div className="text-[10px] text-slate-400">Allow accounts you follow to see when you are active.</div>
                  </div>
                  <button onClick={() => updateSettings({ activityStatus: !settings.activityStatus })}>
                    {settings.activityStatus ? <ToggleRight className="w-7 h-7 text-[#00B7FF]" /> : <ToggleLeft className="w-7 h-7 text-slate-400" />}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">Read Receipts</div>
                    <div className="text-[10px] text-slate-400">Show blue checkmarks when you have read messages.</div>
                  </div>
                  <button onClick={() => updateSettings({ readReceipts: !settings.readReceipts })}>
                    {settings.readReceipts ? <ToggleRight className="w-7 h-7 text-[#00B7FF]" /> : <ToggleLeft className="w-7 h-7 text-slate-400" />}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">Allow Pulse Remix</div>
                    <div className="text-[10px] text-slate-400">Allow other creators to remix or react to your Pulse videos.</div>
                  </div>
                  <button onClick={() => updateSettings({ allowRemix: !settings.allowRemix })}>
                    {settings.allowRemix ? <ToggleRight className="w-7 h-7 text-[#00B7FF]" /> : <ToggleLeft className="w-7 h-7 text-slate-400" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. SECURITY */}
          {activeCategory === 'security' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                🛡️ Security & Active Sessions
              </h3>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Two-Factor Authentication</div>
                  <div className="text-[10px] text-slate-400">Require authenticator app code on unrecognized logins.</div>
                </div>
                <button onClick={() => updateSettings({ twoFactorEnabled: !settings.twoFactorEnabled })}>
                  {settings.twoFactorEnabled ? <ToggleRight className="w-7 h-7 text-[#00B7FF]" /> : <ToggleLeft className="w-7 h-7 text-slate-400" />}
                </button>
              </div>

              <div className="space-y-2 pt-2">
                <div className="font-bold text-slate-900 dark:text-white">Active Sessions</div>
                {sessions.map((sess) => (
                  <div key={sess.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{sess.deviceName}</div>
                      <div className="text-[10px] text-slate-400">{sess.location} • Active now</div>
                    </div>
                    {sess.isCurrent ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">This Device</span>
                    ) : (
                      <button className="text-rose-500 font-bold text-[10px] hover:underline">Logout</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. NOTIFICATIONS */}
          {activeCategory === 'notifications' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                🔔 Notification Preferences
              </h3>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <div>
                  <div className="font-bold text-rose-500">Mute All Notifications</div>
                  <div className="text-[10px] text-slate-400">Pause all push and in-app alerts.</div>
                </div>
                <button onClick={() => updateSettings({ muteAllNotifications: !settings.muteAllNotifications })}>
                  {settings.muteAllNotifications ? <ToggleRight className="w-7 h-7 text-rose-500" /> : <ToggleLeft className="w-7 h-7 text-slate-400" />}
                </button>
              </div>

              <div className="space-y-2">
                {[
                  { key: 'notificationLikes', label: 'Likes & Reactions' },
                  { key: 'notificationComments', label: 'Comments & Replies' },
                  { key: 'notificationFollows', label: 'New Followers' },
                  { key: 'notificationMessages', label: 'Direct Messages' },
                  { key: 'notificationPulse', label: 'Pulse Trending Alerts' },
                  { key: 'notificationDevelopment', label: 'Development & Opportunity Alerts' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{item.label}</span>
                    <button onClick={() => updateSettings({ [item.key]: !(settings as any)[item.key] })}>
                      {(settings as any)[item.key] ? <ToggleRight className="w-6 h-6 text-[#00B7FF]" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 8. CREATOR / PROFESSIONAL */}
          {activeCategory === 'creator' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
                <span>⭐ Creator Dashboard</span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-[#00B7FF] text-[10px]">Creator Mode ON</span>
              </h3>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-base font-extrabold text-[#00B7FF]">24.8K</div>
                  <div className="text-[10px] text-slate-400 font-bold">Total Views</div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-base font-extrabold text-purple-400">18.2K</div>
                  <div className="text-[10px] text-slate-400 font-bold">Pulse Views</div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-base font-extrabold text-emerald-400">94% ✓</div>
                  <div className="text-[10px] text-slate-400 font-bold">Authentic Score</div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <div className="text-base font-extrabold text-amber-400">87 / 100</div>
                  <div className="text-[10px] text-slate-400 font-bold">Creator Score</div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#00B7FF]">Creator Monetization</div>
                  <div className="text-[10px] text-slate-400">Earn tips & revenue share on viral Pulse content.</div>
                </div>
                <button className="px-3 py-1 rounded-xl bg-[#00B7FF] text-slate-950 font-extrabold text-[11px]">
                  Active
                </button>
              </div>
            </div>
          )}

          {/* 9. APPEARANCE */}
          {activeCategory === 'appearance' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                🎨 Theme & Appearance
              </h3>

              <div className="space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-200">App Theme</div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setTheme('light')}
                    className={`p-3 rounded-2xl border font-bold text-center transition-all ${
                      theme === 'light'
                        ? 'bg-[#00B7FF]/10 border-[#00B7FF] text-[#00B7FF]'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    ☀️ Light
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`p-3 rounded-2xl border font-bold text-center transition-all ${
                      theme === 'dark'
                        ? 'bg-[#00B7FF]/10 border-[#00B7FF] text-[#00B7FF]'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    🌙 Dark
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`p-3 rounded-2xl border font-bold text-center transition-all bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400`}
                  >
                    🖥️ System
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 10. DATA & STORAGE */}
          {activeCategory === 'storage' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                📱 Data & Cache Storage
              </h3>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white">App Storage</div>
                  <div className="text-[11px] text-slate-400 font-mono">Temporary Cache: {cacheSizeMB} MB</div>
                </div>
                <button
                  onClick={handleClearCache}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-md transition-colors"
                >
                  Clear Cache
                </button>
              </div>

              {cacheClearedMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-center animate-in fade-in">
                  ✓ Temporary cache cleared successfully!
                </div>
              )}
            </div>
          )}

          {/* 12. BLOCKCHAIN & OWNERSHIP */}
          {activeCategory === 'blockchain' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                🔐 Blockchain & Ownership
              </h3>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold">Wallet Status:</span>
                  <span className="font-extrabold text-emerald-400 flex items-center gap-1">
                    🟢 Connected
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold">Wallet Address:</span>
                  <button onClick={copyAddress} className="font-mono text-[#00B7FF] font-bold flex items-center gap-1">
                    <span>{account ? `${account.slice(0, 8)}...${account.slice(-6)}` : '0x7A...92F'}</span>
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold">Network:</span>
                  <span className="font-bold text-purple-400">{networkName}</span>
                </div>

                <div className="pt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => switchNetwork(31337)}
                    className="px-3 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs text-center"
                  >
                    Switch Network
                  </button>
                  <button
                    onClick={disconnectWallet}
                    className="px-3 py-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 font-bold text-xs text-center"
                  >
                    Disconnect Wallet
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 13. DEVELOPMENT PREFERENCES */}
          {activeCategory === 'development' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                📈 Development & Trend Alerts
              </h3>

              <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">🔥 Trending Interest Alerts</div>
                  <div className="text-[10px] text-slate-400">Alert me when a topic related to my interests starts trending.</div>
                </div>
                <button onClick={() => updateSettings({ trendAlerts: !settings.trendAlerts })}>
                  {settings.trendAlerts ? <ToggleRight className="w-7 h-7 text-[#00B7FF]" /> : <ToggleLeft className="w-7 h-7 text-slate-400" />}
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">AI Content Suggestions</div>
                  <div className="text-[10px] text-slate-400">Auto-suggest captions, hashtags and best posting time.</div>
                </div>
                <button onClick={() => updateSettings({ aiSuggestions: !settings.aiSuggestions })}>
                  {settings.aiSuggestions ? <ToggleRight className="w-7 h-7 text-[#00B7FF]" /> : <ToggleLeft className="w-7 h-7 text-slate-400" />}
                </button>
              </div>
            </div>
          )}

          {/* 15. ABOUT */}
          {activeCategory === 'about' && (
            <div className="space-y-3 text-center py-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#00B7FF] to-[#36C4FF] mx-auto flex items-center justify-center text-white font-extrabold text-xl">
                a
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Aura Web3 Social</h3>
              <p className="text-xs text-slate-400 font-mono">App Version v1.2.0 (Build 2026.08)</p>
              <div className="pt-4 flex justify-center gap-4 text-xs font-bold text-[#00B7FF]">
                <span>Terms of Service</span>
                <span>Privacy Policy</span>
                <span>Open Source</span>
              </div>
            </div>
          )}

        </div>
      )}

      {/* MODALS & CONFIRMATION DIALOGS */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 p-6 text-center space-y-4">
            <LogOut className="w-10 h-10 text-rose-500 mx-auto" />
            <h4 className="text-base font-extrabold text-slate-900 dark:text-white">Log out of your account?</h4>
            <p className="text-xs text-slate-400">You can always log back in anytime by connecting your wallet.</p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  disconnectWallet();
                  setShowLogoutConfirm(false);
                  router.push('/feed');
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white font-extrabold text-xs"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
