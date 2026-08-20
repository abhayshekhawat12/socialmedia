"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "../authContext";

export type WalletConnectionState =
  | "DISCONNECTED"
  | "CONNECTING"
  | "CONNECTED"
  | "WRONG_NETWORK"
  | "REJECTED"
  | "ERROR";

export interface SupportedNetwork {
  chainId: number;
  hexChainId: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
}

// Resilient tier-1 public Sepolia RPC endpoints with CORS & HTTPS support
export const SEPOLIA_RPC_ENDPOINTS: string[] = [
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL,
  "https://gateway.tenderly.co/public/sepolia",
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://1rpc.io/sepolia",
].filter(Boolean) as string[];

export const SEPOLIA_TESTNET: SupportedNetwork = {
  chainId: 11155111,
  hexChainId: "0xaa36a7",
  chainName: "Ethereum Sepolia",
  nativeCurrency: {
    name: "Sepolia Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: SEPOLIA_RPC_ENDPOINTS,
  blockExplorerUrls: ["https://sepolia.etherscan.io"],
};

export const SUPPORTED_NETWORKS: Record<number, SupportedNetwork> = {
  11155111: SEPOLIA_TESTNET,
};

export interface RpcQueryResult<T = any> {
  success: boolean;
  result?: T;
  error?: string;
  rpcUrl?: string;
  latencyMs?: number;
}

/**
 * Resilient JSON-RPC query executor.
 * Iterates through reliable Sepolia RPC endpoints with timeouts and automatic failover.
 */
export async function querySepoliaRpc<T = any>(
  method: string,
  params: any[] = []
): Promise<RpcQueryResult<T>> {
  let lastError = "Unable to connect to blockchain host.";

  for (const rpcUrl of SEPOLIA_RPC_ENDPOINTS) {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method,
          params,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        lastError = `RPC host ${rpcUrl} returned HTTP status ${response.status}`;
        continue;
      }

      const json = await response.json();
      const latencyMs = Date.now() - startTime;

      if (json.error) {
        lastError = json.error.message || `RPC host error from ${rpcUrl}`;
        continue;
      }

      if (json.result !== undefined) {
        return {
          success: true,
          result: json.result as T,
          rpcUrl,
          latencyMs,
        };
      }
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr.name === "AbortError") {
        lastError = `RPC host ${rpcUrl} timed out after 6000ms.`;
      } else {
        lastError = fetchErr.message || `Failed to connect to ${rpcUrl}`;
      }
    }
  }

  return {
    success: false,
    error: lastError,
  };
}

export interface Web3ContextType {
  walletAddress: string | null;
  shortAddress: string | null;
  chainId: number | null;
  networkName: string | null;
  walletState: WalletConnectionState;
  isMetaMaskInstalled: boolean;
  isWalletConnected: boolean;
  isSupportedNetwork: boolean;
  isRpcConnected: boolean;
  rpcLatencyMs: number | null;
  latestBlock: number | null;
  balance: string | null;
  errorMessage: string | null;
  rpcError: string | null;
  activeRpcUrl: string | null;
  pendingAccountChange: string | null;
  connectMetaMask: () => Promise<boolean>;
  disconnectMetaMask: () => Promise<void>;
  switchNetwork: (targetChainId?: number) => Promise<boolean>;
  confirmAccountSwitch: () => Promise<boolean>;
  cancelAccountSwitch: () => void;
  clearError: () => void;
  fetchBalance: (address?: string) => Promise<string | null>;
  testRpc: () => Promise<boolean>;
  sendTip: (recipientAddress: string, amountEth: string) => Promise<{ success: boolean; txHash?: string; error?: string }>;
  calculateSha256: (data: string | ArrayBuffer) => Promise<string>;
}

const Web3Context = createContext<Web3ContextType>({
  walletAddress: null,
  shortAddress: null,
  chainId: null,
  networkName: null,
  walletState: "DISCONNECTED",
  isMetaMaskInstalled: false,
  isWalletConnected: false,
  isSupportedNetwork: true,
  isRpcConnected: false,
  rpcLatencyMs: null,
  latestBlock: null,
  balance: null,
  errorMessage: null,
  rpcError: null,
  activeRpcUrl: null,
  pendingAccountChange: null,
  connectMetaMask: async () => false,
  disconnectMetaMask: async () => {},
  switchNetwork: async () => false,
  confirmAccountSwitch: async () => false,
  cancelAccountSwitch: () => {},
  clearError: () => {},
  fetchBalance: async () => null,
  testRpc: async () => false,
  sendTip: async () => ({ success: false, error: "Not initialized" }),
  calculateSha256: async () => "",
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const { user, refreshProfile } = useAuth();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [walletState, setWalletState] = useState<WalletConnectionState>("DISCONNECTED");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState<boolean>(false);
  const [pendingAccountChange, setPendingAccountChange] = useState<string | null>(null);

  // Read-only RPC provider state (separate from wallet state)
  const [isRpcConnected, setIsRpcConnected] = useState<boolean>(false);
  const [rpcLatencyMs, setRpcLatencyMs] = useState<number | null>(null);
  const [latestBlock, setLatestBlock] = useState<number | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [rpcError, setRpcError] = useState<string | null>(null);
  const [activeRpcUrl, setActiveRpcUrl] = useState<string | null>(null);

  const isConnectingRef = useRef(false);

  // Check window.ethereum availability safely in browser
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasEthereum = Boolean((window as any).ethereum);
      setIsMetaMaskInstalled(hasEthereum);
    }
  }, []);

  // Shortened address helper (e.g. 0xABCD...1234)
  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : null;

  const isSupportedNetwork = chainId ? Boolean(SUPPORTED_NETWORKS[chainId]) : true;
  const networkName = chainId
    ? SUPPORTED_NETWORKS[chainId]?.chainName || `Chain ID ${chainId}`
    : null;
  const isWalletConnected = walletState === "CONNECTED" && Boolean(walletAddress);

  // Test RPC connection & perform basic read-only blockchain call
  const testRpc = useCallback(async (): Promise<boolean> => {
    try {
      const result = await querySepoliaRpc<string>("eth_blockNumber", []);
      if (result.success && result.result) {
        const blockNum = parseInt(result.result, 16);
        setLatestBlock(blockNum);
        setIsRpcConnected(true);
        setRpcLatencyMs(result.latencyMs || null);
        setActiveRpcUrl(result.rpcUrl || null);
        setRpcError(null);
        return true;
      } else {
        setIsRpcConnected(false);
        setRpcError(result.error || "Unable to reach Sepolia RPC nodes.");
        return false;
      }
    } catch (e: any) {
      setIsRpcConnected(false);
      setRpcError(e.message || "Failed to execute RPC block query.");
      return false;
    }
  }, []);

  // Fetch ETH balance for connected address or target
  const fetchBalance = useCallback(
    async (targetAddr?: string): Promise<string | null> => {
      const addr = targetAddr || walletAddress;
      if (!addr || !addr.startsWith("0x")) return null;

      try {
        const result = await querySepoliaRpc<string>("eth_getBalance", [addr, "latest"]);
        if (result.success && result.result) {
          const wei = BigInt(result.result);
          // Convert Wei to ETH float with 4 decimals
          const ethVal = Number(wei) / 1e18;
          const formatted = ethVal.toFixed(4);
          setBalance(formatted);
          return formatted;
        }
      } catch (e) {
        console.warn("Failed to fetch balance via RPC:", e);
      }
      return null;
    },
    [walletAddress]
  );

  // Check existing wallet linked to current logged-in user
  useEffect(() => {
    if (user?.walletAddress && user.walletAddress.startsWith("0x")) {
      setWalletAddress(user.walletAddress);
      setWalletState("CONNECTED");
      // Trigger background read-only test & balance check
      testRpc();
      fetchBalance(user.walletAddress);
    } else if (!user) {
      setWalletAddress(null);
      setWalletState("DISCONNECTED");
    }
  }, [user, testRpc, fetchBalance]);

  // Read chainId and listen to MetaMask events
  useEffect(() => {
    if (typeof window === "undefined" || !(window as any).ethereum) return;
    const eth = (window as any).ethereum;

    const updateChain = (hexId: string) => {
      try {
        const id = parseInt(hexId, 16);
        setChainId(id);
        if (!SUPPORTED_NETWORKS[id] && walletAddress) {
          setWalletState("WRONG_NETWORK");
        } else if (walletAddress) {
          setWalletState("CONNECTED");
        }
      } catch (err) {
        console.warn("Error parsing chainId:", err);
      }
    };

    eth
      .request({ method: "eth_chainId" })
      .then(updateChain)
      .catch((e: any) => console.warn("Failed to get chainId:", e));

    const handleChainChanged = (hexId: string) => {
      updateChain(hexId);
      testRpc();
    };

    const handleAccountsChanged = (accounts: string[]) => {
      if (!accounts || accounts.length === 0) {
        // User disconnected wallet inside MetaMask
        setWalletAddress(null);
        setWalletState("DISCONNECTED");
        setPendingAccountChange(null);
        setBalance(null);
      } else {
        const newAccount = accounts[0].toLowerCase();
        if (walletAddress && walletAddress.toLowerCase() !== newAccount) {
          // Detect account switch: do NOT silently associate new address
          setPendingAccountChange(newAccount);
        }
      }
    };

    const handleDisconnect = () => {
      setWalletAddress(null);
      setWalletState("DISCONNECTED");
      setPendingAccountChange(null);
      setBalance(null);
    };

    eth.on?.("chainChanged", handleChainChanged);
    eth.on?.("accountsChanged", handleAccountsChanged);
    eth.on?.("disconnect", handleDisconnect);

    return () => {
      eth.removeListener?.("chainChanged", handleChainChanged);
      eth.removeListener?.("accountsChanged", handleAccountsChanged);
      eth.removeListener?.("disconnect", handleDisconnect);
    };
  }, [walletAddress, testRpc]);

  const clearError = useCallback(() => {
    setErrorMessage(null);
    if (walletState === "ERROR" || walletState === "REJECTED") {
      setWalletState(walletAddress ? "CONNECTED" : "DISCONNECTED");
    }
  }, [walletState, walletAddress]);

  // Switch to supported network
  const switchNetwork = useCallback(
    async (targetChainId: number = SEPOLIA_TESTNET.chainId): Promise<boolean> => {
      if (typeof window === "undefined" || !(window as any).ethereum) {
        setErrorMessage("MetaMask is not installed.");
        return false;
      }

      const target = SUPPORTED_NETWORKS[targetChainId] || SEPOLIA_TESTNET;
      const eth = (window as any).ethereum;

      try {
        await eth.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: target.hexChainId }],
        });
        setChainId(target.chainId);
        if (walletAddress) setWalletState("CONNECTED");
        testRpc();
        return true;
      } catch (switchError: any) {
        // 4902 error code means the chain has not been added to MetaMask
        if (switchError?.code === 4902 || switchError?.data?.originalError?.code === 4902) {
          try {
            await eth.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: target.hexChainId,
                  chainName: target.chainName,
                  nativeCurrency: target.nativeCurrency,
                  rpcUrls: target.rpcUrls,
                  blockExplorerUrls: target.blockExplorerUrls,
                },
              ],
            });
            setChainId(target.chainId);
            if (walletAddress) setWalletState("CONNECTED");
            testRpc();
            return true;
          } catch (addError: any) {
            console.error("Failed to add network:", addError);
            if (addError.code === 4001) {
              setErrorMessage("Adding Sepolia network was rejected in MetaMask.");
            } else {
              setErrorMessage(addError.message || "Failed to add Sepolia network to MetaMask.");
            }
            setWalletState("ERROR");
            return false;
          }
        }
        console.error("Failed to switch network:", switchError);
        if (switchError.code === 4001) {
          setErrorMessage("Network switch was rejected in MetaMask.");
        } else {
          setErrorMessage(switchError.message || "Failed to switch network.");
        }
        setWalletState("WRONG_NETWORK");
        return false;
      }
    },
    [walletAddress, testRpc]
  );

  // Connect MetaMask and associate wallet with currently authenticated user
  const connectMetaMask = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      setIsMetaMaskInstalled(false);
      setErrorMessage("MetaMask is not installed. Please install MetaMask to connect.");
      setWalletState("ERROR");
      return false;
    }

    if (isConnectingRef.current) return false;
    isConnectingRef.current = true;

    setWalletState("CONNECTING");
    setErrorMessage(null);

    const eth = (window as any).ethereum;

    try {
      // 1. Request account access from MetaMask injected provider
      const accounts: string[] = await eth.request({
        method: "eth_requestAccounts",
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found in MetaMask.");
      }

      const connectedAccount = accounts[0].toLowerCase();

      // 2. Check network
      const currentHexChainId: string = await eth.request({ method: "eth_chainId" });
      const currentChainId = parseInt(currentHexChainId, 16);
      setChainId(currentChainId);

      // If on unsupported network, ask to switch to Sepolia
      if (!SUPPORTED_NETWORKS[currentChainId]) {
        const switched = await switchNetwork(SEPOLIA_TESTNET.chainId);
        if (!switched) {
          setWalletState("WRONG_NETWORK");
          setWalletAddress(connectedAccount);
          isConnectingRef.current = false;
          return false;
        }
      }

      // 3. Perform basic read-only blockchain check via RPC provider
      const rpcOk = await testRpc();
      if (rpcOk) {
        await fetchBalance(connectedAccount);
      }

      // 4. Link wallet address with currently authenticated user account
      try {
        const res = await fetch("/api/profile/wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: connectedAccount }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          if (res.status === 409) {
            setErrorMessage(errData.error || "This wallet is already linked to another account.");
            setWalletState("ERROR");
            isConnectingRef.current = false;
            return false;
          }
          console.warn("Failed to link wallet to user account in DB:", errData.error);
        }
      } catch (dbErr) {
        console.warn("Wallet link DB warning:", dbErr);
      }

      setWalletAddress(connectedAccount);
      setWalletState("CONNECTED");
      setPendingAccountChange(null);
      if (refreshProfile) await refreshProfile();
      return true;
    } catch (err: any) {
      console.error("MetaMask connection error:", err);
      if (err.code === 4001 || err.message?.includes("rejected")) {
        setErrorMessage("Wallet connection was cancelled by user.");
        setWalletState("REJECTED");
      } else if (err.code === -32002) {
        setErrorMessage("MetaMask request already pending. Please open MetaMask to approve.");
        setWalletState("ERROR");
      } else {
        setErrorMessage(err.message || "Failed to connect to MetaMask.");
        setWalletState("ERROR");
      }
      return false;
    } finally {
      isConnectingRef.current = false;
    }
  }, [switchNetwork, testRpc, fetchBalance, refreshProfile]);

  // Disconnect wallet from application session / account
  const disconnectMetaMask = useCallback(async () => {
    try {
      await fetch("/api/profile/wallet", {
        method: "DELETE",
      }).catch((e) => console.warn("Unlink wallet warning:", e));
    } catch (err) {
      console.warn("Disconnect wallet error:", err);
    }

    setWalletAddress(null);
    setWalletState("DISCONNECTED");
    setPendingAccountChange(null);
    setErrorMessage(null);
    setBalance(null);
    if (refreshProfile) await refreshProfile();
  }, [refreshProfile]);

  // Account switch confirmations
  const confirmAccountSwitch = useCallback(async (): Promise<boolean> => {
    if (!pendingAccountChange) return false;
    const target = pendingAccountChange;
    setPendingAccountChange(null);

    try {
      const res = await fetch("/api/profile/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: target }),
      });
      if (res.ok) {
        setWalletAddress(target);
        setWalletState("CONNECTED");
        testRpc();
        fetchBalance(target);
        if (refreshProfile) await refreshProfile();
        return true;
      }
    } catch (e) {
      console.error("Error confirming account switch:", e);
    }
    return false;
  }, [pendingAccountChange, testRpc, fetchBalance, refreshProfile]);

  const cancelAccountSwitch = useCallback(() => {
    setPendingAccountChange(null);
  }, []);

  // Send creator tip in testnet ETH
  const sendTip = useCallback(
    async (
      recipientAddress: string,
      amountEth: string
    ): Promise<{ success: boolean; txHash?: string; error?: string }> => {
      if (typeof window === "undefined" || !(window as any).ethereum) {
        return { success: false, error: "MetaMask is not installed." };
      }

      if (!walletAddress) {
        return { success: false, error: "Please connect your wallet first." };
      }

      const eth = (window as any).ethereum;

      try {
        // Ensure supported network
        if (chainId && !SUPPORTED_NETWORKS[chainId]) {
          const switched = await switchNetwork(SEPOLIA_TESTNET.chainId);
          if (!switched) {
            return { success: false, error: "Please switch to Sepolia Testnet to send tips." };
          }
        }

        // Convert ETH string to Wei hex
        const parsedAmount = parseFloat(amountEth);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          return { success: false, error: "Invalid tip amount." };
        }

        // BigInt Wei conversion (1 ETH = 10^18 Wei)
        const weiAmount = BigInt(Math.floor(parsedAmount * 1e18));
        const hexValue = "0x" + weiAmount.toString(16);

        const txHash = await eth.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: walletAddress,
              to: recipientAddress,
              value: hexValue,
            },
          ],
        });

        // Record tip metadata on backend
        try {
          await fetch("/api/blockchain/tip", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              senderAddress: walletAddress,
              recipientAddress,
              amountEth,
              txHash,
              chainId: chainId || SEPOLIA_TESTNET.chainId,
            }),
          });
        } catch (recordErr) {
          console.warn("Tip record logging warning:", recordErr);
        }

        // Refresh balance after transaction
        setTimeout(() => {
          fetchBalance(walletAddress);
        }, 2000);

        return { success: true, txHash };
      } catch (err: any) {
        console.error("Tip transaction error:", err);
        if (err.code === 4001 || err.message?.includes("rejected")) {
          return { success: false, error: "Transaction was rejected by user in MetaMask." };
        }
        if (err.message?.includes("insufficient funds")) {
          return { success: false, error: "Insufficient Sepolia testnet funds for transaction + gas." };
        }
        return { success: false, error: err.message || "Failed to send tip transaction." };
      }
    },
    [walletAddress, chainId, switchNetwork, fetchBalance]
  );

  // Compute SHA-256 hash using Web Crypto API
  const calculateSha256 = useCallback(async (data: string | ArrayBuffer): Promise<string> => {
    try {
      const buffer: BufferSource =
        typeof data === "string" ? new TextEncoder().encode(data) : data;
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      return `0x${hashHex}`;
    } catch (e) {
      console.error("SHA-256 calculation error:", e);
      return "";
    }
  }, []);

  const value: Web3ContextType = {
    walletAddress,
    shortAddress,
    chainId,
    networkName,
    walletState,
    isMetaMaskInstalled,
    isWalletConnected,
    isSupportedNetwork,
    isRpcConnected,
    rpcLatencyMs,
    latestBlock,
    balance,
    errorMessage,
    rpcError,
    activeRpcUrl,
    pendingAccountChange,
    connectMetaMask,
    disconnectMetaMask,
    switchNetwork,
    confirmAccountSwitch,
    cancelAccountSwitch,
    clearError,
    fetchBalance,
    testRpc,
    sendTip,
    calculateSha256,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

export function useMetaMask() {
  return useContext(Web3Context);
}
