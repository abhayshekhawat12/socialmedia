"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface ProfileState {
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  bannerUrl: string;
}

export interface UserState {
  id: string;
  email?: string | null;
  mobileNumber?: string | null;
  walletAddress?: string | null;
  profile?: ProfileState | null;
}

export interface AuthContextType {
  account: string;
  user: UserState | null;
  profile: ProfileState | null;
  token: string | null;
  isLoggedIn: boolean;
  isConnecting: boolean;
  loginStatus: string | null;
  errorNotice: string | null;
  isWeb3Connected: boolean; // Compatibility alias
  isConnected: boolean; // Compatibility alias
  chainId: number | null; // Compatibility alias
  networkName: string; // Compatibility alias
  isSupportedNetwork: boolean; // Compatibility alias
  isVirtualSession: boolean; // Compatibility alias
  connectWallet: () => Promise<void>; // Compatibility alias
  disconnectWallet: () => void; // Logout alias
  switchNetwork: (targetChainId?: number) => Promise<void>; // Compatibility alias
  signAndAuthenticate: () => Promise<boolean>; // Compatibility alias
  loginWithMetaMask: () => Promise<boolean>; // Compatibility alias
  linkMetaMaskWallet: () => Promise<boolean>; // Compatibility alias
  registerProfileOnChain: (id: string, cid: string) => Promise<string | null>; // Compatibility alias
  registerProofOnChain: (postId: string, hash: string, cid: string) => Promise<string | null>; // Compatibility alias
  mintNftOnChain: (postId: string, hash: string, uri: string) => Promise<any>; // Compatibility alias
  verifyContentOnChain: (hash: string) => Promise<any>; // Compatibility alias
  logout: () => void;
  setLoginStatus: (status: string | null) => void;
  clearErrorNotice: () => void;
  refreshProfile: () => Promise<void>;
  updateProfileState: (updated: Partial<ProfileState>) => void;
}

const AuthContext = createContext<AuthContextType>({
  account: "",
  user: null,
  profile: null,
  token: null,
  isLoggedIn: false,
  isConnecting: false,
  loginStatus: null,
  errorNotice: null,
  isWeb3Connected: false,
  isConnected: false,
  chainId: null,
  networkName: "Standard",
  isSupportedNetwork: true,
  isVirtualSession: false,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  switchNetwork: async () => {},
  signAndAuthenticate: async () => false,
  loginWithMetaMask: async () => false,
  linkMetaMaskWallet: async () => false,
  registerProfileOnChain: async () => null,
  registerProofOnChain: async () => null,
  mintNftOnChain: async () => null,
  verifyContentOnChain: async () => null,
  logout: () => {},
  setLoginStatus: () => {},
  clearErrorNotice: () => {},
  refreshProfile: async () => {},
  updateProfileState: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("block_social_account") || "";
    }
    return "";
  });
  const [user, setUser] = useState<UserState | null>(null);
  const [profile, setProfile] = useState<ProfileState | null>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("block_social_cached_profile");
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {}
      }
    }
    return null;
  });
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("block_social_jwt") || null;
    }
    return null;
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [loginStatus, setLoginStatus] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const clearErrorNotice = () => setErrorNotice(null);

  const fetchUserProfile = useCallback(async (identifier: string) => {
    try {
      const res = await fetch(`/api/profile?walletAddress=${encodeURIComponent(identifier)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          const profileData: ProfileState = {
            username: data.profile.username || "",
            displayName: data.profile.displayName || "",
            bio: data.profile.bio || "",
            avatarUrl: data.profile.avatarUrl || "",
            bannerUrl: data.profile.bannerUrl || "",
          };
          setProfile(profileData);
          try {
            localStorage.setItem("block_social_cached_profile", JSON.stringify(profileData));
          } catch {}
        }
        if (data.user) {
          setUser(data.user);
        }
      }
    } catch (e) {
      console.error("Failed to fetch user profile:", e);
    }
  }, []);

  const refreshProfile = async () => {
    if (account) {
      await fetchUserProfile(account);
    }
  };

  const updateProfileState = (updated: Partial<ProfileState>) => {
    setProfile((prev) => {
      const merged = prev ? { ...prev, ...updated } : (updated as ProfileState);
      try {
        localStorage.setItem("block_social_cached_profile", JSON.stringify(merged));
      } catch {}
      return merged;
    });
  };

  const logout = () => {
    localStorage.removeItem("block_social_jwt");
    localStorage.removeItem("block_social_account");
    localStorage.removeItem("block_social_wallet_authorized");
    localStorage.removeItem("block_social_cached_profile");
    setToken(null);
    setAccount("");
    setUser(null);
    setProfile(null);
    setLoginStatus(null);
    window.location.href = "/login";
  };

  // Restore session & cached profile from localStorage on app launch
  useEffect(() => {
    const savedToken = localStorage.getItem("block_social_jwt");
    const savedAccount = localStorage.getItem("block_social_account");
    const cachedProfile = localStorage.getItem("block_social_cached_profile");

    if (cachedProfile) {
      try {
        setProfile(JSON.parse(cachedProfile));
      } catch {}
    }

    if (savedToken && savedAccount) {
      setToken(savedToken);
      setAccount(savedAccount);
      fetchUserProfile(savedAccount);
    }
  }, [fetchUserProfile]);

  const value: AuthContextType = {
    account,
    user,
    profile,
    token,
    isLoggedIn: Boolean(token && account),
    isConnecting,
    loginStatus,
    errorNotice,
    isWeb3Connected: false,
    isConnected: Boolean(token && account),
    chainId: 1,
    networkName: "Aura Social Network",
    isSupportedNetwork: true,
    isVirtualSession: false,
    connectWallet: async () => {
      window.location.href = "/login";
    },
    disconnectWallet: logout,
    switchNetwork: async () => {},
    signAndAuthenticate: async () => true,
    loginWithMetaMask: async () => false,
    linkMetaMaskWallet: async () => false,
    registerProfileOnChain: async () => null,
    registerProofOnChain: async () => null,
    mintNftOnChain: async () => null,
    verifyContentOnChain: async () => null,
    logout,
    setLoginStatus,
    clearErrorNotice,
    refreshProfile,
    updateProfileState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

// Compatibility exports
export const Web3Provider = AuthProvider;
export const useWeb3 = useAuth;
