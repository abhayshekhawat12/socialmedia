'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, 
  Send, 
  Mic, 
  Plus, 
  Smile, 
  Phone, 
  Video, 
  ShieldCheck, 
  CornerUpLeft, 
  ArrowLeft, 
  X, 
  Brain, 
  Trash2, 
  Copy, 
  Check, 
  CheckCheck, 
  MessageSquare, 
  Briefcase,
  AlertCircle,
  RotateCcw,
  MoreVertical
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../lib/authContext';
import { VoiceMessagePlayer } from '../../components/VoiceMessagePlayer';
import { MediaAttachmentDrawer } from '../../components/MediaAttachmentDrawer';
import { ChatPrivacySettingsModal } from '../../components/ChatPrivacySettingsModal';
import { EmojiPicker } from '../../components/EmojiPicker';
import { VoiceRecorder } from '../../components/VoiceRecorder';
import { callService } from '../../lib/services/callService';
import { aiMemoryService, MemoryEntry } from '../../lib/services/aiMemoryService';
import { messageService } from '../../lib/services/dataService';
import { audioHaptics } from '../../lib/audioHaptics';
import { appCache } from '../../lib/cache';

interface Message {
  id: string;
  sender: 'me' | 'other';
  senderAddress?: string;
  text?: string;
  type?: 'text' | 'voice' | 'image';
  voiceDuration?: string;
  voiceUrl?: string;
  imageUrl?: string;
  time?: string;
  timestamp: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  reaction?: string;
  replyTo?: { senderName: string; text: string };
  tempId?: string;
}

interface ChatContact {
  id: string;
  name: string;
  username: string;
  avatar: string;
  lastMessage: string;
  time: string;
  timestamp: string;
  unread: number;
  isOnline: boolean;
  isGroup: boolean;
  otherAddress: string;
}

export default function ChatsPage() {
  const { account, token, profile } = useAuth();
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ senderName: string; text: string } | null>(null);
  const [selectedMsgForMenu, setSelectedMsgForMenu] = useState<Message | null>(null);
  const [msgToDelete, setMsgToDelete] = useState<Message | null>(null);

  // Real data states
  const [conversations, setConversations] = useState<ChatContact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Modals & Drawers
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isAiMemoryOpen, setIsAiMemoryOpen] = useState(false);
  const [memoryQuery, setMemoryQuery] = useState('');
  const [memoryResults, setMemoryResults] = useState<MemoryEntry[]>(aiMemoryService.getMemories());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fast initial cached state restoration (0ms blank screen)
  useEffect(() => {
    if (!account) return;
    const cachedChats = appCache.get<ChatContact[]>(`chats_${account}`, true);
    if (cachedChats && cachedChats.length > 0) {
      setConversations(cachedChats);
    }
  }, [account]);

  // Load URL query params on initial mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const initialConvoId = urlParams.get('conversationId');
    const initialTargetAddress = urlParams.get('targetAddress');

    if (initialConvoId) {
      setActiveChat(initialConvoId);
    } else if (initialTargetAddress && account) {
      handleStartChat(initialTargetAddress);
    }
  }, [account]);

  // Fetch Conversations List with SWR (Stale-While-Revalidate)
  const fetchConversations = useCallback(async () => {
    if (!account) return;
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/chats?userAddress=${encodeURIComponent(account)}`, { headers });
      if (res.ok) {
        const data = await res.json();
        const chatList: ChatContact[] = data.chats || [];
        setConversations(chatList);
        appCache.set(`chats_${account}`, chatList, 60);

        if (!activeChat && chatList.length > 0 && typeof window !== 'undefined' && window.innerWidth >= 1024) {
          setActiveChat(chatList[0].id);
        }
      }
    } catch (err) {
      console.warn('Fetch conversations warning:', err);
    }
  }, [account, token, activeChat]);

  // Fetch Message Thread for active chat
  const fetchMessagesForActiveChat = useCallback(async (convoId: string, background = false) => {
    if (!account || !convoId) return;
    try {
      // If not background refresh, check cache first for instant render
      if (!background) {
        const cachedMsgs = appCache.get<Message[]>(`msgs_${convoId}`, true);
        if (cachedMsgs && cachedMsgs.length > 0) {
          setMessages(cachedMsgs);
        }
      }

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/chats/messages?conversationId=${encodeURIComponent(convoId)}&userAddress=${encodeURIComponent(account)}`, { headers });
      if (res.ok) {
        const data = await res.json();
        const freshMsgs: Message[] = (data.messages || []).map((m: any) => ({
          ...m,
          status: 'delivered',
        }));

        setMessages((prev) => {
          // Preserve optimistic pending messages
          const pending = prev.filter((p) => p.status === 'sending' || p.status === 'failed');
          const merged = [...freshMsgs];
          for (const p of pending) {
            if (!merged.some((m) => m.id === p.id || (p.tempId && m.id === p.tempId))) {
              merged.push(p);
            }
          }
          appCache.set(`msgs_${convoId}`, merged, 30);
          return merged;
        });
      }
    } catch (err) {
      console.warn('Fetch messages error:', err);
    }
  }, [account, token]);

  // Initial load and periodic fast background refresh
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!activeChat) return;

    fetchMessagesForActiveChat(activeChat, false);

    // Setup Supabase Realtime message subscription
    const unsubscribe = messageService.subscribeToMessages(activeChat, (newMsg: any) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id || (m.tempId && m.tempId === newMsg.id))) {
          return prev.map((m) => (m.id === newMsg.id || m.tempId === newMsg.id ? { ...m, ...newMsg, status: 'delivered' } : m));
        }
        audioHaptics.playReceive();
        const updated = [...prev, { ...newMsg, status: 'delivered' }];
        appCache.set(`msgs_${activeChat}`, updated, 30);
        return updated;
      });

      // Update conversation last message preview
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeChat
            ? { ...c, lastMessage: newMsg.text || 'New message', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), timestamp: new Date().toISOString() }
            : c
        )
      );
    });

    // 4s polling fallback for guaranteed message delivery
    const pollInterval = setInterval(() => {
      fetchMessagesForActiveChat(activeChat, true);
    }, 4000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [activeChat, fetchMessagesForActiveChat]);

  // Auto-scroll to bottom on messages change
  const scrollToBottom = useCallback((smooth = true) => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    });
  }, []);

  useEffect(() => {
    scrollToBottom(messages.length > 1);
  }, [messages.length, scrollToBottom]);

  // Contact search debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`, { headers });
        if (res.ok) {
          const data = await res.json();
          const existingAddresses = conversations.map((c) => c.otherAddress.toLowerCase());
          const filtered = (data.users || []).filter(
            (u: any) =>
              (u.walletAddress || u.id || '').toLowerCase() !== account?.toLowerCase() &&
              !existingAddresses.includes((u.walletAddress || u.id || '').toLowerCase())
          );
          setSearchResults(filtered);
        }
      } catch (err) {
        console.warn('Search contacts error:', err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, conversations, account, token]);

  const activeContact = useMemo(
    () => conversations.find((c) => c.id === activeChat),
    [conversations, activeChat]
  );

  // START NEW CHAT
  const handleStartChat = async (targetAddress: string) => {
    if (!account) return;
    try {
      setIsLoading(true);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/chats', {
        method: 'POST',
        headers,
        body: JSON.stringify({ targetAddress, userAddress: account }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start chat.');

      setActiveChat(data.conversationId);
      setSearchQuery('');
      setSearchResults([]);
      fetchConversations();
    } catch (err: any) {
      alert(err.message || 'Failed to start chat.');
    } finally {
      setIsLoading(false);
    }
  };

  // SEND MESSAGE (INSTANT OPTIMISTIC UI)
  const handleSendMessage = async () => {
    const textToSend = inputText.trim();
    if (!textToSend || !activeChat || !account) return;

    audioHaptics.playSend();

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const currentTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const currentIsoStr = new Date().toISOString();

    const optimisticMessage: Message = {
      id: tempId,
      tempId,
      sender: 'me',
      senderAddress: account,
      text: textToSend,
      type: 'text',
      time: currentTimeStr,
      timestamp: currentIsoStr,
      status: 'sending',
      replyTo: replyingTo || undefined,
    };

    // 1. Instantly display in UI (0ms perceived latency)
    setMessages((prev) => [...prev, optimisticMessage]);
    setInputText('');
    setReplyingTo(null);
    setIsEmojiOpen(false);
    scrollToBottom(true);

    // 2. Optimistically update chat list item
    setConversations((prev) => {
      const updated = prev.map((c) =>
        c.id === activeChat
          ? { ...c, lastMessage: textToSend, time: currentTimeStr, timestamp: currentIsoStr }
          : c
      );
      // Move active conversation to top
      const activeIdx = updated.findIndex((c) => c.id === activeChat);
      if (activeIdx > 0) {
        const [target] = updated.splice(activeIdx, 1);
        updated.unshift(target);
      }
      return updated;
    });

    // 3. Background Sync to Backend
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/chats/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          conversationId: activeChat,
          content: textToSend,
          userAddress: account,
        }),
      });

      const data = await res.json();
      if (res.ok && data.message) {
        // Replace optimistic message with confirmed database message
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId || m.tempId === tempId
              ? { ...data.message, status: 'delivered' }
              : m
          )
        );
      } else {
        // Mark as failed
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m))
        );
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m))
      );
    }
  };

  // RETRY FAILED MESSAGE
  const handleRetryMessage = async (failedMsg: Message) => {
    if (!failedMsg.text || !activeChat || !account) return;

    setMessages((prev) =>
      prev.map((m) => (m.id === failedMsg.id ? { ...m, status: 'sending' } : m))
    );

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/chats/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          conversationId: activeChat,
          content: failedMsg.text,
          userAddress: account,
        }),
      });

      const data = await res.json();
      if (res.ok && data.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === failedMsg.id ? { ...data.message, status: 'delivered' } : m))
        );
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.id === failedMsg.id ? { ...m, status: 'failed' } : m))
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === failedMsg.id ? { ...m, status: 'failed' } : m))
      );
    }
  };

  // DELETE MESSAGE (OPTIMISTIC + SYNC)
  const confirmDeleteMessage = async () => {
    if (!msgToDelete || !account) return;
    const targetId = msgToDelete.id;
    setMsgToDelete(null);
    setSelectedMsgForMenu(null);

    audioHaptics.playTap();

    // 1. Instantly remove from UI
    setMessages((prev) => prev.filter((m) => m.id !== targetId && m.tempId !== targetId));

    // 2. Background Sync
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/chats/messages?messageId=${encodeURIComponent(targetId)}&userAddress=${encodeURIComponent(account)}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        console.warn('Delete message backend sync failed');
      }
    } catch (err) {
      console.error('Delete message error:', err);
    }
  };

  // DELETE CONVERSATION
  const handleDeleteConversation = async () => {
    if (!activeChat || !account) return;
    if (!confirm('Are you sure you want to permanently delete this entire chat conversation?')) return;

    const deletingConvoId = activeChat;
    setActiveChat(null);
    setConversations((prev) => prev.filter((c) => c.id !== deletingConvoId));

    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch(`/api/chats?conversationId=${encodeURIComponent(deletingConvoId)}&userAddress=${encodeURIComponent(account)}`, {
        method: 'DELETE',
        headers,
      });
    } catch (err) {
      console.error('Delete conversation error:', err);
    }
  };

  // VOICE MESSAGE SEND
  const handleSendVoiceMessage = (audioUrl: string, durationSeconds: number) => {
    const mins = Math.floor(durationSeconds / 60);
    const secs = durationSeconds % 60;
    const durationStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

    const newMsg: Message = {
      id: `msg_voice_${Date.now()}`,
      sender: 'me',
      type: 'voice',
      voiceUrl: audioUrl,
      voiceDuration: durationStr,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: new Date().toISOString(),
      status: 'delivered',
    };

    setMessages((prev) => [...prev, newMsg]);
    setIsRecordingVoice(false);
    scrollToBottom(true);
  };

  const handleCopyMessage = (msg: Message) => {
    if (msg.text) {
      navigator.clipboard.writeText(msg.text);
      setCopiedMsgId(msg.id);
      setTimeout(() => setCopiedMsgId(null), 1800);
      setSelectedMsgForMenu(null);
    }
  };

  const handleReaction = (msgId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, reaction: m.reaction === emoji ? undefined : emoji } : m))
    );
    setSelectedMsgForMenu(null);
  };

  const filteredChats = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] glass-card rounded-[32px] border border-white/80 dark:border-white/10 overflow-hidden shadow-glass relative animate-fadeIn select-none">
      
      {/* DELETE CONFIRMATION DIALOG */}
      {msgToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xs rounded-3xl glass-card border border-white/20 p-5 text-center space-y-4 shadow-2xl bg-slate-900/90 text-white">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-black">Delete Message?</h4>
              <p className="text-xs text-slate-400 mt-1">This message will be removed from the conversation.</p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setMsgToDelete(null)}
                className="flex-1 py-2 rounded-full bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 btn-tactile cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteMessage}
                className="flex-1 py-2 rounded-full bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 shadow-md shadow-rose-500/30 btn-tactile cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE CONVERSATION VIEW */}
      {activeChat ? (
        <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
          
          {/* Top Chat Header */}
          <div className="px-4 py-3 glass-panel border-b border-white/60 dark:border-white/10 flex items-center justify-between z-10 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => setActiveChat(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white btn-tactile cursor-pointer"
                title="Back to Chats"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-[#00B7FF] to-[#7EDBE8]">
                  <img
                    src={activeContact?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${activeChat}`}
                    alt={activeContact?.name || 'User'}
                    className="w-full h-full rounded-full object-cover bg-white dark:bg-slate-900"
                  />
                </div>
                {activeContact?.isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                )}
              </div>

              <div className="min-w-0">
                <h3 className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-1 truncate">
                  <span className="truncate">{activeContact?.name || 'Pulse Member'}</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00B7FF] shrink-0" />
                </h3>
                <p className="text-[10px] text-emerald-500 font-bold truncate">
                  {activeContact?.isOnline ? 'Online • End-to-End Encrypted' : 'Last seen recently'}
                </p>
              </div>
            </div>

            {/* Header Audio/Video Calling & Actions */}
            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 shrink-0">
              <button
                onClick={() => setIsAiMemoryOpen(true)}
                className="p-2 rounded-full glass-pill hover:bg-white/80 dark:hover:bg-slate-800 text-purple-400 btn-tactile cursor-pointer"
                title="AI Conversation Memory"
              >
                <Brain className="w-4 h-4" />
              </button>

              <Link
                href="/hiring?tab=deals"
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full glass-pill text-[#00B7FF] text-[11px] font-black cursor-pointer transition-colors btn-tactile"
                title="Deal Room"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Deal Room</span>
              </Link>

              {/* Audio Call Trigger */}
              <button
                onClick={() => {
                  audioHaptics.playTap();
                  callService.startCall(
                    activeContact?.name || 'Pulse Member',
                    activeContact?.avatar || '',
                    'voice',
                    activeContact?.otherAddress || activeContact?.username || activeContact?.id
                  );
                }}
                className="p-2 rounded-full glass-pill text-[#00B7FF] hover:bg-cyan-500/10 btn-tactile cursor-pointer"
                title="Start Audio Call"
              >
                <Phone className="w-4 h-4" />
              </button>

              {/* Video Call Trigger */}
              <button
                onClick={() => {
                  audioHaptics.playTap();
                  callService.startCall(
                    activeContact?.name || 'Pulse Member',
                    activeContact?.avatar || '',
                    'video',
                    activeContact?.otherAddress || activeContact?.username || activeContact?.id
                  );
                }}
                className="p-2 rounded-full glass-pill text-[#00B7FF] hover:bg-cyan-500/10 btn-tactile cursor-pointer"
                title="Start Video Call"
              >
                <Video className="w-4 h-4" />
              </button>

              {/* Delete Entire Conversation */}
              <button
                onClick={handleDeleteConversation}
                className="p-2 rounded-full glass-pill text-rose-500 hover:bg-rose-500/10 btn-tactile cursor-pointer"
                title="Delete Conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Thread Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar bg-slate-50/40 dark:bg-slate-900/30">
            {messages.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center text-center text-slate-400 font-bold text-xs space-y-2 animate-fadeIn">
                <div className="w-12 h-12 rounded-2xl glass-panel flex items-center justify-center text-cyan-400 shadow-sm">
                  <Brain className="w-6 h-6" />
                </div>
                <span className="text-slate-700 dark:text-slate-300 font-black">Encrypted Chat Ready.</span>
                <p className="text-[11px] text-slate-500 font-medium">Send an instant greeting to start your conversation!</p>
              </div>
            )}

            {messages.map((msg) => {
              const isMe = msg.sender === 'me';
              const isMenuOpen = selectedMsgForMenu?.id === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} relative group`}
                >
                  {/* Reply Preview Header */}
                  {msg.replyTo && (
                    <div className="text-[10px] glass-panel p-2 rounded-t-2xl border-l-2 border-[#00B7FF] max-w-[80%] text-slate-600 dark:text-slate-300 truncate mb-[-4px]">
                      <span className="font-bold text-[#00B7FF] block">{msg.replyTo.senderName}</span>
                      {msg.replyTo.text}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    onClick={() => setSelectedMsgForMenu(isMenuOpen ? null : msg)}
                    className={`max-w-[84%] sm:max-w-[72%] px-4 py-2.5 rounded-[22px] shadow-sm text-xs relative cursor-pointer font-medium transition-all ${
                      isMe
                        ? 'bg-gradient-to-r from-[#00B7FF] to-[#38BDF8] text-slate-950 font-semibold rounded-br-sm'
                        : 'glass-card border border-white/80 dark:border-white/10 text-slate-800 dark:text-slate-100 rounded-bl-sm'
                    } ${msg.status === 'sending' ? 'opacity-85' : ''}`}
                  >
                    {msg.type === 'voice' ? (
                      <VoiceMessagePlayer duration={msg.voiceDuration || '0:05'} isUser={isMe} />
                    ) : (
                      <p className="leading-relaxed break-words">{msg.text}</p>
                    )}

                    {/* Timestamp & Delivery Indicator */}
                    <div
                      className={`flex items-center justify-end gap-1 text-[9px] mt-1 ${
                        isMe ? 'text-slate-800/80 font-bold' : 'text-slate-400 font-bold'
                      }`}
                    >
                      <span>{msg.time || new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isMe && (
                        <>
                          {msg.status === 'sending' && (
                            <span className="w-2 h-2 rounded-full border border-slate-900 border-t-transparent animate-spin ml-0.5" />
                          )}
                          {msg.status === 'failed' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRetryMessage(msg);
                              }}
                              className="text-rose-700 hover:text-rose-900 font-extrabold flex items-center gap-0.5"
                              title="Failed to send. Tap to retry"
                            >
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              <RotateCcw className="w-2.5 h-2.5" />
                            </button>
                          )}
                          {msg.status !== 'sending' && msg.status !== 'failed' && (
                            <CheckCheck className="w-3 h-3 text-slate-950 stroke-[2.5]" />
                          )}
                        </>
                      )}
                    </div>

                    {/* Reaction Pill */}
                    {msg.reaction && (
                      <div className="absolute -bottom-2 right-2 glass-pill rounded-full px-1.5 py-0.5 text-xs shadow-sm bg-white/90 dark:bg-slate-800">
                        {msg.reaction}
                      </div>
                    )}
                  </div>

                  {/* Context Actions Menu (Pop-up on tap) */}
                  {isMenuOpen && (
                    <div className="flex items-center gap-1.5 p-1.5 rounded-full glass-panel shadow-xl mt-1 z-20 animate-fadeIn text-xs bg-slate-900/90 text-white border border-white/20">
                      {['❤️', '👍', '🔥', '😂', '😮'].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(msg.id, emoji)}
                          className="hover:scale-125 transition-transform cursor-pointer px-1"
                        >
                          {emoji}
                        </button>
                      ))}
                      <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

                      {/* Reply Button */}
                      <button
                        onClick={() => {
                          setReplyingTo({
                            senderName: isMe ? 'You' : activeContact?.name || 'Contact',
                            text: msg.text || '',
                          });
                          setSelectedMsgForMenu(null);
                          inputRef.current?.focus();
                        }}
                        className="p-1 rounded-full text-slate-400 hover:text-[#00B7FF] cursor-pointer"
                        title="Reply"
                      >
                        <CornerUpLeft className="w-3.5 h-3.5" />
                      </button>

                      {/* Copy Button */}
                      <button
                        onClick={() => handleCopyMessage(msg)}
                        className="p-1 rounded-full text-slate-400 hover:text-cyan-400 cursor-pointer"
                        title="Copy text"
                      >
                        {copiedMsgId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Delete Button (Allowed for own messages) */}
                      {isMe && (
                        <button
                          onClick={() => setMsgToDelete(msg)}
                          className="p-1 rounded-full text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                          title="Delete message"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Preview status bar */}
          {replyingTo && (
            <div className="px-4 py-2 glass-panel border-t border-white/60 dark:border-white/10 flex items-center justify-between animate-slideUp text-xs bg-slate-100/80 dark:bg-slate-900/80">
              <div className="truncate border-l-2 border-[#00B7FF] pl-2">
                <span className="font-bold text-[#00B7FF] text-[10px] block">Replying to {replyingTo.senderName}</span>
                <span className="text-slate-500 dark:text-slate-300 font-medium truncate">{replyingTo.text}</span>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Voice recorder or Input composer */}
          {isRecordingVoice ? (
            <div className="px-4 py-3 glass-panel border-t border-white/60 dark:border-white/10">
              <VoiceRecorder onSendVoiceMessage={handleSendVoiceMessage} onCancel={() => setIsRecordingVoice(false)} />
            </div>
          ) : (
            <div className="px-4 py-3 glass-panel border-t border-white/60 dark:border-white/10 flex items-center gap-2 z-10 shrink-0">
              <button
                onClick={() => setIsAttachmentOpen(true)}
                className="p-2 rounded-full glass-pill text-slate-500 hover:text-[#00B7FF] btn-tactile cursor-pointer shrink-0"
                title="Add Attachment"
              >
                <Plus className="w-4.5 h-4.5" />
              </button>

              <button
                onClick={() => setIsEmojiOpen(!isEmojiOpen)}
                className={`p-2 rounded-full glass-pill btn-tactile cursor-pointer shrink-0 ${
                  isEmojiOpen ? 'text-amber-500 bg-amber-500/10' : 'text-slate-500 hover:text-amber-500'
                }`}
                title="Emoji Picker"
              >
                <Smile className="w-4.5 h-4.5" />
              </button>

              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type a message..."
                className="flex-1 glass-input rounded-full px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none"
              />

              {inputText.trim() ? (
                <button
                  onClick={handleSendMessage}
                  className="w-10 h-10 rounded-full bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] text-slate-950 flex items-center justify-center shadow-md shadow-cyan-500/25 btn-tactile shrink-0 cursor-pointer"
                  title="Send message"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              ) : (
                <button
                  onClick={() => setIsRecordingVoice(true)}
                  className="w-10 h-10 rounded-full glass-pill text-slate-600 dark:text-slate-300 flex items-center justify-center hover:text-[#00B7FF] btn-tactile shrink-0 cursor-pointer"
                  title="Record Voice Message"
                >
                  <Mic className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

        </div>
      ) : (
        /* CHAT CONVERSATIONS LIST VIEW */
        <div className="flex-1 flex flex-col min-h-0 p-4 space-y-3">
          
          {/* Top Search Bar */}
          <div className="relative shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats or find users by username..."
              className="w-full pl-10 pr-4 py-2.5 glass-input rounded-full text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Conversation List Scrollable */}
          <div className="flex-1 overflow-y-auto space-y-2 hide-scrollbar">
            {conversations.length === 0 && searchQuery.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center text-center text-slate-400 font-bold text-xs space-y-2 animate-fadeIn">
                <div className="w-12 h-12 rounded-2xl glass-panel flex items-center justify-center text-cyan-400 shadow-sm">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <span className="text-slate-700 dark:text-slate-300 font-black">Your inbox is clean & quiet.</span>
                <p className="text-[11px] text-slate-500 font-medium">Search a user by username or address to start chatting!</p>
              </div>
            )}

            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setActiveChat(chat.id)}
                className="p-3 rounded-2xl glass-card hover:bg-white/90 dark:hover:bg-slate-800/80 transition-all flex items-center justify-between cursor-pointer border border-white/60 dark:border-white/10 btn-tactile"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-[#00B7FF] to-[#7EDBE8]">
                      <img src={chat.avatar} alt={chat.name} className="w-full h-full rounded-full object-cover bg-white dark:bg-slate-900" />
                    </div>
                    {chat.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#131b2e]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1 truncate">
                      <span className="truncate">{chat.name}</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-[#00B7FF] shrink-0" />
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[180px] sm:max-w-xs">
                      {chat.lastMessage}
                    </p>
                  </div>
                </div>
                <div className="text-right space-y-1 shrink-0">
                  <span className="text-[9px] text-slate-400 font-extrabold font-mono">{chat.time}</span>
                  {chat.unread > 0 && (
                    <span className="w-5 h-5 rounded-full bg-[#00B7FF] text-slate-950 font-black text-[9px] flex items-center justify-center ml-auto shadow-sm">
                      {chat.unread}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Discover new users on Network */}
            {searchResults.length > 0 && (
              <div className="pt-3 space-y-2">
                <div className="text-[10px] font-black text-[#00B7FF] uppercase tracking-wider px-1">
                  Network Search Results
                </div>
                {searchResults.map((user) => (
                  <div
                    key={user.id || user.walletAddress}
                    onClick={() => handleStartChat(user.walletAddress || user.id)}
                    className="p-3 rounded-2xl glass-card border border-cyan-500/20 hover:border-cyan-500/40 transition-all flex items-center justify-between cursor-pointer btn-tactile"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-600 p-0.5 shrink-0">
                        <img 
                          src={user.profile?.avatarUrl || user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`} 
                          alt={user.profile?.displayName || 'User'} 
                          className="w-full h-full rounded-full object-cover bg-slate-900" 
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {user.profile?.displayName || user.displayName || 'Pulse Creator'}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono truncate">
                          @{user.profile?.username || user.username || (user.walletAddress && user.walletAddress.slice(0, 10))}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-slate-950 bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] px-3.5 py-1.5 rounded-full uppercase shadow-sm shrink-0">
                      Message
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DRAWERS & FLOATING PICKERS */}
      <MediaAttachmentDrawer
        isOpen={isAttachmentOpen}
        onClose={() => setIsAttachmentOpen(false)}
        onSelectOption={(type) => console.log('Attachment selected:', type)}
      />
      
      <ChatPrivacySettingsModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />
      
      {isEmojiOpen && (
        <div className="absolute bottom-16 left-4 z-30 animate-fadeIn">
          <EmojiPicker
            onSelectEmoji={(emoji) => setInputText((prev) => prev + emoji)}
            onClose={() => setIsEmojiOpen(false)}
          />
        </div>
      )}

    </div>
  );
}
