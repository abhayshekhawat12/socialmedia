'use client';

import React from 'react';
import { Camera, Image, Film, FileText, Mic, MapPin, X } from 'lucide-react';
import Link from 'next/link';

interface MediaAttachmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (type: string) => void;
}

export const MediaAttachmentDrawer: React.FC<MediaAttachmentDrawerProps> = ({
  isOpen,
  onClose,
  onSelectOption,
}) => {
  if (!isOpen) return null;

  const attachments = [
    { label: 'Camera', icon: Camera, color: 'bg-rose-500 text-white', type: 'camera', isLink: '/camera' },
    { label: 'Photos', icon: Image, color: 'bg-purple-500 text-white', type: 'photos' },
    { label: 'Videos', icon: Film, color: 'bg-blue-500 text-white', type: 'videos' },
    { label: 'Document', icon: FileText, color: 'bg-indigo-500 text-white', type: 'document' },
    { label: 'Audio', icon: Mic, color: 'bg-amber-500 text-white', type: 'audio' },
    { label: 'Location', icon: MapPin, color: 'bg-emerald-500 text-white', type: 'location' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-[#131b2e] border-t border-slate-200 dark:border-slate-800 rounded-t-[2.5rem] p-6 max-w-sm w-full shadow-2xl space-y-4 animate-slideUp">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Share Content</h3>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Attachment Options Grid */}
        <div className="grid grid-cols-3 gap-4 text-center">
          {attachments.map((item) => {
            const Icon = item.icon;

            if (item.isLink) {
              return (
                <Link
                  key={item.label}
                  href={item.isLink}
                  onClick={onClose}
                  className="flex flex-col items-center gap-1.5 group cursor-pointer"
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform ${item.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{item.label}</span>
                </Link>
              );
            }

            return (
              <button
                key={item.label}
                onClick={() => {
                  onSelectOption(item.type);
                  onClose();
                }}
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform ${item.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{item.label}</span>
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
};
