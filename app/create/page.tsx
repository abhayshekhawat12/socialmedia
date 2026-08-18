'use client';

import React, { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CreatePostModal } from "../../components/CreatePostModal";

function CreatePostContent() {
  const searchParams = useSearchParams();
  const topic = searchParams.get('topic');
  const hashtags = searchParams.get('hashtags');

  return (
    <div className="py-2 space-y-4">
      {topic && (
        <div className="p-3.5 rounded-2xl bg-[#00B7FF]/10 border border-[#00B7FF]/30 text-xs font-bold text-[#00B7FF] flex items-center justify-between">
          <span>🔥 Creating Content on Trending Topic: <strong>{topic}</strong></span>
          <span className="text-[10px] opacity-80">{hashtags}</span>
        </div>
      )}
      <CreatePostModal />
    </div>
  );
}

export default function CreatePostPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading creation workspace...</div>}>
      <CreatePostContent />
    </Suspense>
  );
}
