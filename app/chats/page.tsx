'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  Lock,
  ArrowLeft,
  X,
  Brain,
  Trash2,
  Edit2,
  Copy,
  Check,
  CheckCheck,
  MessageSquare,
  Briefcase
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../lib/authContext';
import { VoiceMessagePlayer } from '../../components/VoiceMessagePlayer';
import { MediaAttachmentDrawer } from '../../components/MediaAttachmentDrawer';
import { ChatPrivacySettingsModal } from '../../components/ChatPrivacySettingsModal';
import { EmojiPicker } from '../../components/EmojiPicker';
import { VoiceRecorder } from '../../components/VoiceRecorder';
import { CallModal } from '../../components/CallModal';
import { callService } from '../../lib/services/callService';
import { aiMemoryService, MemoryEntry } from '../../lib/services/aiMemoryService';
import { messageService } from '../../lib/services/dataService';
import { audioHaptics } from '../../lib/audioHaptics';

interface Message {
  id: string;
  sender: 'me' | 'other';
  text?: string;
  type?: 'text' | 'voice' | 'image';
  voiceDuration?: string;
  voiceUrl?: string;
  imageUrl?: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  reaction?: string;
  replyTo?: { senderName: string; text: string };
}

export default function ChatsPage() {
  const { account, token } = useAuth();
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ senderName: string; text: string } | null>(null);
  const [selectedReactionMsgId, setSelectedReactionMsgId] = useState<string | null>(null);

  // Real data states
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modals & Panels
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isAiMemoryOpen, setIsAiMemoryOpen] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // AI Memory query & list
  const [memoryQuery, setMemoryQuery] = useState('');
  const [memoryResults, setMemoryResults] = useState<MemoryEntry[]>(aiMemoryService.getMemories());
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch Conversations and Message Thread from Supabase
  const fetchChatsAndMessages = async () => {
    try {
      const headers: any = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const chatsRes = await fetch("/api/chats", { headers });
      if (chatsRes.ok) {
        const chatsData = await chatsRes.json();
        setConversations(chatsData.chats || []);
      }

      if (activeChat) {
        const msgRes = await fetch(`/api/chats/messages?conversationId=${activeChat}`, { headers });
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          setMessages(msgData.messages || []);
        }
      }
    } catch (err) {
      console.warn("Fetch chat message error:", err);
    }
  };

  useEffect(() => {
    fetchChatsAndMessages();

    // Setup Supabase Realtime listener when activeChat changes
    if (activeChat) {
      const unsubscribe = messageService.subscribeToMessages(activeChat, (newMsg: any) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      });
      return () => unsubscribe();
    }
  }, [activeChat, token]);

  // Search Users on Aura Network
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const headers: any = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`/api/search?q=${searchQuery}`, { headers });
        if (res.ok) {
          const data = await res.json();
          const currentAddresses = conversations.map(c => c.otherAddress.toLowerCase());
          const filteredResults = (data.users || []).filter(
            (u: any) => u.walletAddress.toLowerCase() !== account?.toLowerCase() && !currentAddresses.includes(u.walletAddress.toLowerCase())
          );
          setSearchResults(filteredResults);
        }
      } catch (err) {
        console.warn("Search contacts error:", err);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, conversations, account, token]);

  const activeContact = conversations.find((c) => c.id === activeChat);

  const handleStartChat = async (targetAddress: string) => {
    try {
      setIsLoading(true);
      const headers: any = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/chats", {
        method: "POST",
        headers,
        body: JSON.stringify({ targetAddress })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start chat.");

      setActiveChat(data.conversationId);
      setSearchQuery("");
      setSearchResults([]);
    } catch (err: any) {
      alert(err.message || "Failed to start chat.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConversation = async () => {
    if (!activeChat || !confirm("Are you sure you want to delete this chat conversation?")) return;
    
    try {
      const headers: any = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/chats?conversationId=${activeChat}`, {
        method: "DELETE",
        headers
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete chat.");

      setActiveChat(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete chat.");
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeChat) return;

    if (editingMsgId) {
      setMessages((prev) =>
        prev.map((m) => (m.id === editingMsgId ? { ...m, text: inputText } : m))
      );
      setEditingMsgId(null);
      setInputText('');
      return;
    }

    try {
      audioHaptics.playSend();
      const headers: any = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/chats/messages", {
        method: "POST",
        headers,
        body: JSON.stringify({
          conversationId: activeChat,
          content: inputText.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send message.");

      setMessages((prev) => [...prev, data.message]);
      setInputText('');
      setReplyingTo(null);
      setIsEmojiOpen(false);
    } catch (err: any) {
      console.error(err);
    }
  };

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
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'read',
    };

    setMessages((prev) => [...prev, newMsg]);
    setIsRecordingVoice(false);
  };

  const handleAddReaction = (msgId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, reaction: emoji } : m))
    );
    setSelectedReactionMsgId(null);
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      const headers: any = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/chats/messages?messageId=${msgId}`, {
        method: "DELETE",
        headers
      });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
      }
    } catch (e) {
      console.warn("Failed to delete message:", e);
    }
    setSelectedReactionMsgId(null);
  };

  const handleCopyMessage = (msg: Message) => {
    if (msg.text) {
      navigator.clipboard.writeText(msg.text);
      setCopiedMsgId(msg.id);
      setTimeout(() => setCopiedMsgId(null), 2000);
    }
  };

  const filteredChats = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] glass-card rounded-[32px] border border-white/80 dark:border-white/10 overflow-hidden shadow-glass relative animate-fadeIn select-none">
      
      <CallModal />

      {/* IF CHAT SELECTED -> CONVERSATION VIEW */}
      {activeChat ? (
        <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
          
          {/* Header */}
          <div className="px-4 py-3 glass-panel border-b border-white/60 dark:border-white/10 flex items-center justify-between z-10 shrink-0">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setActiveChat(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white btn-tactile cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="relative">
                <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-[#00B7FF] to-[#7EDBE8]">
                  <img
                    src={activeContact?.avatar}
                    alt={activeContact?.name}
                    className="w-full h-full rounded-full object-cover bg-white dark:bg-slate-900"
                  />
                </div>
                {activeContact?.isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                )}
              </div>

              <div>
                <h3 className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-1">
                  <span>{activeContact?.name}</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00B7FF]" />
                </h3>
                <p className="text-[10px] text-emerald-500 font-bold">
                  {activeContact?.isOnline ? 'Online • Verified' : 'Last seen recently'}
                </p>
              </div>
            </div>

            {/* Header Call & Service Triggers */}
            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <button
                onClick={() => setIsAiMemoryOpen(true)}
                className="p-2 rounded-full glass-pill hover:bg-white/80 dark:hover:bg-slate-800 text-purple-400 btn-tactile cursor-pointer"
                title="AI Conversation Memory"
              >
                <Brain className="w-4 h-4" />
              </button>

              <Link
                href="/hiring?tab=deals"
                className="flex items-center gap-1 px-3 py-1.5 rounded-full glass-pill text-[#00B7FF] text-[11px] font-black cursor-pointer transition-colors btn-tactile"
                title="Collaboration Deal Room"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Deal Room</span>
              </Link>

              <button
                onClick={() => callService.startCall(activeContact?.name || 'Contact', activeContact?.avatar || '', 'voice')}
                className="p-2 rounded-full glass-pill text-[#00B7FF] btn-tactile cursor-pointer"
                title="Voice Call"
              >
                <Phone className="w-4 h-4" />
              </button>

              <button
                onClick={() => callService.startCall(activeContact?.name || 'Contact', activeContact?.avatar || '', 'video')}
                className="p-2 rounded-full glass-pill text-[#00B7FF] btn-tactile cursor-pointer"
                title="Video Call"
              >
                <Video className="w-4 h-4" />
              </button>

              <button
                onClick={handleDeleteConversation}
                className="p-2 rounded-full glass-pill text-rose-500 btn-tactile cursor-pointer"
                title="Delete Conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Thread */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 hide-scrollbar bg-slate-50/40 dark:bg-slate-900/30">
            {messages.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center text-center text-slate-400 font-bold text-xs space-y-2">
                <div className="w-12 h-12 rounded-2xl glass-panel flex items-center justify-center text-cyan-400">
                  <Brain className="w-6 h-6" />
                </div>
                <span className="text-slate-700 dark:text-slate-300 font-black">No messages in this chat yet.</span>
                <p className="text-[11px] text-slate-500 font-medium">Send a friendly greeting to start your conversation.</p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'me' ? 'items-end' : 'items-start'} relative group`}
              >
                {/* Reply Preview */}
                {msg.replyTo && (
                  <div className="text-[10px] glass-panel p-2 rounded-t-2xl border-l-2 border-[#00B7FF] max-w-[80%] text-slate-600 dark:text-slate-300 truncate">
                    <span className="font-bold text-[#00B7FF] block">{msg.replyTo.senderName}</span>
                    {msg.replyTo.text}
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  onClick={() => setSelectedReactionMsgId(selectedReactionMsgId === msg.id ? null : msg.id)}
                  className={`max-w-[84%] px-4 py-2.5 rounded-[22px] shadow-sm text-xs relative cursor-pointer font-medium ${
                    msg.sender === 'me'
                      ? 'bg-gradient-to-r from-[#00B7FF] to-[#38BDF8] text-slate-950 font-semibold rounded-br-sm'
                      : 'glass-card border border-white/80 dark:border-white/10 text-slate-800 dark:text-slate-100 rounded-bl-sm'
                  }`}
                >
                  {msg.type === 'voice' ? (
                    <VoiceMessagePlayer duration={msg.voiceDuration || '0:05'} isUser={msg.sender === 'me'} />
                  ) : (
                    <p className="leading-relaxed">{msg.text}</p>
                  )}

                  {/* Timestamp */}
                  <div className={`flex items-center justify-end gap-1.5 text-[9px] mt-1 ${
                    msg.sender === 'me' ? 'text-slate-800/80 font-bold' : 'text-slate-400 font-bold'
                  }`}>
                    <span>{msg.timestamp}</span>
                    {msg.sender === 'me' && <CheckCheck className="w-3 h-3 text-slate-950 stroke-[2.5]" />}
                  </div>

                  {msg.reaction && (
                    <div className="absolute -bottom-2 right-2 glass-pill rounded-full px-1.5 py-0.5 text-xs shadow-sm">
                      {msg.reaction}
                    </div>
                  )}
                </div>

                {selectedReactionMsgId === msg.id && (
                  <div className="flex items-center gap-1.5 p-1.5 rounded-full glass-panel shadow-lg mt-1 z-20 animate-fadeIn text-xs">
                    {['👍', '❤️', '🔥', '😂', '😮', '😢'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleAddReaction(msg.id, emoji)}
                        className="hover:scale-125 transition-transform cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                    <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-0.5" />
                    <button
                      onClick={() => setReplyingTo({ senderName: msg.sender === 'me' ? 'Me' : activeContact?.name || 'Contact', text: msg.text || '' })}
                      className="p-1 rounded-full text-slate-400 hover:text-[#00B7FF] cursor-pointer"
                      title="Reply"
                    >
                      <CornerUpLeft className="w-3.5 h-3.5" />
                    </button>
                    {msg.sender === 'me' && (
                      <button
                        onClick={() => {
                          setEditingMsgId(msg.id);
                          setInputText(msg.text || '');
                          setSelectedReactionMsgId(null);
                        }}
                        className="p-1 rounded-full text-slate-400 hover:text-cyan-500 cursor-pointer"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleCopyMessage(msg)}
                      className="p-1 rounded-full text-slate-400 hover:text-cyan-500 cursor-pointer"
                      title="Copy"
                    >
                      {copiedMsgId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="p-1 rounded-full text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply status bar */}
          {replyingTo && (
            <div className="px-4 py-2 glass-panel border-t border-white/60 dark:border-white/10 flex items-center justify-between animate-slideUp text-xs">
              <div className="truncate border-l-2 border-[#00B7FF] pl-2">
                <span className="font-bold text-[#00B7FF] text-[10px] block">Replying to {replyingTo.senderName}</span>
                <span className="text-slate-500 font-medium">{replyingTo.text}</span>
              </div>
              <button onClick={() => setReplyingTo(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
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
                className="p-2 rounded-full glass-pill text-slate-500 hover:text-[#00B7FF] btn-tactile cursor-pointer"
                title="Add Attachment"
              >
                <Plus className="w-4.5 h-4.5" />
              </button>

              <button
                onClick={() => setIsEmojiOpen(!isEmojiOpen)}
                className={`p-2 rounded-full glass-pill btn-tactile cursor-pointer ${
                  isEmojiOpen ? 'text-amber-500 bg-amber-500/10' : 'text-slate-500 hover:text-amber-500'
                }`}
                title="Emoji Picker"
              >
                <Smile className="w-4.5 h-4.5" />
              </button>

              <input
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
        <div className="flex-1 flex flex-col min-h-0 p-4 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search or enter user wallet..."
              className="w-full pl-10 pr-4 py-2.5 glass-input rounded-full text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 hide-scrollbar">
            {conversations.length === 0 && searchQuery.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center text-center text-slate-400 font-bold text-xs space-y-2">
                <div className="w-12 h-12 rounded-2xl glass-panel flex items-center justify-center text-cyan-400">
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
                className="p-3 rounded-2xl glass-card hover:bg-white/90 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between cursor-pointer border border-white/60 dark:border-white/10 btn-tactile"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-[#00B7FF] to-[#7EDBE8]">
                      <img src={chat.avatar} alt={chat.name} className="w-full h-full rounded-full object-cover bg-white dark:bg-slate-900" />
                    </div>
                    {chat.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#131b2e]" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1">
                      <span>{chat.name}</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-[#00B7FF]" />
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[160px] sm:max-w-xs">{chat.lastMessage}</p>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <span className="text-[9px] text-slate-400 font-extrabold font-mono">{chat.time}</span>
                  {chat.unread > 0 && (
                    <span className="w-5 h-5 rounded-full bg-[#00B7FF] text-slate-950 font-black text-[9px] flex items-center justify-center ml-auto shadow-sm">
                      {chat.unread}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Discover new users on Aura Network */}
            {searchResults.length > 0 && (
              <div className="pt-4 space-y-2">
                <div className="text-[10px] font-black text-[#00B7FF] uppercase tracking-wider px-1">
                  Network Search Results
                </div>
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleStartChat(user.walletAddress)}
                    className="p-3 rounded-2xl glass-card border border-cyan-500/20 hover:border-cyan-500/40 transition-colors flex items-center justify-between cursor-pointer btn-tactile"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-600 p-0.5">
                        <img 
                          src={user.profile?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"} 
                          alt={user.profile?.displayName || "User"} 
                          className="w-full h-full rounded-full object-cover bg-slate-900" 
                        />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white">
                          {user.profile?.displayName || "User"}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono">
                          @{user.profile?.username || user.walletAddress.slice(0, 10)}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-slate-950 bg-gradient-to-r from-[#00B7FF] to-[#7EDBE8] px-3.5 py-1.5 rounded-full uppercase shadow-sm">
                      Message
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DRAWER PANELS */}
      <MediaAttachmentDrawer isOpen={isAttachmentOpen} onClose={() => setIsAttachmentOpen(false)} onSelectOption={(type) => console.log('Attachment selected:', type)} />
      <ChatPrivacySettingsModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      
      {isEmojiOpen && (
        <div className="absolute bottom-16 left-4 z-30 animate-fadeIn">
          <EmojiPicker onSelectEmoji={(emoji) => setInputText(prev => prev + emoji)} onClose={() => setIsEmojiOpen(false)} />
        </div>
      )}

    </div>
  );
}
