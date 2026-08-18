'use client';

import React, { useState } from 'react';
import { Coins, Sparkles, X, Info } from 'lucide-react';
import { useWeb3 } from '../lib/web3Context';

interface TipButtonProps {
  postId?: any;
  creatorAddress?: string;
  creatorName?: string;
  tipTotal?: string;
}

export const TipButton: React.FC<TipButtonProps> = ({
  creatorAddress = '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
  creatorName = 'Creator',
  tipTotal = '0.00',
}) => {
  const { account, isWeb3Connected, connectWallet } = useWeb3();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('0.005');
  const [sending, setSending] = useState(false);

  const handleTipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isWeb3Connected) {
      alert("Please connect your MetaMask wallet manually to send crypto tips.");
      await connectWallet();
      return;
    }
    
    try {
      setSending(true);
      // Simulate real Ethereum transaction send transaction request
      if (typeof window !== "undefined" && (window as any).ethereum) {
        const ethereum = (window as any).ethereum;
        const valueInHex = `0x${(parseFloat(amount) * 1e18).toString(16)}`;
        
        await ethereum.request({
          method: 'eth_sendTransaction',
          params: [
            {
              from: account,
              to: creatorAddress.toLowerCase(),
              value: valueInHex,
            },
          ],
        });
      }
      alert(`Successfully sent a tip of ${amount} ETH to ${creatorName}!`);
      setIsOpen(false);
    } catch (err: any) {
      console.error(err);
      alert(`Transaction cancelled or failed: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-extrabold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all cursor-pointer shrink-0"
      >
        <Coins className="w-3.5 h-3.5 text-amber-500" />
        <span>Tip ETH ({tipTotal})</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-800 dark:text-slate-100 relative text-left">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Tip {creatorName}</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTipSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Tip Amount (ETH)</label>
                <input
                  type="number"
                  step="0.001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-mono font-bold outline-none"
                />
              </div>

              {/* Transaction Explanation */}
              <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 text-amber-500 font-bold">
                  <Info className="w-4.5 h-4.5" />
                  <span>MetaMask Transaction Details</span>
                </div>
                <div className="space-y-1 font-mono text-[10px] text-slate-400">
                  <div>Recipient: <span className="text-slate-200">{creatorAddress}</span></div>
                  <div>Estimated Gas Fee: <span className="text-amber-500 font-bold">~0.0001 ETH</span></div>
                  <p className="text-[10px] text-slate-500 font-sans leading-normal pt-1">
                    MetaMask will prompt you to sign a transaction to transfer {amount} ETH from your connected wallet directly to the creator.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{sending ? "Confirming..." : `Send ${amount} ETH Tip`}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
