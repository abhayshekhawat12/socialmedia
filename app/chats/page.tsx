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
  Pin, 
  CheckCheck, 
  CornerUpLeft, 
  Lock,
  ArrowLeft,
  X,
  Key,
  Brain,
  Trash2,
  Edit2,
  Copy,
  Check,
  AlertTriangle,
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
  const { account } = useAuth();
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
  const [verificationResult, setVerificationResult] = useState<{ msgId: string; text: string; isAuthentic: boolean } | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // AI Memory query & list
  const [memoryQuery, setMemoryQuery] = useState('');
  const [memoryResults, setMemoryResults] = useState<MemoryEntry[]>(aiMemoryService.getMemories());
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Polling Effect for Conversations list and Message Thread (every 1 second)
  useEffect(() => {
    const savedToken = localStorage.getItem("block_social_jwt");
    if (!savedToken) return;

    const fetchChatsAndMessages = async () => {
      try {
        // A. Fetch conversation member lists
        const chatsRes = await fetch("/api/chats", {
          headers: { "Authorization": `Bearer ${savedToken}` }
        });
        if (chatsRes.ok) {
          const chatsData = await chatsRes.json();
          setConversations(chatsData.chats || []);
        }

        // B. Fetch messages list if a chat is actively selected
        if (activeChat) {
          const msgRes = await fetch(`/api/chats/messages?conversationId=${activeChat}`, {
            headers: { "Authorization": `Bearer ${savedToken}` }
          });
          if (msgRes.ok) {
            const msgData = await msgRes.json();
            setMessages(msgData.messages || []);
          }
        }
      } catch (err) {
        console.warn("Polling chat message error:", err);
      }
    };

    fetchChatsAndMessages();
    
    // Adaptive Polling: pause if browser tab is backgrounded
    const intervalMs = 3000;
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        fetchChatsAndMessages();
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [activeChat]);

  // 2. Search Users on Aura Network (Debounced)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const savedToken = localStorage.getItem("block_social_jwt");
        const res = await fetch(`/api/search?q=${searchQuery}`, {
          headers: { "Authorization": `Bearer ${savedToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          // Filter out users that we already have a conversation with and ourselves
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
  }, [searchQuery, conversations, account]);

  const activeContact = conversations.find((c) => c.id === activeChat);

  // Initialize/start conversation with a user
  const handleStartChat = async (targetAddress: string) => {
    const savedToken = localStorage.getItem("block_social_jwt");
    if (!savedToken) return;

    try {
      setIsLoading(true);
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${savedToken}`
        },
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

  // Delete/leave a conversation
  const handleDeleteConversation = async () => {
    if (!activeChat || !confirm("Are you sure you want to delete this chat conversation?")) return;
    
    const savedToken = localStorage.getItem("block_social_jwt");
    if (!savedToken) return;

    try {
      const res = await fetch(`/api/chats?conversationId=${activeChat}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${savedToken}` }
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

    const savedToken = localStorage.getItem("block_social_jwt");
    if (!savedToken) return;

    if (editingMsgId) {
      // Offline/local edit bypass representation
      setMessages((prev) =>
        prev.map((m) => (m.id === editingMsgId ? { ...m, text: inputText } : m))
      );
      setEditingMsgId(null);
      setInputText('');
      return;
    }

    try {
      const res = await fetch("/api/chats/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${savedToken}`
        },
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
    const savedToken = localStorage.getItem("block_social_jwt");
    if (!savedToken) return;

    try {
      const res = await fetch(`/api/chats/messages?messageId=${msgId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${savedToken}` }
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

  const handleQueryMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memoryQuery.trim()) return;
    const answer = aiMemoryService.queryAiMemory(memoryQuery);
    setAiAnswer(answer);
    setMemoryResults(aiMemoryService.searchMemory(memoryQuery));
  };

  // Filter conversations matching search query
  const filteredChats = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white dark:bg-[#131b2e] rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm relative">
      
      <CallModal />

      {/* IF CHAT SELECTED -> CONVERSATION VIEW */}
      {activeChat ? (
        <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
          
          {/* Header */}
          <div className="px-3 py-2.5 bg-white/95 dark:bg-[#131b2e]/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 flex items-center justify-between z-10 shrink-0">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setActiveChat(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="relative">
                <img
                  src={activeContact?.avatar}
                  alt={activeContact?.name}
                  className="w-9 h-9 rounded-full object-cover border border-[#00B7FF]"
                />
                {activeContact?.isOnline && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#131b2e]" />
                )}
              </div>

              <div>
                <h3 className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1">
                  <span>{activeContact?.name}</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00B7FF]" />
                </h3>
                <p className="text-[9.5px] text-emerald-500 font-bold">
                  {activeContact?.isOnline ? 'Online • TrustGraph Verified' : 'Last seen today at 09:30 AM'}
                </p>
              </div>
            </div>

            {/* Header Call & Service Triggers */}
            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <button
                onClick={() => setIsAiMemoryOpen(true)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-purple-400"
                title="🧠 AI Conversation Memory"
              >
                <Brain className="w-4 h-4" />
              </button>

              <Link
                href="/hiring?tab=deals"
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00B7FF] text-[11px] font-black cursor-pointer transition-colors"
                title="Open Collaboration Deal Room"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Deal Room</span>
              </Link>

              <button
                onClick={() => callService.startCall(activeContact?.name || 'Contact', activeContact?.avatar || '', 'voice')}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-[#00B7FF]"
                title="📞 Voice Call"
              >
                <Phone className="w-4 h-4" />
              </button>

              <button
                onClick={() => callService.startCall(activeContact?.name || 'Contact', activeContact?.avatar || '', 'video')}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-[#00B7FF]"
                title="🎥 Video Call"
              >
                <Video className="w-4 h-4" />
              </button>

              <button
                onClick={handleDeleteConversation}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-500"
                title="Delete Conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsPrivacyOpen(true)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-[#00B7FF]"
                title="Privacy Settings"
              >
                <Lock className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Thread */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-[#F5F7FA]/60 dark:bg-slate-900/40">
            
            {messages.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center text-center text-slate-400 font-bold text-xs space-y-1">
                <Brain className="w-8 h-8 text-cyan-500 opacity-60" />
                <span>No messages in this chat yet.</span>
                <p className="text-[10px] text-slate-500 font-medium">Send a message to start conversation.</p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'me' ? 'items-end' : 'items-start'} relative group`}
              >
                {/* Reply Preview */}
                {msg.replyTo && (
                  <div className="text-[10px] bg-slate-200/80 dark:bg-slate-800/80 p-2 rounded-t-xl border-l-2 border-[#00B7FF] max-w-[80%] text-slate-600 dark:text-slate-300 truncate">
                    <span className="font-bold text-[#00B7FF] block">{msg.replyTo.senderName}</span>
                    {msg.replyTo.text}
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  onClick={() => setSelectedReactionMsgId(selectedReactionMsgId === msg.id ? null : msg.id)}
                  className={`max-w-[84%] px-4 py-2.5 rounded-2xl shadow-xs text-xs relative cursor-pointer ${
                    msg.sender === 'me'
                      ? 'bg-[#00B7FF] text-white rounded-br-none'
                      : 'bg-white dark:bg-[#131b2e] border border-slate-200/70 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none'
                  }`}
                >
                  {msg.type === 'voice' ? (
                    <VoiceMessagePlayer duration={msg.voiceDuration || '0:05'} isUser={msg.sender === 'me'} />
                  ) : (
                    <p className="leading-relaxed font-medium">{msg.text}</p>
                  )}

                  {/* Timestamp */}
                  <div className={`flex items-center justify-end gap-1.5 text-[9px] mt-1 ${
                    msg.sender === 'me' ? 'text-sky-100' : 'text-slate-400 font-bold'
                  }`}>
                    <span>{msg.timestamp}</span>
                    {msg.sender === 'me' && <CheckCheck className="w-3 h-3 text-white" />}
                  </div>

                  {msg.reaction && (
                    <div className="absolute -bottom-2 right-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-1.5 py-0.5 text-xs shadow-sm">
                      {msg.reaction}
                    </div>
                  )}
                </div>

                {selectedReactionMsgId === msg.id && (
                  <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg mt-1 z-20 animate-fadeIn text-xs">
                    {['👍', '❤️', '🔥', '😂', '😮', '😢'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleAddReaction(msg.id, emoji)}
                        className="hover:scale-125 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                    <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />
                    <button
                      onClick={() => setReplyingTo({ senderName: msg.sender === 'me' ? 'Me' : activeContact?.name || 'Contact', text: msg.text || '' })}
                      className="p-1 rounded-full text-slate-400 hover:text-[#00B7FF]"
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
                        className="p-1 rounded-full text-slate-400 hover:text-cyan-500"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleCopyMessage(msg)}
                      className="p-1 rounded-full text-slate-400 hover:text-cyan-500"
                      title="Copy"
                    >
                      {copiedMsgId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="p-1 rounded-full text-rose-500 hover:bg-rose-500/10"
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

          {/* Reply composer status bar */}
          {replyingTo && (
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between animate-slideUp text-xs">
              <div className="truncate border-l-2 border-[#00B7FF] pl-2">
                <span className="font-bold text-[#00B7FF] text-[10px] block">Replying to {replyingTo.senderName}</span>
                <span className="text-slate-500 font-medium">{replyingTo.text}</span>
              </div>
              <button onClick={() => setReplyingTo(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Voice recorder overlay panel */}
          {isRecordingVoice ? (
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
              <VoiceRecorder onSendVoiceMessage={handleSendVoiceMessage} onCancel={() => setIsRecordingVoice(false)} />
            </div>
          ) : (
            /* Input Composer Bar */
            <div className="px-4 py-3 bg-white dark:bg-[#131b2e] border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 z-10 shrink-0">
              <button
                onClick={() => setIsAttachmentOpen(true)}
                className="p-2 rounded-full text-slate-400 hover:text-[#00B7FF] transition-colors"
                title="Add Attachment"
              >
                <Plus className="w-5 h-5" />
              </button>

              <button
                onClick={() => setIsEmojiOpen(!isEmojiOpen)}
                className={`p-2 rounded-full transition-colors ${
                  isEmojiOpen ? 'text-amber-500 bg-amber-500/10' : 'text-slate-400 hover:text-amber-500'
                }`}
                title="Emoji Picker"
              >
                <Smile className="w-5 h-5" />
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
                placeholder="Message..."
                className="flex-1 bg-slate-100 dark:bg-slate-900 border-none rounded-full px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00B7FF]"
              />

              {inputText.trim() ? (
                <button
                  onClick={handleSendMessage}
                  className="w-9 h-9 rounded-full bg-[#00B7FF] text-white flex items-center justify-center shadow-md shadow-[#00B7FF]/30 hover:scale-105 transition-transform shrink-0"
                >
                  <Send className="w-4 h-4 fill-white ml-0.5" />
                </button>
              ) : (
                <button
                  onClick={() => setIsRecordingVoice(true)}
                  className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-[#00B7FF] hover:text-white transition-colors shrink-0"
                  title="Click to Record Voice Message"
                >
                  <Mic className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

        </div>
      ) : (
        /* CHAT LIST VIEW */
        <div className="flex-1 flex flex-col min-h-0 p-4 space-y-4">
          
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search or enter user wallet..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-900 rounded-full text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00B7FF]"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
            
            {conversations.length === 0 && searchQuery.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center text-center text-slate-400 font-bold text-xs space-y-1">
                <MessageSquare className="w-8 h-8 text-cyan-500 opacity-60" />
                <span>Your inbox is empty.</span>
                <p className="text-[10px] text-slate-500 font-medium">Search a user by username to start a new chat!</p>
              </div>
            )}

            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setActiveChat(chat.id)}
                className="p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors flex items-center justify-between cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src={chat.avatar} alt={chat.name} className="w-12 h-12 rounded-full object-cover border border-[#00B7FF]" />
                    {chat.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#131b2e]" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1">
                      <span>{chat.name}</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-[#00B7FF]" />
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium truncate max-w-[160px] sm:max-w-xs">{chat.lastMessage}</p>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <span className="text-[9px] text-slate-400 font-extrabold font-mono">{chat.time}</span>
                  {chat.unread > 0 && (
                    <span className="w-5 h-5 rounded-full bg-[#00B7FF] text-slate-950 font-bold text-[9px] flex items-center justify-center ml-auto">
                      {chat.unread}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Discover new users on Aura Network */}
            {searchResults.length > 0 && (
              <div className="pt-4 space-y-2">
                <div className="text-[10px] font-extrabold text-[#00B7FF] uppercase tracking-wider px-1">
                  Aura Network Search Results
                </div>
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleStartChat(user.walletAddress)}
                    className="p-3 rounded-2xl bg-cyan-500/5 hover:bg-cyan-500/10 border border-cyan-500/10 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-600 p-0.5">
                        <img 
                          src={user.profile?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"} 
                          alt={user.profile?.displayName || "User"} 
                          className="w-full h-full rounded-full object-cover border border-white dark:border-[#131b2e]" 
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
                    <span className="text-[10px] font-extrabold text-[#00B7FF] bg-[#00B7FF]/10 px-3 py-1 rounded-full uppercase border border-[#00B7FF]/20">
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
