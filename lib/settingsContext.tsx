"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useWeb3 } from "./web3Context";

export interface UserSettingsState {
  privateAccount: boolean;
  whoCanFollow: string;
  whoCanMessage: string;
  whoCanMention: string;
  whoCanTag: string;
  storyPrivacy: string;
  closeFriends: string;
  activityStatus: boolean;
  readReceipts: boolean;
  allowDownloads: boolean;
  allowRemix: boolean;
  twoFactorEnabled: boolean;
  muteAllNotifications: boolean;
  muteDuration: string;
  notificationLikes: boolean;
  notificationComments: boolean;
  notificationFollows: boolean;
  notificationMessages: boolean;
  notificationMentions: boolean;
  notificationTags: boolean;
  notificationPulse: boolean;
  notificationLive: boolean;
  notificationDevelopment: boolean;
  notificationCreator: boolean;
  notificationSecurity: boolean;
  notificationPush: boolean;
  sensitiveContent: string;
  hiddenWords: string;
  contentLanguage: string;
  autoplay: boolean;
  videoQuality: string;
  creatorModeEnabled: boolean;
  theme: "dark" | "light" | "system";
  reducedMotion: boolean;
  dataSaver: boolean;
  trendingNotifications: boolean;
  aiSuggestions: boolean;
  trendAlerts: boolean;
  opportunityAlerts: boolean;
  bestPostingTimeAlerts: boolean;
}

export interface BlockedAccountState {
  id: string;
  blockerAddress: string;
  blockedAddress: string;
  type: "block" | "restrict" | "mute";
}

export interface SessionState {
  id: string;
  deviceName: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

interface SettingsContextType {
  settings: UserSettingsState;
  blockedAccounts: BlockedAccountState[];
  sessions: SessionState[];
  updateSettings: (newSettings: Partial<UserSettingsState>) => Promise<void>;
  blockUser: (targetAddress: string, type?: "block" | "restrict" | "mute") => Promise<void>;
  unblockUser: (targetAddress: string, type?: "block" | "restrict" | "mute") => Promise<void>;
  clearCache: () => void;
  cacheSizeMB: number;
}

const defaultSettings: UserSettingsState = {
  privateAccount: false,
  whoCanFollow: "everyone",
  whoCanMessage: "everyone",
  whoCanMention: "everyone",
  whoCanTag: "everyone",
  storyPrivacy: "everyone",
  closeFriends: "",
  activityStatus: true,
  readReceipts: true,
  allowDownloads: true,
  allowRemix: true,
  twoFactorEnabled: false,
  muteAllNotifications: false,
  muteDuration: "off",
  notificationLikes: true,
  notificationComments: true,
  notificationFollows: true,
  notificationMessages: true,
  notificationMentions: true,
  notificationTags: true,
  notificationPulse: true,
  notificationLive: true,
  notificationDevelopment: true,
  notificationCreator: true,
  notificationSecurity: true,
  notificationPush: true,
  sensitiveContent: "standard",
  hiddenWords: "",
  contentLanguage: "English",
  autoplay: true,
  videoQuality: "auto",
  creatorModeEnabled: false,
  theme: "dark",
  reducedMotion: false,
  dataSaver: false,
  trendingNotifications: true,
  aiSuggestions: true,
  trendAlerts: true,
  opportunityAlerts: true,
  bestPostingTimeAlerts: true,
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  blockedAccounts: [],
  sessions: [],
  updateSettings: async () => {},
  blockUser: async () => {},
  unblockUser: async () => {},
  clearCache: () => {},
  cacheSizeMB: 1240,
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { account } = useWeb3();
  const [settings, setSettings] = useState<UserSettingsState>(defaultSettings);
  const [blockedAccounts, setBlockedAccounts] = useState<BlockedAccountState[]>([]);
  const [sessions, setSessions] = useState<SessionState[]>([]);
  const [cacheSizeMB, setCacheSizeMB] = useState(1240);

  const fetchSettings = useCallback(async () => {
    if (!account) return;
    try {
      const res = await fetch(`/api/settings?walletAddress=${account}`);
      if (res.ok) {
        const data = await res.json();
        if (data.settings) setSettings(data.settings);
        if (data.blockedAccounts) setBlockedAccounts(data.blockedAccounts);
        if (data.sessions) setSessions(data.sessions);
      }
    } catch (e) {
      console.error("Failed to fetch settings:", e);
    }
  }, [account]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (newSettings: Partial<UserSettingsState>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);

    if (account) {
      try {
        await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: account,
            ...newSettings,
          }),
        });
      } catch (e) {
        console.error("Failed to save settings to server:", e);
      }
    }
  };

  const blockUser = async (targetAddress: string, type: "block" | "restrict" | "mute" = "block") => {
    if (!account) return;
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: account,
          action: "block",
          targetAddress,
          blockType: type,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.blockedAccounts) setBlockedAccounts(data.blockedAccounts);
      }
    } catch (e) {
      console.error("Failed to block user:", e);
    }
  };

  const unblockUser = async (targetAddress: string, type: "block" | "restrict" | "mute" = "block") => {
    if (!account) return;
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: account,
          action: "unblock",
          targetAddress,
          blockType: type,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.blockedAccounts) setBlockedAccounts(data.blockedAccounts);
      }
    } catch (e) {
      console.error("Failed to unblock user:", e);
    }
  };

  const clearCache = () => {
    setCacheSizeMB(0);
    localStorage.removeItem("block_social_temp_cache");
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        blockedAccounts,
        sessions,
        updateSettings,
        blockUser,
        unblockUser,
        clearCache,
        cacheSizeMB,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
