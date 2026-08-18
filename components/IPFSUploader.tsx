'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, Film, X, Check, Loader2 } from 'lucide-react';
import { uploadFileToIPFS } from '../lib/ipfs';

interface IPFSUploaderProps {
  onUploadComplete: (cid: string) => void;
  accept?: string;
  label?: string;
  previewUrl?: string;
}

export const IPFSUploader: React.FC<IPFSUploaderProps> = ({
  onUploadComplete,
  accept = 'image/*,video/*',
  label = 'Upload media to IPFS',
  previewUrl,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(previewUrl || null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadedCID, setUploadedCID] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setUploading(true);

    try {
      const cid = await uploadFileToIPFS(selectedFile);
      setUploadedCID(cid);
      onUploadComplete(cid);
    } catch (err) {
      console.error('File upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setPreview(null);
    setUploadedCID(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onUploadComplete('');
  };

  return (
    <div className="w-full space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
      />

      {!preview ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-dark-border hover:border-indigo-500/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 bg-dark-card/40 hover:bg-dark-card transition-all cursor-pointer group"
        >
          <div className="p-3 rounded-full bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold text-slate-200">{label}</div>
            <div className="text-xs text-slate-500 mt-1">PNG, JPG, GIF, MP4 (Media pinned to IPFS)</div>
          </div>
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden border border-dark-border bg-dark-card max-h-80 flex items-center justify-center">
          {file && file.type.startsWith('video') ? (
            <video src={preview} controls className="max-h-80 w-full object-contain" />
          ) : (
            <img src={preview} alt="Media Preview" className="max-h-80 w-full object-cover" />
          )}

          {/* Top Control Bar */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            {uploading ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md text-indigo-300 font-semibold text-xs border border-indigo-500/30">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Pinning to IPFS...
              </div>
            ) : uploadedCID ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/80 backdrop-blur-md text-emerald-400 font-bold text-xs border border-emerald-500/40">
                <Check className="w-3.5 h-3.5" /> Pinned: {uploadedCID.substring(0, 8)}...
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleRemove}
              className="p-1.5 rounded-full bg-black/70 hover:bg-rose-600 text-white transition-colors"
              title="Remove File"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
