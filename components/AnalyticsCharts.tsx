"use client";

import React from "react";
import { TrendingUp, Eye, Heart, MessageSquare } from "lucide-react";

interface AnalyticsChartsProps {
  trendData: Array<{
    day: string;
    likes: number;
    comments: number;
    views: number;
  }>;
}

export function AnalyticsCharts({ trendData }: AnalyticsChartsProps) {
  const maxVal = Math.max(1, ...trendData.map((d) => Math.max(d.likes, d.comments, d.views)));

  return (
    <div className="space-y-6">
      {/* Views & Engagement Activity Bar Chart */}
      <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              7-Day Content Engagement Trend
            </h3>
            <p className="text-xs text-slate-400">Likes, Comments & Verified Views Activity</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              Views
            </span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              Likes
            </span>
            <span className="flex items-center gap-1.5 text-purple-400">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
              Comments
            </span>
          </div>
        </div>

        {/* Custom SVG Bar Chart */}
        <div className="h-56 flex items-end justify-between gap-2 sm:gap-6 pt-4 border-b border-slate-100 dark:border-slate-800">
          {trendData.map((item, idx) => {
            const viewsHeight = Math.max(12, (item.views / maxVal) * 100);
            const likesHeight = Math.max(8, (item.likes / maxVal) * 100);
            const commentsHeight = Math.max(6, (item.comments / maxVal) * 100);

            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full flex items-end justify-center gap-1 h-44">
                  {/* Views bar */}
                  <div
                    className="w-3.5 sm:w-5 rounded-t-lg bg-cyan-500/80 group-hover:bg-cyan-400 transition-all relative"
                    style={{ height: `${viewsHeight}%` }}
                  >
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[10px] font-bold bg-slate-900 text-white px-1.5 py-0.5 rounded shadow transition-opacity">
                      {item.views}
                    </span>
                  </div>

                  {/* Likes bar */}
                  <div
                    className="w-3.5 sm:w-5 rounded-t-lg bg-rose-500/80 group-hover:bg-rose-400 transition-all relative"
                    style={{ height: `${likesHeight}%` }}
                  />

                  {/* Comments bar */}
                  <div
                    className="w-3.5 sm:w-5 rounded-t-lg bg-purple-500/80 group-hover:bg-purple-400 transition-all relative"
                    style={{ height: `${commentsHeight}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{item.day}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
