import { ethers } from "ethers";
import contractConfig from "./contract-config.json";

export function getContractConfig() {
  return contractConfig;
}

export function getProofOfCreationContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  const address = contractConfig.proofOfCreationAddress || contractConfig.address;
  const abi = contractConfig.proofOfCreationAbi || contractConfig.abi;
  return new ethers.Contract(address, abi, signerOrProvider);
}

export function getSocialNFTContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  const address = contractConfig.socialNFTAddress;
  const abi = contractConfig.socialNFTAbi;
  return new ethers.Contract(address, abi, signerOrProvider);
}

export function getSocialMediaContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  const address = contractConfig.socialMediaAddress || contractConfig.address;
  const abi = contractConfig.socialMediaAbi || contractConfig.abi;
  return new ethers.Contract(address, abi, signerOrProvider);
}

/**
 * Generate SHA-256 / Keccak-256 cryptographic content fingerprint for Proof-of-Creation.
 */
export function generateContentHash(mediaCid: string, caption: string, authorAddress: string): string {
  const payload = `${mediaCid}:${caption.trim()}:${authorAddress.toLowerCase()}`;
  return ethers.keccak256(ethers.toUtf8Bytes(payload));
}
