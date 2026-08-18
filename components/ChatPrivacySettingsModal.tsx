'use client';

import React, { useState } from 'react';
import { ShieldCheck, Lock, BellOff, UserX, Clock, Check, X, ToggleLeft, ToggleRight } from 'lucide-react';

interface ChatPrivacySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactName?: string;
}

export const ChatPrivacySettingsModal: React.FC<ChatPrivacySettingsModalProps> = ({
  isOpen,
  onClose,
  contactName = 'Sarah Jenkins',
}) => {
  const [disappearingTimer, setDisappearingTimer] = useState<'off' | '24h' | '7d' | '30d'>('24h');
  const [muted, setMuted] = useState(false);
  const [readReceipts, setReadReceipts] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-slate-800 dark:text-slate-100 relative text-xs">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-[#00B7FF]/10 text-[#00B7FF]">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Chat Privacy & Security</h3>
              <p className="text-[10px] text-slate-400">Encrypted Messaging with {contactName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Disappearing Messages Section */}
        <div className="space-y-2">
          <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#00B7FF]" /> Disappearing Messages
          </div>
          <p className="text-[10px] text-slate-400">
            For added privacy, new messages in this chat will disappear after the selected duration.
          </p>

          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {[
              { label: 'Off', val: 'off' },
              { label: '24 Hours', val: '24h' },
              { label: '7 Days', val: '7d' },
              { label: '30 Days', val: '30d' },
            ].map((timer) => (
              <button
                key={timer.val}
                onClick={() => setDisappearingTimer(timer.val as any)}
                className={`py-2 px-1 rounded-xl text-[10px] font-extrabold cursor-pointer border transition-all ${
                  disappearingTimer === timer.val
                    ? 'bg-[#00B7FF] text-white border-[#00B7FF] shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {timer.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles List */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-800 dark:text-slate-200">Read Receipts (Blue Ticks)</div>
              <div className="text-[10px] text-slate-400">Let others see when you read their messages</div>
            </div>
            <button onClick={() => setReadReceipts(!readReceipts)} className="text-[#00B7FF]">
              {readReceipts ? <ToggleRight className="w-6 h-6 text-[#00B7FF]" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <div className="font-bold text-slate-800 dark:text-slate-200">Mute Notifications</div>
              <div className="text-[10px] text-slate-400">Silence sound alerts for this chat</div>
            </div>
            <button onClick={() => setMuted(!muted)} className="text-[#00B7FF]">
              {muted ? <ToggleRight className="w-6 h-6 text-[#00B7FF]" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
            </button>
          </div>

        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-[#00B7FF] text-white font-extrabold text-xs shadow-md shadow-[#00B7FF]/20"
        >
          Save Privacy Settings
        </button>

      </div>
    </div>
  );
};
