"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase";

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
  logout: () => Promise<void>;
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
  logout: async () => {},
  setLoginStatus: () => {},
  clearErrorNotice: () => {},
  refreshProfile: async () => {},
  updateProfileState: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<string>("");
  const [user, setUser] = useState<UserState | null>(null);
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [loginStatus, setLoginStatus] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const clearErrorNotice = () => setErrorNotice(null);

  // Initialize from cache for 0ms refresh experience
  useEffect(() => {
    try {
      const cachedAccount = localStorage.getItem("pulse_cached_account");
      const cachedProfile = localStorage.getItem("pulse_cached_profile");
      const cachedUser = localStorage.getItem("pulse_cached_user");
      if (cachedAccount) setAccount(cachedAccount);
      if (cachedProfile) setProfile(JSON.parse(cachedProfile));
      if (cachedUser) setUser(JSON.parse(cachedUser));
    } catch {}
  }, []);

  const fetchUserProfile = useCallback(async (identifier: string, userMeta?: any) => {
    if (!identifier) return;
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
          try { localStorage.setItem("pulse_cached_profile", JSON.stringify(profileData)); } catch {}
        }
        if (data.user) {
          setUser(data.user);
          // Permanent App User ID is the primary identity
          const resolvedAccount = data.user.id || identifier;
          setAccount(resolvedAccount);
          try {
            localStorage.setItem("pulse_cached_user", JSON.stringify(data.user));
            localStorage.setItem("pulse_cached_account", resolvedAccount);
          } catch {}
        }
      } else if (res.status === 404 && userMeta) {
        // Auto-provision profile if newly authenticated user is missing DB record
        try {
          const createRes = await fetch("/api/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              supabaseId: userMeta.id || identifier,
              email: userMeta.email || (identifier.includes("@") ? identifier : undefined),
              name: userMeta.user_metadata?.full_name || userMeta.user_metadata?.name || userMeta.email?.split("@")[0] || "Pulse Member",
              picture: userMeta.user_metadata?.avatar_url || userMeta.user_metadata?.picture || "",
              googleId: userMeta.id || identifier,
            }),
          });
          if (createRes.ok) {
            const createData = await createRes.json();
            if (createData.user) {
              setUser(createData.user);
              setAccount(createData.user.id);
              setProfile(createData.user.profile);
              try {
                localStorage.setItem("pulse_cached_user", JSON.stringify(createData.user));
                localStorage.setItem("pulse_cached_profile", JSON.stringify(createData.user.profile));
                localStorage.setItem("pulse_cached_account", createData.user.id);
              } catch {}
            }
          }
        } catch (provErr) {
          console.warn("Auto-provision profile fallback error:", provErr);
        }
      }
    } catch (e) {
      console.error("Failed to fetch user profile from Supabase:", e);
    }
  }, []);

  const refreshProfile = async () => {
    if (account) {
      await fetchUserProfile(account);
    }
  };

  const updateProfileState = (updated: Partial<ProfileState>) => {
    setProfile((prev) => {
      const next = prev ? { ...prev, ...updated } : (updated as ProfileState);
      try { localStorage.setItem("pulse_cached_profile", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      document.cookie = "block_social_jwt=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;";
      localStorage.removeItem("pulse_cached_account");
      localStorage.removeItem("pulse_cached_profile");
      localStorage.removeItem("pulse_cached_user");
    } catch (err) {
      console.warn("Sign out error:", err);
    }
    setToken(null);
    setAccount("");
    setUser(null);
    setProfile(null);
    setLoginStatus(null);
    window.location.href = "/login";
  };

  // Synchronize session directly from Supabase Auth
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        setIsConnecting(true);

        // Fetch session with 800ms safety timeout to prevent hanging on slow network
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<any>((resolve) =>
          setTimeout(() => resolve({ data: { session: null }, error: "timeout" }), 800)
        );

        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);

        if (session && session.user) {
          const userIdentifier = session.user.email || session.user.id;
          if (mounted) {
            setToken(session.access_token);
            setAccount(userIdentifier);
            document.cookie = `block_social_jwt=${session.access_token}; path=/; max-age=2592000; SameSite=Lax; ${window.location.protocol === "https:" ? "Secure" : ""}`;
            await fetchUserProfile(userIdentifier, session.user);
          }
        } else {
          // Check if server session cookie exists
          const match = typeof document !== "undefined" ? document.cookie.match(/block_social_jwt=([^;]+)/) : null;
          if (match && match[1]) {
            const cookieToken = match[1];
            if (mounted) setToken(cookieToken);
            // Fetch current user via /api/profile/me
            const res = await fetch("/api/profile/me");
            if (res.ok) {
              const data = await res.json();
              if (data.user && mounted) {
                setUser(data.user);
                setAccount(data.user.id);
                setProfile(data.profile);
              }
            } else {
              // Clear bad cookie if expired
              document.cookie = "block_social_jwt=; path=/; max-age=0;";
            }
          }
        }
      } catch (err) {
        console.warn("Supabase session restore warning:", err);
      } finally {
        if (mounted) setIsConnecting(false);
      }
    }

    initSession();

    // Listen to real-time auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const userIdentifier = session.user.email || session.user.id;
        setToken(session.access_token);
        setAccount(userIdentifier);
        document.cookie = `block_social_jwt=${session.access_token}; path=/; max-age=2592000; SameSite=Lax; ${window.location.protocol === "https:" ? "Secure" : ""}`;
        await fetchUserProfile(userIdentifier, session.user);
      } else {
        setToken(null);
        setAccount("");
        setUser(null);
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const value: AuthContextType = {
    account,
    user,
    profile,
    token,
    isLoggedIn: Boolean(token || account),
    isConnecting,
    loginStatus,
    errorNotice,
    isWeb3Connected: false,
    isConnected: Boolean(token || account),
    chainId: 1,
    networkName: "Pulse Social Network",
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
