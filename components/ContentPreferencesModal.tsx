"use client";

import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Check, 
  X, 
  Loader2, 
  Sliders, 
  Film, 
  Compass, 
  Heart 
} from "lucide-react";
import { useAuth } from "../lib/authContext";
import { audioHaptics } from "../lib/audioHaptics";

const ALL_INTERESTS = [
  { id: "Bollywood", label: "Bollywood", icon: "🎬" },
  { id: "Indian Music", label: "Indian Music", icon: "🎵" },
  { id: "Punjabi", label: "Punjabi", icon: "🌾" },
  { id: "Haryanvi", label: "Haryanvi", icon: "⚡" },
  { id: "Rajasthani", label: "Rajasthani", icon: "🏰" },
  { id: "Hindi", label: "Hindi", icon: "🇮🇳" },
  { id: "English", label: "English", icon: "🌍" },
  { id: "Trending", label: "Trending", icon: "🔥" },
  { id: "Comedy", label: "Comedy", icon: "😂" },
  { id: "Travel", label: "Travel", icon: "✈️" },
  { id: "Gaming", label: "Gaming", icon: "🎮" },
  { id: "Sports", label: "Sports", icon: "🏏" },
  { id: "Fashion", label: "Fashion", icon: "👗" },
  { id: "Fitness", label: "Fitness", icon: "💪" },
  { id: "Technology", label: "Technology", icon: "💻" },
  { id: "Motivation", label: "Motivation", icon: "✨" },
  { id: "Education", label: "Education", icon: "📚" },
  { id: "Food", label: "Food", icon: "🍲" },
  { id: "Memes", label: "Memes", icon: "🐸" },
  { id: "Lifestyle", label: "Lifestyle", icon: "☕" },
];

interface ContentPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function ContentPreferencesModal({
  isOpen,
  onClose,
  onSaved,
}: ContentPreferencesModalProps) {
  const { account } = useAuth();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen || !account) return;

    const fetchPreferences = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/settings?walletAddress=${account}`);
        if (res.ok) {
          const data = await res.json();
          if (data.settings?.interests) {
            const list = data.settings.interests
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean);
            setSelectedInterests(list);
          }
        }
      } catch (err) {
        console.error("Failed to load preferences:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
  }, [isOpen, account]);

  const toggleInterest = (id: string) => {
    audioHaptics.playTap();
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!account) return;
    try {
      setIsSaving(true);
      audioHaptics.playTap();

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: account,
          interests: selectedInterests.join(", "),
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        if (onSaved) onSaved();
        setTimeout(() => {
          setSaveSuccess(false);
          onClose();
        }, 500);
      }
    } catch (err) {
      console.error("Failed to save preferences:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in select-none">
      <div className="w-full max-w-lg bg-white dark:bg-[#131b2e] rounded-t-[32px] sm:rounded-[32px] border border-slate-200 dark:border-slate-800 p-6 space-y-5 max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-[#00B7FF] to-[#F45AA8] flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Content Preferences</h3>
              <p className="text-[10px] text-slate-400 font-medium">Personalize your feed, reels, and music recommendations</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interests Grid */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 no-scrollbar">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400 font-bold">Loading your preferences...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALL_INTERESTS.map((item) => {
                const isSelected = selectedInterests.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleInterest(item.id)}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-cyan-500/15 border-[#00B7FF] text-[#00B7FF] shadow-xs"
                        : "bg-slate-50 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{item.icon}</span>
                      <span className="font-bold text-xs">{item.label}</span>
                    </div>

                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-[#00B7FF] text-slate-950 flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs text-slate-400 font-semibold">
            {selectedInterests.length} selected
          </span>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-[#00B7FF] to-indigo-600 text-slate-950 hover:opacity-90 transition-all cursor-pointer shadow-md disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Preferences Saved!</span>
                </>
              ) : (
                <span>Save Preferences</span>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
