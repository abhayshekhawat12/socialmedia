'use client';

import React from 'react';
import { Sparkles, Wand2, Scissors, Smile, Briefcase, Languages, X } from 'lucide-react';

interface AiAssistantBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (optionText: string) => void;
}

export const AiAssistantBottomSheet: React.FC<AiAssistantBottomSheetProps> = ({
  isOpen,
  onClose,
  onSelectOption,
}) => {
  if (!isOpen) return null;

  const aiOptions = [
    { label: 'Smart Reply', desc: 'Generate quick contextual responses', icon: Wand2, action: 'Thanks for reaching out! I would love to connect.' },
    { label: 'Improve Writing', desc: 'Enhance clarity and tone', icon: Sparkles, action: 'Hey there! Hope you are having a fantastic day.' },
    { label: 'Shorten Message', desc: 'Make it concise', icon: Scissors, action: 'Sounds good! See you soon.' },
    { label: 'Make Friendly', desc: 'Add warm & friendly vibes', icon: Smile, action: 'Hey! That sounds super cool 😊 Let us do it!' },
    { label: 'Make Professional', desc: 'Format for formal context', icon: Briefcase, action: 'Thank you for the update. Please let me know the details.' },
    { label: 'Translate to Hindi', desc: 'Instant multi-language translation', icon: Languages, action: 'नमस्ते! आप कैसे हैं?' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#131b2e] border-t border-slate-200 dark:border-slate-800 rounded-t-[2.5rem] p-6 max-w-lg w-full shadow-2xl space-y-4 animate-slideUp">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-500">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">AI Chat Assistant</h3>
              <p className="text-[10px] text-slate-400">Smart writing tools & translation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {aiOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.label}
                onClick={() => {
                  onSelectOption(opt.action);
                  onClose();
                }}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-500 text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-2 text-sky-500 mb-1">
                  <Icon className="w-4 h-4" />
                  <span className="font-extrabold text-xs text-slate-900 dark:text-white group-hover:text-sky-500 transition-colors">
                    {opt.label}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">{opt.desc}</p>
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
};
