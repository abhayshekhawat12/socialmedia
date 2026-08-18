import { ethers } from "ethers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "block_social_proof_of_creation_secret_key_2026";

export interface AuthSession {
  walletAddress: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate auth challenge message for wallet signing.
 */
export function getAuthChallengeMessage(walletAddress: string, nonce: string): string {
  return `Welcome to BlockSocial Decentralized Platform!\n\nSign this message to verify ownership of your wallet address.\n\nWallet: ${walletAddress.toLowerCase()}\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}`;
}

/**
 * Verify EIP-191 signature against expected signer address.
 */
export function verifyWalletSignature(
  walletAddress: string,
  nonce: string,
  signature: string
): boolean {
  try {
    const message = getAuthChallengeMessage(walletAddress, nonce);
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

/**
 * Sign JWT session token for authenticated wallet session.
 */
export function signAuthToken(walletAddress: string): string {
  return jwt.sign({ walletAddress: walletAddress.toLowerCase() }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

/**
 * Verify JWT session token from authorization header or cookie.
 */
export function verifyAuthToken(token: string): AuthSession | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthSession;
    return decoded;
  } catch (error) {
    return null;
  }
}
