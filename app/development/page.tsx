'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  Flame, 
  Sparkles, 
  ShieldCheck, 
  Eye, 
  Heart, 
  MessageSquare, 
  Share2, 
  ArrowUpRight, 
  Zap, 
  BarChart3, 
  CheckCircle2, 
  Filter, 
  Play, 
  Compass,
  Bot
} from 'lucide-react';

export default function DevelopmentPage() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<'hot' | 'rising' | 'viewed' | 'liked' | 'discussed'>('hot');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTrendingData() {
      try {
        setLoading(true);
        const res = await fetch('/api/trending');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Failed to load trending intelligence:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTrendingData();
  }, []);

  const handleCreateOnTrend = (topicTag: string, hashtags: string) => {
    const cleanHashtags = encodeURIComponent(hashtags);
    router.push(`/create?topic=${encodeURIComponent(topicTag)}&hashtags=${cleanHashtags}`);
  };

  if (loading || !data) {
    return (
      <div className="p-8 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-[#00B7FF] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400 font-bold">Analyzing real-time platform trends & blockchain metrics...</p>
      </div>
    );
  }

  const { trendingTopics, contentOpportunities, trendingReels, meta } = data;

  return (
    <div className="space-y-6 pb-20">
      
      {/* Top Banner: Trending Intelligence Header */}
      <div className="bg-gradient-to-tr from-[#00B7FF] via-[#36C4FF] to-indigo-600 rounded-3xl p-5 text-white shadow-aura space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-white/20 backdrop-blur-md">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight">Trending Intelligence</h1>
              <p className="text-[11px] text-cyan-100 font-medium">Real-Time Platform Trends & AI Opportunity Engine</p>
            </div>
          </div>

          <div className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-extrabold flex items-center gap-1 border border-white/30">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            <span>Verifiable Metrics</span>
          </div>
        </div>

        {/* Intelligence Stats Strip */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/20 text-center text-xs">
          <div className="bg-white/10 backdrop-blur-sm p-2 rounded-2xl">
            <div className="text-[10px] text-cyan-100 font-bold">Authentic Engagement</div>
            <div className="text-sm font-black flex items-center justify-center gap-1">
              <span>{meta.overallAuthenticity}</span>
              <span title="Anti-Bot Verified">
                <Bot className="w-3 h-3 text-emerald-300" />
              </span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm p-2 rounded-2xl">
            <div className="text-[10px] text-cyan-100 font-bold">Monitored Posts</div>
            <div className="text-sm font-black">{meta.activeMonitoredPosts.toLocaleString()}</div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm p-2 rounded-2xl">
            <div className="text-[10px] text-cyan-100 font-bold">Blockchain Node</div>
            <div className="text-sm font-black text-emerald-300">✓ Synced</div>
          </div>
        </div>
      </div>

      {/* SECTION 1: WHAT'S TRENDING */}
      <div className="bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
            <h2 className="font-extrabold text-base text-slate-900 dark:text-white">What's Trending</h2>
          </div>
          <span className="text-[11px] font-bold text-[#00B7FF] bg-[#00B7FF]/10 px-2.5 py-0.5 rounded-full">
            Live Platform Rankings
          </span>
        </div>

        {/* Trending Topics Ranked List */}
        <div className="space-y-3">
          {trendingTopics.map((topic: any) => (
            <div
              key={topic.id}
              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/80 hover:border-[#00B7FF] transition-all space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                    topic.rank === 1 ? 'bg-amber-400 text-slate-950' : topic.rank === 2 ? 'bg-slate-300 text-slate-900' : 'bg-amber-700/20 text-amber-600'
                  }`}>
                    #{topic.rank}
                  </span>

                  <div>
                    <h3 className="font-black text-sm text-slate-900 dark:text-white group-hover:text-[#00B7FF] transition-colors flex items-center gap-1.5">
                      <span>{topic.name}</span>
                      {topic.isRising && (
                        <span className="text-[9px] font-extrabold bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                          <Zap className="w-3 h-3 fill-rose-500" /> Rising
                        </span>
                      )}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold">{topic.category}</p>
                  </div>
                </div>

                {/* Trending Score Badge */}
                <div className="text-right">
                  <div className="text-[11px] font-black text-[#00B7FF]">
                    Score: {topic.trendingScore}/100 🔥
                  </div>
                  <div className="text-[10px] text-emerald-500 font-bold">
                    {topic.growthRate} Growth
                  </div>
                </div>
              </div>

              {/* Topic Analytics Metrics Strip */}
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-[10px] text-slate-500 font-medium">
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-200">{topic.postsCount}</span> posts
                </div>
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-200">{topic.viewsCount}</span> views
                </div>
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-200">{topic.engagementRate}</span> ER
                </div>
                <div className="text-right font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-0.5">
                  <ShieldCheck className="w-3 h-3" /> {topic.authenticEngagement} Auth
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: WHAT SHOULD I POST? (AI OPPORTUNITY ENGINE) */}
      <div className="bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-[#00B7FF]/10 text-[#00B7FF]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-900 dark:text-white">What Should I Post?</h2>
              <p className="text-[10px] text-slate-400">AI-Powered Content Opportunity Recommendations</p>
            </div>
          </div>
        </div>

        {/* Content Opportunity Cards */}
        <div className="space-y-4">
          {contentOpportunities.map((opp: any) => (
            <div
              key={opp.id}
              className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-cyan-50/40 dark:from-slate-900/80 dark:to-cyan-950/20 border border-slate-200/80 dark:border-slate-800 space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-extrabold text-[#00B7FF] uppercase tracking-wider">Recommended Opportunity</span>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">{opp.topic}</h3>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-[#00B7FF] text-white font-black text-[10px]">
                  Score: {opp.trendingScore}/100
                </span>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60">
                  <div className="text-[10px] text-slate-400 font-bold">Best Format</div>
                  <div className="font-extrabold text-slate-900 dark:text-white text-[11px] truncate">{opp.bestContent}</div>
                </div>

                <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60">
                  <div className="text-[10px] text-slate-400 font-bold">Expected Reach</div>
                  <div className="font-extrabold text-emerald-600 dark:text-emerald-400 text-[11px]">{opp.expectedReach}</div>
                </div>

                <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60">
                  <div className="text-[10px] text-slate-400 font-bold">Competition</div>
                  <div className="font-extrabold text-amber-600 dark:text-amber-400 text-[11px]">{opp.competition}</div>
                </div>

                <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60">
                  <div className="text-[10px] text-slate-400 font-bold">Current Demand</div>
                  <div className="font-extrabold text-[#00B7FF] text-[11px]">{opp.currentDemand}</div>
                </div>
              </div>

              {/* Suggested Hashtags */}
              <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                <span className="font-bold text-slate-400 mr-1.5">Suggested Hashtags:</span>
                <span className="text-[#00B7FF] font-bold">{opp.suggestedHashtags}</span>
              </div>

              {/* Action Button: Create Content on This Trend */}
              <button
                onClick={() => handleCreateOnTrend(opp.topicTag, opp.suggestedHashtags)}
                className="w-full py-3 rounded-2xl bg-[#00B7FF] hover:bg-[#36C4FF] text-white font-extrabold text-xs shadow-md shadow-[#00B7FF]/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 fill-white" />
                <span>Create Content on This Trend</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>

            </div>
          ))}
        </div>

      </div>

      {/* SECTION 3: TRENDING REELS & POSTS */}
      <div className="bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        
        {/* Header & Filter Tabs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-1.5">
              <Play className="w-4 h-4 text-[#00B7FF] fill-[#00B7FF]" />
              <span>Trending Reels & Content</span>
            </h2>

            <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> On-Chain Verified
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs font-bold">
            <button
              onClick={() => setActiveFilter('hot')}
              className={`px-3 py-1.5 rounded-full transition-all shrink-0 ${
                activeFilter === 'hot' ? 'bg-[#00B7FF] text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              🔥 Hot Now
            </button>
            <button
              onClick={() => setActiveFilter('rising')}
              className={`px-3 py-1.5 rounded-full transition-all shrink-0 ${
                activeFilter === 'rising' ? 'bg-[#00B7FF] text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              📈 Rising
            </button>
            <button
              onClick={() => setActiveFilter('viewed')}
              className={`px-3 py-1.5 rounded-full transition-all shrink-0 ${
                activeFilter === 'viewed' ? 'bg-[#00B7FF] text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              👀 Most Viewed
            </button>
            <button
              onClick={() => setActiveFilter('liked')}
              className={`px-3 py-1.5 rounded-full transition-all shrink-0 ${
                activeFilter === 'liked' ? 'bg-[#00B7FF] text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              ❤️ Most Liked
            </button>
            <button
              onClick={() => setActiveFilter('discussed')}
              className={`px-3 py-1.5 rounded-full transition-all shrink-0 ${
                activeFilter === 'discussed' ? 'bg-[#00B7FF] text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              💬 Most Discussed
            </button>
          </div>
        </div>

        {/* Reels Showcase Cards */}
        <div className="space-y-4">
          {trendingReels.map((reel: any) => (
            <div
              key={reel.id}
              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/80 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img src={reel.avatar} alt={reel.creator} className="w-8 h-8 rounded-full object-cover border border-[#00B7FF]" />
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1">
                      <span>{reel.creator}</span>
                      <CheckCircle2 className="w-3 h-3 text-[#00B7FF]" />
                    </h4>
                    <span className="text-[10px] text-slate-400">{reel.creatorUsername}</span>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full bg-[#00B7FF]/10 text-[#00B7FF] font-black text-[10px]">
                  Score: {reel.trendingScore}/100
                </span>
              </div>

              {/* Media Preview Box */}
              <div className="relative rounded-xl overflow-hidden aspect-video bg-slate-950 flex items-center justify-center">
                <img src={reel.mediaUrl} alt={reel.title} className="w-full h-full object-cover opacity-90" />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-[#00B7FF]/90 text-white flex items-center justify-center shadow-lg">
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </div>
                </div>
                <div className="absolute bottom-2 left-2 right-2 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md text-white text-xs font-bold truncate">
                  {reel.title}
                </div>
              </div>

              {/* Reel Metrics */}
              <div className="grid grid-cols-4 gap-2 text-[10px] text-slate-500 font-bold border-t border-slate-200/60 dark:border-slate-800/60 pt-2">
                <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                  <Eye className="w-3 h-3 text-[#00B7FF]" /> {reel.views}
                </div>
                <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                  <Heart className="w-3 h-3 text-rose-500" /> {reel.likes}
                </div>
                <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                  <MessageSquare className="w-3 h-3 text-purple-500" /> {reel.comments}
                </div>
                <div className="text-right text-emerald-500">
                  {reel.growthRate}
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>

      {/* SECTION 4: TRENDING FOR YOU (PERSONALIZED) */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-950/30 dark:to-indigo-950/30 border border-sky-200/60 dark:border-sky-800/40 text-xs space-y-2">
        <div className="flex items-center gap-2 font-extrabold text-[#00B7FF]">
          <Compass className="w-4 h-4" />
          <span>Trending For You (Personalized Intelligence)</span>
        </div>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
          Based on your interactions with AI, Web3 development, and photography posts, your feed is prioritized for high engagement velocity topics.
        </p>
      </div>

    </div>
  );
}
