'use client';

import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../../lib/web3Context';
import { trustGraphService, GraphNode } from '../../lib/services/trustGraphService';
import {
  Globe,
  Plus,
  Flame,
  Clock,
  Users,
  Search,
  MessageSquare,
  Share2,
  Bookmark,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Award,
  ShieldCheck,
  X,
  Vote,
  Link2,
  HelpCircle,
  Brain,
  UserPlus,
  Network
} from 'lucide-react';

interface PostItem {
  id: string;
  author: {
    name: string;
    username: string;
    avatar: string;
    reputationScore: number;
    level: string;
  };
  time: string;
  topic: string;
  type: 'text' | 'image' | 'link' | 'question' | 'poll';
  title: string;
  content: string;
  imageUrl?: string;
  linkUrl?: string;
  pollOptions?: { id: string; option: string; votes: number }[];
  upvotes: number;
  commentsCount: number;
  saved: boolean;
  userVote?: 'up' | 'down';
  comments: {
    id: string;
    author: string;
    avatar: string;
    text: string;
    time: string;
    likes: number;
    replies?: { id: string; author: string; avatar: string; text: string; time: string }[];
  }[];
}

export default function CommunityPage() {
  const { account } = useWeb3();
  const [activeTab, setActiveTab] = useState<'feed' | 'graph' | 'people' | 'reputation'>('feed');
  const [feedFilter, setFeedFilter] = useState<'forYou' | 'trending' | 'latest' | 'following'>('forYou');
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Drawers
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activePostIdForComments, setActivePostIdForComments] = useState<string | null>(null);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  // New Post Form
  const [postType, setPostType] = useState<'text' | 'image' | 'link' | 'question' | 'poll'>('text');
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postTopic, setPostTopic] = useState('Web3 & AI');
  const [pollOpt1, setPollOpt1] = useState('');
  const [pollOpt2, setPollOpt2] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  // TrustGraph Nodes
  const [graphNodes] = useState<GraphNode[]>(trustGraphService.getNodes());
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const fetchPosts = async () => {
    try {
      const res = await fetch(`/api/community?filter=${feedFilter}&search=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [feedFilter, searchQuery]);

  const handleUpvote = (postId: string) => {
    setPosts(prev =>
      prev.map(p => {
        if (p.id === postId) {
          const isUp = p.userVote === 'up';
          return {
            ...p,
            upvotes: isUp ? p.upvotes - 1 : p.upvotes + 1,
            userVote: isUp ? undefined : 'up',
          };
        }
        return p;
      })
    );
  };

  const handleDownvote = (postId: string) => {
    setPosts(prev =>
      prev.map(p => {
        if (p.id === postId) {
          const isDown = p.userVote === 'down';
          return {
            ...p,
            upvotes: isDown ? p.upvotes + 1 : p.upvotes - 1,
            userVote: isDown ? undefined : 'down',
          };
        }
        return p;
      })
    );
  };

  const handleVotePoll = (postId: string, optionId: string) => {
    setPosts(prev =>
      prev.map(p => {
        if (p.id === postId && p.pollOptions) {
          return {
            ...p,
            pollOptions: p.pollOptions.map(opt =>
              opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
            ),
          };
        }
        return p;
      })
    );
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim()) return;

    try {
      setIsPublishing(true);
      const pollOpts = postType === 'poll' && pollOpt1 && pollOpt2 ? [pollOpt1, pollOpt2] : undefined;

      const res = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: account ? `Creator ${account.slice(0, 6)}` : 'Abhay',
          username: account ? `@${account.slice(2, 8)}` : '@abhay',
          topic: postTopic,
          type: postType,
          title: postTitle,
          content: postContent,
          pollOptions: pollOpts,
        }),
      });

      if (res.ok) {
        await fetchPosts();
        setIsCreateOpen(false);
        setPostTitle('');
        setPostContent('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleAddComment = (postId: string, text: string) => {
    if (!text.trim()) return;
    setPosts(prev =>
      prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            commentsCount: p.commentsCount + 1,
            comments: [
              ...p.comments,
              {
                id: `c_${Date.now()}`,
                author: account ? `creator_${account.slice(2, 8)}` : 'Abhay',
                avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
                text,
                time: 'Just now',
                likes: 0,
              },
            ],
          };
        }
        return p;
      })
    );
    setReplyTextMap(prev => ({ ...prev, [postId]: '' }));
  };

  return (
    <div className="space-y-4 pb-16 text-left">
      
      {/* Community Top Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-2xl bg-gradient-to-tr from-[#00B7FF] to-purple-600 text-white shadow-md">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>TrustGraph Community</span>
              <ShieldCheck className="w-4 h-4 text-[#00B7FF]" />
            </h1>
            <p className="text-[10px] text-slate-400 font-bold">Knowledge Network & Discussions</p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#00B7FF] to-purple-600 text-white font-extrabold text-xs shadow-md hover:scale-105 transition-transform"
        >
          <Plus className="w-4 h-4" />
          <span>Post</span>
        </button>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl text-xs font-extrabold">
        <button
          onClick={() => setActiveTab('feed')}
          className={`flex-1 py-1.5 rounded-xl transition-colors ${activeTab === 'feed' ? 'bg-[#00B7FF] text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}
        >
          Discussions
        </button>
        <button
          onClick={() => setActiveTab('graph')}
          className={`flex-1 py-1.5 rounded-xl transition-colors flex items-center justify-center gap-1 ${activeTab === 'graph' ? 'bg-[#00B7FF] text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}
        >
          <Network className="w-3.5 h-3.5" />
          <span>Knowledge Graph</span>
        </button>
        <button
          onClick={() => setActiveTab('people')}
          className={`flex-1 py-1.5 rounded-xl transition-colors flex items-center justify-center gap-1 ${activeTab === 'people' ? 'bg-[#00B7FF] text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Find People</span>
        </button>
      </div>

      {/* TAB 1: COMMUNITY DISCUSSIONS FEED */}
      {activeTab === 'feed' && (
        <div className="space-y-4">
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search posts, topics, users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 text-xs font-semibold focus:outline-none focus:border-[#00B7FF]"
            />
          </div>

          {/* Feed Filters */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar text-xs font-extrabold px-1">
            {[
              { id: 'forYou', label: 'For You' },
              { id: 'trending', label: '🔥 Trending' },
              { id: 'latest', label: '⚡ Latest' },
              { id: 'following', label: 'Following' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFeedFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-full shrink-0 border transition-all ${
                  feedFilter === f.id
                    ? 'bg-[#00B7FF]/10 border-[#00B7FF] text-[#00B7FF]'
                    : 'bg-white dark:bg-[#131b2e] border-slate-200 dark:border-slate-800 text-slate-500'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Posts List */}
          <div className="space-y-3">
            {posts.map((post) => {
              const totalPollVotes = post.pollOptions?.reduce((acc, o) => acc + o.votes, 0) || 1;

              return (
                <div key={post.id} className="p-4 rounded-3xl bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800 space-y-3 shadow-xs">
                  
                  {/* Post Author Bar */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      <img src={post.author.avatar} alt={post.author.name} className="w-9 h-9 rounded-full object-cover border border-[#00B7FF]" />
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900 dark:text-white">
                          <span>{post.author.name}</span>
                          <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 text-[9px] border border-amber-500/30">
                            ⭐ {post.author.reputationScore} • {post.author.level}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-2">
                          <span>{post.author.username}</span>
                          <span>•</span>
                          <span>{post.time}</span>
                        </div>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full bg-[#00B7FF]/10 text-[#00B7FF] text-[10px] font-bold">
                      #{post.topic}
                    </span>
                  </div>

                  {/* Post Content */}
                  <div className="space-y-1.5">
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{post.title}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">{post.content}</p>
                  </div>

                  {/* Poll Option component */}
                  {post.type === 'poll' && post.pollOptions && (
                    <div className="space-y-2 pt-1">
                      {post.pollOptions.map((opt) => {
                        const pct = Math.round((opt.votes / totalPollVotes) * 100);
                        return (
                          <button
                            key={opt.id}
                            onClick={() => handleVotePoll(post.id, opt.id)}
                            className="w-full p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-left relative overflow-hidden group transition-all"
                          >
                            <div
                              style={{ width: `${pct}%` }}
                              className="absolute left-0 top-0 bottom-0 bg-[#00B7FF]/20 group-hover:bg-[#00B7FF]/30 transition-all"
                            />
                            <div className="relative flex justify-between font-bold text-slate-800 dark:text-slate-200">
                              <span>{opt.option}</span>
                              <span className="text-[#00B7FF] font-mono">{pct}% ({opt.votes})</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 font-extrabold">
                    {/* Upvote / Downvote Pill */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 rounded-full px-2 py-1">
                      <button
                        onClick={() => handleUpvote(post.id)}
                        className={`p-1 hover:text-[#00B7FF] ${post.userVote === 'up' ? 'text-[#00B7FF]' : ''}`}
                      >
                        <ChevronUp className="w-4 h-4 stroke-[3]" />
                      </button>
                      <span className="font-mono text-slate-900 dark:text-white px-1">{post.upvotes}</span>
                      <button
                        onClick={() => handleDownvote(post.id)}
                        className={`p-1 hover:text-rose-500 ${post.userVote === 'down' ? 'text-rose-500' : ''}`}
                      >
                        <ChevronDown className="w-4 h-4 stroke-[3]" />
                      </button>
                    </div>

                    {/* Comments Toggle */}
                    <button
                      onClick={() => setActivePostIdForComments(activePostIdForComments === post.id ? null : post.id)}
                      className="flex items-center gap-1.5 hover:text-[#00B7FF]"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>{post.commentsCount} Comments</span>
                    </button>

                    <button className="flex items-center gap-1.5 hover:text-purple-400">
                      <Share2 className="w-4 h-4" />
                      <span>Share</span>
                    </button>
                  </div>

                  {/* Threaded Comments Section */}
                  {activePostIdForComments === post.id && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-in fade-in">
                      <div className="space-y-2">
                        {post.comments.map(c => (
                          <div key={c.id} className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-[#00B7FF]">{c.author}</span>
                              <span className="text-[9px] text-slate-400">{c.time}</span>
                            </div>
                            <p className="text-xs text-slate-800 dark:text-slate-200">{c.text}</p>
                            
                            {/* Nested Reply */}
                            {c.replies?.map(r => (
                              <div key={r.id} className="ml-3 pl-2 border-l-2 border-[#00B7FF] mt-1 pt-1 space-y-0.5 text-[11px]">
                                <span className="font-bold text-purple-400">{r.author}</span>
                                <p className="text-slate-300">{r.text}</p>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>

                      {/* Comment Input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Write a community comment..."
                          value={replyTextMap[post.id] || ''}
                          onChange={(e) => setReplyTextMap(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id, replyTextMap[post.id] || '')}
                          className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#00B7FF]"
                        />
                        <button
                          onClick={() => handleAddComment(post.id, replyTextMap[post.id] || '')}
                          className="px-3 py-2 rounded-xl bg-[#00B7FF] text-slate-950 font-bold text-xs"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* TAB 2: TRUSTGRAPH VISUAL KNOWLEDGE NETWORK */}
      {activeTab === 'graph' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-gradient-to-r from-cyan-950/60 to-purple-950/60 border border-[#00B7FF]/30 space-y-2">
            <div className="flex items-center gap-2 text-[#00B7FF] font-extrabold text-sm">
              <Network className="w-5 h-5" />
              <span>TrustGraph Knowledge Network</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Interactive node graph connecting topics, contributors, and verified blockchain discussions. Click nodes to filter related content.
            </p>
          </div>

          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 min-h-[320px] flex flex-col justify-between relative overflow-hidden">
            <div className="grid grid-cols-2 gap-2">
              {graphNodes.map(node => (
                <button
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    selectedNode?.id === node.id
                      ? 'bg-[#00B7FF]/20 border-[#00B7FF] text-[#00B7FF]'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="font-extrabold text-xs flex justify-between items-center">
                    <span>{node.label}</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono">
                      {node.type}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">{node.connectionsCount} Network Connections</div>
                </button>
              ))}
            </div>

            {selectedNode && (
              <div className="mt-3 p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-left space-y-1 animate-in fade-in">
                <div className="font-extrabold text-[#00B7FF]">Connected Node: {selectedNode.label}</div>
                <p className="text-slate-300 text-[11px]">
                  Connected to 4 discussions, 3 verified contributors, and 2 proof hash records.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: AI PEOPLE DISCOVERY ("FIND MY PEOPLE") */}
      {activeTab === 'people' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-gradient-to-r from-purple-950/60 to-cyan-950/60 border border-purple-500/30 space-y-2">
            <div className="flex items-center gap-2 text-purple-400 font-extrabold text-sm">
              <UserPlus className="w-5 h-5" />
              <span>🤝 Find My People (AI Matching)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Recommended creators and contributors based on your followed topics, skills, and contribution areas.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                name: 'Rahul Sharma',
                username: '@rahul_s',
                avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
                commonTopics: 'Web3 & AI, Smart Contracts',
                reputationScore: 185,
                level: 'Expert',
              },
              {
                name: 'Sarah Jenkins',
                username: '@sarah_j',
                avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                commonTopics: 'UX Architecture, MetaMask',
                reputationScore: 160,
                level: 'Trusted Contributor',
              },
            ].map((person, idx) => (
              <div key={idx} className="p-4 rounded-3xl bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800 flex justify-between items-center shadow-xs">
                <div className="flex items-center gap-3">
                  <img src={person.avatar} alt={person.name} className="w-10 h-10 rounded-full object-cover border border-[#00B7FF]" />
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1">
                      <span>{person.name}</span>
                      <span className="text-[10px] text-amber-400 font-bold">⭐ {person.reputationScore}</span>
                    </h4>
                    <p className="text-[10px] text-slate-400 font-semibold">{person.commonTopics}</p>
                  </div>
                </div>

                <button className="px-3 py-1.5 rounded-full bg-[#00B7FF] text-slate-950 font-extrabold text-xs hover:scale-105 transition-transform">
                  Connect
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE POST MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-[#131b2e] border border-slate-800 p-6 text-left space-y-4 text-xs text-white relative">
            <button onClick={() => setIsCreateOpen(false)} className="absolute top-5 right-5 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#00B7FF]" />
              <span>Create Community Post</span>
            </h3>

            {/* Post Type Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPostType('text')}
                className={`p-2 rounded-xl border font-bold text-center ${postType === 'text' ? 'bg-[#00B7FF]/20 border-[#00B7FF] text-[#00B7FF]' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
              >
                Text
              </button>
              <button
                type="button"
                onClick={() => setPostType('poll')}
                className={`p-2 rounded-xl border font-bold text-center ${postType === 'poll' ? 'bg-[#00B7FF]/20 border-[#00B7FF] text-[#00B7FF]' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
              >
                Poll
              </button>
              <button
                type="button"
                onClick={() => setPostType('question')}
                className={`p-2 rounded-xl border font-bold text-center ${postType === 'question' ? 'bg-[#00B7FF]/20 border-[#00B7FF] text-[#00B7FF]' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
              >
                Question
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  placeholder="Discussion Title..."
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold focus:outline-none focus:border-[#00B7FF]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Content</label>
                <textarea
                  rows={3}
                  placeholder="Share details, arguments or questions..."
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold focus:outline-none focus:border-[#00B7FF]"
                />
              </div>

              {postType === 'poll' && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Poll Option 1"
                    value={pollOpt1}
                    onChange={(e) => setPollOpt1(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                  />
                  <input
                    type="text"
                    placeholder="Poll Option 2"
                    value={pollOpt2}
                    onChange={(e) => setPollOpt2(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isPublishing}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#00B7FF] to-purple-600 text-white font-extrabold text-xs shadow-lg hover:opacity-90 transition-opacity mt-2"
              >
                {isPublishing ? 'Publishing...' : 'Publish Post 🚀'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
