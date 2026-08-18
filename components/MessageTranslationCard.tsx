'use client';

import React from 'react';
import { Languages, X, Check } from 'lucide-react';

interface MessageTranslationCardProps {
  originalText: string;
  translatedText: string;
  targetLang?: string;
  onClose: () => void;
}

export const MessageTranslationCard: React.FC<MessageTranslationCardProps> = ({
  originalText,
  translatedText,
  targetLang = 'Hindi',
  onClose,
}) => {
  return (
    <div className="mt-2 p-3 rounded-2xl bg-sky-50/90 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 text-xs space-y-2 animate-fadeIn">
      <div className="flex items-center justify-between text-sky-600 dark:text-sky-400 font-extrabold text-[11px]">
        <div className="flex items-center gap-1.5">
          <Languages className="w-3.5 h-3.5" />
          <span>Translation ({targetLang})</span>
        </div>
        <button onClick={onClose} className="p-0.5 text-slate-400 hover:text-slate-600">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-1">
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Original</div>
        <p className="text-slate-700 dark:text-slate-300 font-medium">{originalText}</p>
      </div>

      <div className="space-y-1 pt-1 border-t border-sky-200/60 dark:border-sky-800/40">
        <div className="text-[10px] text-sky-600 dark:text-sky-400 font-bold uppercase tracking-wider flex items-center gap-1">
          <Check className="w-3 h-3" /> {targetLang}
        </div>
        <p className="text-slate-900 dark:text-white font-semibold">{translatedText}</p>
      </div>
    </div>
  );
};
