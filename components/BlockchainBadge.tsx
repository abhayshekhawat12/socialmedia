'use client';

import React, { useState } from 'react';
import { ShieldCheck, ExternalLink, Hash, Clock, Cpu, UserCheck } from 'lucide-react';
import contractConfig from '../lib/contract-config.json';

interface BlockchainBadgeProps {
  txHash?: string;
  blockNumber?: number;
  authorWallet: string;
  timestamp: number;
  postId: number;
  metadataCID: string;
}

export const BlockchainBadge: React.FC<BlockchainBadgeProps> = ({
  txHash,
  blockNumber,
  authorWallet,
  timestamp,
  postId,
  metadataCID,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || contractConfig.address;
  const formattedDate = new Date(timestamp).toLocaleString();
  const explorerUrl = txHash ? `https://sepolia.etherscan.io/tx/${txHash}` : null;
  const contractExplorerUrl = `https://sepolia.etherscan.io/address/${contractAddress}`;
  const ipfsGatewayUrl = `https://gateway.pinata.cloud/ipfs/${metadataCID.replace('ipfs://', '')}`;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
        title="View On-Chain Verification Proof"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>Verified On-Chain</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5 text-slate-100 relative">
            
            <div className="flex items-center justify-between border-b border-dark-border pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Blockchain Verification Proof</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Post ID */}
              <div className="bg-dark-bg p-3 rounded-xl border border-dark-border flex justify-between items-center">
                <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <Hash className="w-4 h-4 text-indigo-400" /> On-Chain Post ID:
                </span>
                <span className="font-mono text-white text-sm font-bold">#{postId}</span>
              </div>

              {/* Author Wallet */}
              <div className="bg-dark-bg p-3 rounded-xl border border-dark-border space-y-1">
                <div className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <UserCheck className="w-4 h-4 text-indigo-400" /> Author Wallet Address:
                </div>
                <div className="font-mono text-indigo-300 break-all select-all font-semibold">
                  {authorWallet}
                </div>
              </div>

              {/* Contract Address */}
              <div className="bg-dark-bg p-3 rounded-xl border border-dark-border space-y-1">
                <div className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <Cpu className="w-4 h-4 text-indigo-400" /> Smart Contract Address:
                </div>
                <div className="font-mono text-slate-300 break-all flex justify-between items-center">
                  <span>{contractAddress}</span>
                  <a
                    href={contractExplorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-400 hover:underline flex items-center gap-1 text-xs"
                  >
                    Explorer <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* IPFS Metadata CID */}
              <div className="bg-dark-bg p-3 rounded-xl border border-dark-border space-y-1">
                <div className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <ExternalLink className="w-4 h-4 text-indigo-400" /> IPFS Metadata CID:
                </div>
                <div className="font-mono text-purple-300 break-all flex justify-between items-center">
                  <span>{metadataCID}</span>
                  <a
                    href={ipfsGatewayUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-400 hover:underline flex items-center gap-1 text-xs"
                  >
                    Raw IPFS <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Timestamp */}
              <div className="bg-dark-bg p-3 rounded-xl border border-dark-border flex justify-between items-center">
                <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <Clock className="w-4 h-4 text-indigo-400" /> Timestamp:
                </span>
                <span className="text-slate-200">{formattedDate}</span>
              </div>
            </div>

            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
              >
                View Transaction on Etherscan <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <button
              onClick={() => setIsOpen(false)}
              className="w-full py-2.5 rounded-xl border border-dark-border bg-dark-bg hover:bg-dark-hover font-semibold text-slate-300 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};
