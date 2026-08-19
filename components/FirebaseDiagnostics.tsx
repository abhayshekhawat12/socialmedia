"use client";

import React, { useState } from "react";
import { 
  getFirebaseConfigStatus, 
  saveRuntimeFirebaseConfig, 
  clearRuntimeFirebaseConfig,
  getEffectiveFirebaseConfig 
} from "../lib/firebase";
import { 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  ChevronUp, 
  Terminal, 
  Key, 
  Edit3, 
  Trash2,
  Save,
  X
} from "lucide-react";

export function FirebaseDiagnostics() {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [pastedJson, setPastedJson] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [authDomain, setAuthDomain] = useState("");
  const [projectId, setProjectId] = useState("");
  const [storageBucket, setStorageBucket] = useState("");
  const [messagingSenderId, setMessagingSenderId] = useState("");
  const [appId, setAppId] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);

  const status = getFirebaseConfigStatus();
  const { source } = getEffectiveFirebaseConfig();
  const isDev = process.env.NODE_ENV !== "production";

  if (!isDev) return null;

  const handleParseJson = () => {
    setParseError(null);
    if (!pastedJson.trim()) return;

    try {
      // Clean string if copied with 'const firebaseConfig = ...' or JS object
      let clean = pastedJson.trim();
      if (clean.includes("{") && clean.includes("}")) {
        const start = clean.indexOf("{");
        const end = clean.lastIndexOf("}") + 1;
        clean = clean.substring(start, end);
        
        // Convert JS object keys to valid JSON format if needed
        clean = clean
          .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
          .replace(/'/g, '"');
      }

      const parsed = JSON.parse(clean);
      if (parsed.apiKey) setApiKey(parsed.apiKey);
      if (parsed.authDomain) setAuthDomain(parsed.authDomain);
      if (parsed.projectId) setProjectId(parsed.projectId);
      if (parsed.storageBucket) setStorageBucket(parsed.storageBucket);
      if (parsed.messagingSenderId) setMessagingSenderId(parsed.messagingSenderId);
      if (parsed.appId) setAppId(parsed.appId);
    } catch (e: any) {
      setParseError("Could not auto-parse JSON snippet. Please check formatting or fill fields manually.");
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !authDomain || !projectId || !appId) {
      setParseError("API Key, Auth Domain, Project ID, and App ID are required.");
      return;
    }

    saveRuntimeFirebaseConfig({
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim(),
      projectId: projectId.trim(),
      storageBucket: storageBucket.trim(),
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim()
    });
  };

  return (
    <>
      <div className="w-full mt-6 text-left border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-900/70 p-4 transition-all text-xs">
        
        {/* Header Summary */}
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            {status.isConfigured ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
            )}
            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
              Developer Diagnostics: Firebase SDK
            </span>
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
              status.isConfigured ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
            }`}>
              {status.isConfigured ? (source === "local_storage" ? "Ready (UI Config)" : "Ready (.env.local)") : "Missing Keys"}
            </span>
          </div>

          <button type="button" className="text-slate-400 hover:text-slate-200">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Expanded Status Details */}
        {isOpen && (
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in duration-200">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Diagnostic tool active in local development. Never displays actual secret strings.
            </p>

            <div className="space-y-1.5 font-mono text-[11px]">
              {Object.entries(status.keysStatus).map(([key, isSet]) => (
                <div key={key} className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
                  <span className="text-slate-700 dark:text-slate-300">
                    NEXT_PUBLIC_FIREBASE_{key.replace(/([A-Z])/g, "_$1").toUpperCase()}
                  </span>
                  <span className={`font-bold flex items-center gap-1 ${isSet ? "text-emerald-500" : "text-rose-500"}`}>
                    {isSet ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Configured</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Missing</span>
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>

            {/* Actions for developer */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-[#00B7FF] hover:bg-[#00B7FF]/90 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Paste Firebase Config</span>
              </button>

              {source === "local_storage" && (
                <button
                  type="button"
                  onClick={clearRuntimeFirebaseConfig}
                  className="px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset to .env</span>
                </button>
              )}
            </div>
          </div>
        )}

      </div>

      {/* PASTE FIREBASE CONFIG MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-[#131b2e] border border-slate-800 p-6 text-left space-y-4 text-xs text-white relative shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-[#00B7FF] font-black text-sm">
                <Key className="w-4 h-4" />
                <span>Configure Firebase Credentials</span>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-300 text-xs">
              Paste the <code className="text-[#00B7FF] font-mono">firebaseConfig</code> object from Firebase Console &rarr; Project Settings &rarr; Web App:
            </p>

            {/* Fast JSON Paste Area */}
            <div className="space-y-1.5">
              <textarea
                rows={3}
                placeholder='const firebaseConfig = { apiKey: "...", authDomain: "...", projectId: "...", appId: "..." };'
                value={pastedJson}
                onChange={(e) => setPastedJson(e.target.value)}
                className="w-full p-3 font-mono text-[11px] rounded-xl bg-slate-900 border border-slate-800 text-slate-200 outline-none focus:border-[#00B7FF]"
              />
              <button
                type="button"
                onClick={handleParseJson}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-200 transition-colors cursor-pointer"
              >
                Auto-Fill Fields from Paste
              </button>
            </div>

            {parseError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
                {parseError}
              </div>
            )}

            {/* Individual input fields */}
            <form onSubmit={handleSaveConfig} className="space-y-2.5 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">API Key</label>
                  <input
                    type="text"
                    placeholder="AIzaSy..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs outline-none focus:border-[#00B7FF]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Auth Domain</label>
                  <input
                    type="text"
                    placeholder="project.firebaseapp.com"
                    value={authDomain}
                    onChange={(e) => setAuthDomain(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs outline-none focus:border-[#00B7FF]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Project ID</label>
                  <input
                    type="text"
                    placeholder="my-project-123"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs outline-none focus:border-[#00B7FF]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">App ID</label>
                  <input
                    type="text"
                    placeholder="1:12345:web:6789"
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs outline-none focus:border-[#00B7FF]"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00B7FF] to-indigo-600 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg hover:opacity-95 transition-opacity cursor-pointer mt-4"
              >
                <Save className="w-4 h-4" />
                <span>Save Credentials & Activate Firebase</span>
              </button>
            </form>

          </div>
        </div>
      )}
    </>
  );
}
