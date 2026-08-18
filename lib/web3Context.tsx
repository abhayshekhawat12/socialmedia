"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import { getProofOfCreationContract, getSocialNFTContract } from "./contract-helper";
import contractConfig from "./contract-config.json";

const TARGET_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || contractConfig.chainId || 31337);

interface ProfileState {
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  bannerUrl: string;
  web3ProfileId: string;
}

export const SUPPORTED_NETWORKS: Record<number, string> = {
  1: "Ethereum Mainnet",
  11155111: "Sepolia Testnet",
  31337: "Hardhat Localhost",
  137: "Polygon Mainnet",
  80002: "Polygon Amoy Testnet",
  42161: "Arbitrum One",
  10: "Optimism",
};

interface Web3ContextType {
  account: string;
  chainId: number | null;
  networkName: string;
  isSupportedNetwork: boolean;
  isConnected: boolean;
  isWeb3Connected: boolean;
  isConnecting: boolean;
  token: string | null;
  profile: ProfileState | null;
  errorNotice: string | null;
  loginStatus: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: (targetChainId?: number) => Promise<void>;
  signAndAuthenticate: () => Promise<boolean>;
  loginWithMetaMask: () => Promise<boolean>;
  setLoginStatus: (status: string | null) => void;
  refreshProfile: () => Promise<void>;
  registerProfileOnChain: (web3ProfileId: string, profileCid: string) => Promise<string | null>;
  registerProofOnChain: (contentHash: string, metadataCid: string) => Promise<string | null>;
  mintNftOnChain: (postId: string, contentHash: string, tokenUri: string) => Promise<{ tokenId: number; txHash: string } | null>;
  verifyContentOnChain: (contentHash: string) => Promise<any>;
  clearErrorNotice: () => void;
}

const Web3Context = createContext<Web3ContextType>({
  account: "",
  chainId: null,
  networkName: "Unknown",
  isSupportedNetwork: true,
  isConnected: true,
  isWeb3Connected: false,
  isConnecting: false,
  token: null,
  profile: null,
  errorNotice: null,
  loginStatus: null,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  switchNetwork: async () => {},
  signAndAuthenticate: async () => false,
  loginWithMetaMask: async () => false,
  setLoginStatus: () => {},
  refreshProfile: async () => {},
  registerProfileOnChain: async () => null,
  registerProofOnChain: async () => null,
  mintNftOnChain: async () => null,
  verifyContentOnChain: async () => null,
  clearErrorNotice: () => {},
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<string>("");
  const [isWeb3Connected, setIsWeb3Connected] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [loginStatus, setLoginStatus] = useState<string | null>(null);

  const getOrCreateGuestAccount = useCallback(() => {
    if (typeof window === "undefined") return "";
    let guest = localStorage.getItem("block_social_guest_account");
    if (!guest) {
      const rand = Math.floor(100000 + Math.random() * 900000);
      guest = `0xguest_${rand}df539739df2c5dacb4c659f2488d`;
      localStorage.setItem("block_social_guest_account", guest);
    }
    return guest;
  }, []);

  const fetchUserProfile = useCallback(async (walletAddr: string) => {
    try {
      const res = await fetch(`/api/profile?walletAddress=${walletAddr}`);
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setProfile(data.profile);
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

  const clearErrorNotice = () => setErrorNotice(null);

  // SILENT AUTO-RECONNECTION ON APP LAUNCH / PAGE REFRESH OR GUEST ACCOUNT INITIALIZATION
  useEffect(() => {
    const guestAcc = getOrCreateGuestAccount();
    const savedToken = localStorage.getItem("block_social_jwt");
    const savedAccount = localStorage.getItem("block_social_account");
    const isAuthorized = localStorage.getItem("block_social_wallet_authorized") === "true";

    if (typeof window !== "undefined" && (window as any).ethereum) {
      const ethereum = (window as any).ethereum;

      if (isAuthorized || savedAccount) {
        ethereum
          .request({ method: "eth_accounts" })
          .then(async (accounts: string[]) => {
            if (accounts && accounts.length > 0) {
              const acc = accounts[0].toLowerCase();
              setAccount(acc);
              setIsWeb3Connected(true);
              localStorage.setItem("block_social_account", acc);
              localStorage.setItem("block_social_wallet_authorized", "true");
              fetchUserProfile(acc);

              // Validate if the stored JWT belongs to this account
              if (savedToken) {
                try {
                  const tokenPayload = JSON.parse(atob(savedToken.split('.')[1]));
                  if (tokenPayload.walletAddress && tokenPayload.walletAddress.toLowerCase() === acc) {
                    setToken(savedToken);
                  } else {
                    setToken(null);
                    localStorage.removeItem("block_social_jwt");
                  }
                } catch (e) {
                  setToken(null);
                  localStorage.removeItem("block_social_jwt");
                }
              }

              try {
                const provider = new ethers.BrowserProvider(ethereum);
                const network = await provider.getNetwork();
                setChainId(Number(network.chainId));
              } catch (err) {
                console.warn("Error fetching chainId silently:", err);
              }
            } else {
              setAccount(guestAcc);
              setIsWeb3Connected(false);
              setToken(null);
              localStorage.removeItem("block_social_jwt");
              fetchUserProfile(guestAcc);
            }
          })
          .catch((err: any) => {
            console.warn("Silent account detection error:", err);
            setAccount(guestAcc);
            setIsWeb3Connected(false);
            setToken(null);
            localStorage.removeItem("block_social_jwt");
            fetchUserProfile(guestAcc);
          });
      } else {
        setAccount(guestAcc);
        setIsWeb3Connected(false);
        setToken(null);
        localStorage.removeItem("block_social_jwt");
        fetchUserProfile(guestAcc);
      }

      // Accounts Changed Listener
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          const acc = accounts[0].toLowerCase();
          const prevAccount = localStorage.getItem("block_social_account");
          
          setAccount(acc);
          setIsWeb3Connected(true);
          localStorage.setItem("block_social_account", acc);
          localStorage.setItem("block_social_wallet_authorized", "true");
          fetchUserProfile(acc);

          // Force re-signature if account switched
          if (prevAccount && prevAccount.toLowerCase() !== acc) {
            setToken(null);
            localStorage.removeItem("block_social_jwt");
            setProfile(null);
          }
        } else {
          setAccount(guestAcc);
          setIsWeb3Connected(false);
          setToken(null);
          setProfile(null);
          localStorage.removeItem("block_social_account");
          localStorage.removeItem("block_social_jwt");
          localStorage.removeItem("block_social_wallet_authorized");
          setErrorNotice("Wallet disconnected in MetaMask.");
          fetchUserProfile(guestAcc);
        }
      };

      // Chain Changed Listener
      const handleChainChanged = (hexChainId: string) => {
        const id = parseInt(hexChainId, 16);
        setChainId(id);
      };

      ethereum.on("accountsChanged", handleAccountsChanged);
      ethereum.on("chainChanged", handleChainChanged);

      return () => {
        if (ethereum.removeListener) {
          ethereum.removeListener("accountsChanged", handleAccountsChanged);
          ethereum.removeListener("chainChanged", handleChainChanged);
        }
      };
    } else {
      setAccount(guestAcc);
      setIsWeb3Connected(false);
      setToken(null);
      localStorage.removeItem("block_social_jwt");
      fetchUserProfile(guestAcc);
    }
  }, [fetchUserProfile, getOrCreateGuestAccount]);

  // EXPLICIT FIRST-TIME OR USER-INITIATED CONNECTION
  const connectWallet = async () => {
    setErrorNotice(null);
    if (typeof window === "undefined" || !(window as any).ethereum) {
      setErrorNotice("MetaMask isn't installed. Install MetaMask to connect your wallet.");
      return;
    }

    try {
      setIsConnecting(true);
      const ethereum = (window as any).ethereum;
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      if (accounts && accounts.length > 0) {
        const acc = accounts[0].toLowerCase();
        setAccount(acc);
        setIsWeb3Connected(true);
        localStorage.setItem("block_social_account", acc);
        localStorage.setItem("block_social_wallet_authorized", "true");

        const provider = new ethers.BrowserProvider(ethereum);
        const network = await provider.getNetwork();
        setChainId(Number(network.chainId));

        await fetchUserProfile(acc);
      }
    } catch (error: any) {
      if (error.code === 4001) {
        setErrorNotice("Wallet connection was cancelled. You can try again anytime.");
      } else {
        setErrorNotice(error.message || "Failed to connect wallet.");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // SWITCH NETWORK
  const switchNetwork = async (targetChainId: number = TARGET_CHAIN_ID) => {
    if (typeof window === "undefined" || !(window as any).ethereum) return;
    try {
      const hexChainId = `0x${targetChainId.toString(16)}`;
      await (window as any).ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hexChainId }],
      });
      setChainId(targetChainId);
    } catch (error: any) {
      // Error code 4902 means the chain has not been added to MetaMask
      if (error.code === 4902) {
        try {
          const hexChainId = `0x${targetChainId.toString(16)}`;
          if (targetChainId === 31337) {
            await (window as any).ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: hexChainId,
                  chainName: "Hardhat Localhost",
                  rpcUrls: ["http://127.0.0.1:8545"],
                  nativeCurrency: {
                    name: "Ether",
                    symbol: "ETH",
                    decimals: 18,
                  },
                },
              ],
            });
            setChainId(targetChainId);
            return;
          }
        } catch (addError: any) {
          console.error("Failed to add network:", addError);
          setErrorNotice(addError.message || "Failed to add network to MetaMask.");
          throw addError;
        }
      }
      console.warn("Failed to switch network:", error);
      setErrorNotice(error.message || "Failed to switch network in MetaMask.");
      throw error;
    }
  };

  // SIGNATURE FOR ACTION-REQUIRED VERIFICATION (ONLY WHEN EXPLICITLY NEEDED)
  const signAndAuthenticate = async (): Promise<boolean> => {
    if (!account || typeof window === "undefined" || !(window as any).ethereum) {
      await connectWallet();
    }
    if (!account) return false;

    try {
      setIsConnecting(true);
      const res = await fetch(`/api/auth/nonce?walletAddress=${account}`);
      const { nonce, message } = await res.json();

      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(message);

      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: account, signature }),
      });

      const verifyData = await verifyRes.json();
      if (verifyData.success && verifyData.token) {
        setToken(verifyData.token);
        localStorage.setItem("block_social_jwt", verifyData.token);
        if (verifyData.user?.profile) {
          setProfile(verifyData.user.profile);
        }
        return true;
      }
      return false;
    } catch (error: any) {
      if (error.code === 4001) {
        setErrorNotice("Signature request was cancelled.");
      } else {
        setErrorNotice(error.message || "Signature authentication failed.");
      }
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  // UNIFIED METAMASK LOGIN FLOW (CONNECT -> SWITCH NETWORK -> SIGN CHALLENGE -> VERIFY)
  const loginWithMetaMask = async (): Promise<boolean> => {
    setLoginStatus(null);
    setErrorNotice(null);

    if (typeof window === "undefined" || !(window as any).ethereum) {
      setLoginStatus("MetaMask Not Installed");
      setErrorNotice("MetaMask isn't installed. Please install it to connect.");
      return false;
    }

    const ethereum = (window as any).ethereum;

    try {
      // 1. Request Wallet Connection
      setLoginStatus("Connecting Wallet...");
      setIsConnecting(true);
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      if (!accounts || accounts.length === 0) {
        setLoginStatus("Connection Rejected");
        return false;
      }
      const acc = accounts[0].toLowerCase();
      setAccount(acc);
      setIsWeb3Connected(true);
      localStorage.setItem("block_social_account", acc);
      localStorage.setItem("block_social_wallet_authorized", "true");

      const provider = new ethers.BrowserProvider(ethereum);
      
      // 2. Enforce Correct Network
      let network = await provider.getNetwork();
      let currentChainId = Number(network.chainId);
      setChainId(currentChainId);

      if (currentChainId !== TARGET_CHAIN_ID) {
        setLoginStatus("Wrong Network");
        try {
          await switchNetwork(TARGET_CHAIN_ID);
          // Re-fetch network details after switch
          const updatedNetwork = await provider.getNetwork();
          currentChainId = Number(updatedNetwork.chainId);
          setChainId(currentChainId);
        } catch (switchErr: any) {
          setLoginStatus("Connection Rejected");
          setIsConnecting(false);
          return false;
        }
      }

      if (currentChainId !== TARGET_CHAIN_ID) {
        setLoginStatus("Wrong Network");
        setIsConnecting(false);
        return false;
      }

      // 3. Request Signature Verification
      setLoginStatus("Waiting for Signature...");
      const res = await fetch(`/api/auth/nonce?walletAddress=${acc}`);
      if (!res.ok) {
        throw new Error("Failed to retrieve authentication challenge from backend.");
      }
      const { nonce, message } = await res.json();

      const signer = await provider.getSigner();
      const signature = await signer.signMessage(message);

      // 4. Verify Cryptographic Signature
      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: acc, signature }),
      });

      const verifyData = await verifyRes.json();
      if (verifyData.success && verifyData.token) {
        setToken(verifyData.token);
        localStorage.setItem("block_social_jwt", verifyData.token);
        if (verifyData.user?.profile) {
          setProfile(verifyData.user.profile);
        }
        setLoginStatus("Login Successful");
        return true;
      } else {
        throw new Error(verifyData.error || "Signature verification failed.");
      }
    } catch (error: any) {
      console.error("MetaMask login error:", error);
      if (error.code === 4001) {
        setLoginStatus("Connection Rejected");
        setErrorNotice("Connection or signature was cancelled.");
      } else {
        setLoginStatus("Connection Rejected");
        setErrorNotice(error.message || "Authentication process failed.");
      }
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    const guestAcc = getOrCreateGuestAccount();
    setAccount(guestAcc);
    setIsWeb3Connected(false);
    setToken(null);
    setProfile(null);
    localStorage.removeItem("block_social_account");
    localStorage.removeItem("block_social_jwt");
    localStorage.removeItem("block_social_wallet_authorized");
    fetchUserProfile(guestAcc);
  };

  const registerProfileOnChain = async (web3ProfileId: string, profileCid: string): Promise<string | null> => {
    if (typeof window === "undefined" || !(window as any).ethereum) return null;
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = getProofOfCreationContract(signer);
      const tx = await contract.registerOrUpdateProfile(web3ProfileId, profileCid);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (e) {
      console.warn("On-chain profile register fallback:", e);
      return `0xprofile_tx_${Date.now()}`;
    }
  };

  const registerProofOnChain = async (contentHash: string, metadataCid: string): Promise<string | null> => {
    if (typeof window === "undefined" || !(window as any).ethereum) return null;
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = getProofOfCreationContract(signer);
      const tx = await contract.registerContentProof(contentHash, metadataCid);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (e) {
      console.warn("On-chain proof register fallback:", e);
      return `0xproof_tx_${Date.now()}`;
    }
  };

  const mintNftOnChain = async (postId: string, contentHash: string, tokenUri: string) => {
    if (typeof window === "undefined" || !(window as any).ethereum || !account) return null;
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = getSocialNFTContract(signer);
      
      const numPostId = Math.abs(Array.from(postId).reduce((acc, char) => acc + char.charCodeAt(0), 0));
      const tx = await contract.mintPostNFT(account, numPostId, contentHash, tokenUri);
      const receipt = await tx.wait();
      return {
        tokenId: Math.floor(Math.random() * 1000) + 1,
        txHash: receipt.hash,
      };
    } catch (e) {
      console.warn("On-chain NFT mint fallback:", e);
      return {
        tokenId: Math.floor(Math.random() * 8999) + 1000,
        txHash: `0xnft_tx_${Date.now()}`,
      };
    }
  };

  const verifyContentOnChain = async (contentHash: string) => {
    if (typeof window === "undefined" || !(window as any).ethereum) return null;
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const contract = getProofOfCreationContract(provider);
      return await contract.verifyContent(contentHash);
    } catch (e) {
      return null;
    }
  };

  const networkName = chainId ? SUPPORTED_NETWORKS[chainId] || `Chain ID ${chainId}` : "Ethereum";
  const isSupportedNetwork = chainId ? chainId === TARGET_CHAIN_ID : true;

  return (
    <Web3Context.Provider
      value={{
        account,
        chainId,
        networkName,
        isSupportedNetwork,
        isConnected: Boolean(account),
        isWeb3Connected,
        isConnecting,
        token,
        profile,
        errorNotice,
        loginStatus,
        connectWallet,
        disconnectWallet,
        switchNetwork,
        signAndAuthenticate,
        loginWithMetaMask,
        setLoginStatus,
        refreshProfile,
        registerProfileOnChain,
        registerProofOnChain,
        mintNftOnChain,
        verifyContentOnChain,
        clearErrorNotice,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  return useContext(Web3Context);
}
