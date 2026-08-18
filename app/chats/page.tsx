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
  AlertTriangle
} from 'lucide-react';
import { VoiceMessagePlayer } from '../../components/VoiceMessagePlayer';
import { MediaAttachmentDrawer } from '../../components/MediaAttachmentDrawer';
import { ChatPrivacySettingsModal } from '../../components/ChatPrivacySettingsModal';
import { EmojiPicker } from '../../components/EmojiPicker';
import { VoiceRecorder } from '../../components/VoiceRecorder';
import { CallModal } from '../../components/CallModal';
import { callService } from '../../lib/services/callService';
import { blockchainService, MessageProof } from '../../lib/services/blockchainService';
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
  proof?: MessageProof;
}

export default function ChatsPage() {
  const [activeChat, setActiveChat] = useState<string | null>('sarah');
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ senderName: string; text: string } | null>(null);
  const [selectedReactionMsgId, setSelectedReactionMsgId] = useState<string | null>(null);
  
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

  const chatsList = [
    {
      id: 'sarah',
      name: 'Sarah Jenkins',
      username: '@sarah_j',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      lastMessage: 'Voice message (0:14)',
      time: '10:42 AM',
      unread: 1,
      isOnline: true,
      isPinned: true,
      isGroup: false,
    },
    {
      id: 'rahul',
      name: 'Rahul Sharma',
      username: '@rahul_s',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      lastMessage: 'Let\'s finalize the TrustGraph deployment!',
      time: '09:15 AM',
      unread: 0,
      isOnline: true,
      isPinned: true,
      isGroup: false,
    },
    {
      id: 'trustgraph_community',
      name: 'TrustGraph Core Creators',
      username: '@trustgraph_devs',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      lastMessage: 'Elena: SHA-256 message proofs anchored 🚀',
      time: 'Yesterday',
      unread: 0,
      isOnline: true,
      isPinned: false,
      isGroup: true,
    },
  ];

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      sender: 'other',
      text: 'Hey Abhay! Check out the new TrustGraph blockchain message verification feature.',
      timestamp: '10:38 AM',
      status: 'read',
    },
    {
      id: 'm2',
      sender: 'me',
      text: 'Looks incredible! Private messages remain 100% private, only hashes are anchored on-chain.',
      timestamp: '10:40 AM',
      status: 'read',
    },
    {
      id: 'm3',
      sender: 'other',
      type: 'voice',
      voiceDuration: '0:14',
      timestamp: '10:42 AM',
      status: 'read',
      reaction: '🔥',
    },
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeContact = chatsList.find((c) => c.id === activeChat);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    if (editingMsgId) {
      setMessages((prev) =>
        prev.map((m) => (m.id === editingMsgId ? { ...m, text: inputText } : m))
      );
      setEditingMsgId(null);
      setInputText('');
      return;
    }

    const newMsgId = `msg_${Date.now()}`;
    const textToSend = inputText;

    // Create blockchain proof for message authenticity
    const proof = await blockchainService.createMessageProof(
      newMsgId,
      textToSend,
      activeContact?.username || '0x7a250d5630b4cf539739df2c5dacb4c659f2488d'
    );

    const newMsg: Message = {
      id: newMsgId,
      sender: 'me',
      text: textToSend,
      type: 'text',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'read',
      replyTo: replyingTo || undefined,
      proof,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
    setReplyingTo(null);
    setIsEmojiOpen(false);
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

  const handleVerifyMessage = async (msg: Message) => {
    if (!msg.text) return;
    const res = await blockchainService.verifyMessageProof(msg.id, msg.text, activeContact?.username || 'user');
    setVerificationResult({
      msgId: msg.id,
      text: res.message,
      isAuthentic: res.isAuthentic,
    });
  };

  const handleAddReaction = (msgId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, reaction: emoji } : m))
    );
    setSelectedReactionMsgId(null);
  };

  const handleDeleteMessage = (msgId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
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

  const filteredChats = chatsList.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white dark:bg-[#131b2e] rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm relative">
      
      {/* Call Modal Overlay Component */}
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
                onClick={() => setIsPrivacyOpen(true)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-[#00B7FF]"
                title="Privacy & Security Settings"
              >
                <Lock className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Thread (Independently Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-[#F5F7FA]/60 dark:bg-slate-900/40">
            
            <div className="flex justify-center">
              <span className="text-[10px] font-extrabold text-slate-400 bg-white/80 dark:bg-slate-800/80 px-3 py-1 rounded-full shadow-xs border border-slate-200/60 dark:border-slate-700/60">
                Today
              </span>
            </div>

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
                  {/* Voice Message */}
                  {msg.type === 'voice' ? (
                    <VoiceMessagePlayer duration={msg.voiceDuration || '0:05'} isUser={msg.sender === 'me'} />
                  ) : (
                    <p className="leading-relaxed font-medium">{msg.text}</p>
                  )}

                  {/* Timestamp & Proof badge */}
                  <div className={`flex items-center justify-end gap-1.5 text-[9px] mt-1 ${
                    msg.sender === 'me' ? 'text-sky-100' : 'text-slate-400 font-bold'
                  }`}>
                    <span>{msg.timestamp}</span>
                    {msg.sender === 'me' && <CheckCheck className="w-3 h-3 text-white" />}
                    {msg.proof && (
                      <span className="text-[8px] font-mono bg-white/20 dark:bg-slate-800 px-1 rounded text-cyan-200" title="Blockchain Proof Anchored">
                        🔐 SHA-256
                      </span>
                    )}
                  </div>

                  {/* Reaction Badge */}
                  {msg.reaction && (
                    <div className="absolute -bottom-2 right-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-1.5 py-0.5 text-xs shadow-sm">
                      {msg.reaction}
                    </div>
                  )}
                </div>

                {/* Verification Notice Banner */}
                {verificationResult?.msgId === msg.id && (
                  <div className={`mt-1 p-2 rounded-xl text-[10px] font-bold border max-w-[80%] animate-in fade-in ${
                    verificationResult.isAuthentic
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}>
                    {verificationResult.text}
                  </div>
                )}

                {/* Action Context Menu overlay on selection */}
                {selectedReactionMsgId === msg.id && (
                  <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg mt-1 z-20 animate-fadeIn text-xs">
                    {['👍', '❤️', '🔥', '😂', '😮', '😢'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleAddReaction(msg.id, emoji)}
                        className="hover:scale-125 transition-transform cursor-pointer p-0.5"
                      >
                        {emoji}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => setReplyingTo({ senderName: msg.sender === 'me' ? 'You' : activeContact?.name || 'Contact', text: msg.text || 'Voice Message' })}
                      className="p-1 text-slate-400 hover:text-[#00B7FF]"
                      title="Reply"
                    >
                      <CornerUpLeft className="w-3.5 h-3.5" />
                    </button>

                    {msg.text && (
                      <button
                        onClick={() => handleVerifyMessage(msg)}
                        className="p-1 text-slate-400 hover:text-emerald-400"
                        title="Verify Message Hash on Blockchain"
                      >
                        <Key className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {msg.text && (
                      <button
                        onClick={() => handleCopyMessage(msg)}
                        className="p-1 text-slate-400 hover:text-white"
                        title="Copy Text"
                      >
                        {copiedMsgId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}

                    {msg.sender === 'me' && (
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="p-1 text-slate-400 hover:text-rose-400"
                        title="Delete Message"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          {/* Reply Bar Preview */}
          {replyingTo && (
            <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs shrink-0">
              <div className="truncate border-l-2 border-[#00B7FF] pl-2">
                <span className="font-extrabold text-[#00B7FF] block text-[10px]">Replying to {replyingTo.senderName}</span>
                <span className="text-slate-600 dark:text-slate-300 text-[11px] truncate">{replyingTo.text}</span>
              </div>
              <button onClick={() => setReplyingTo(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Unicode Emoji Picker Overlay Panel */}
          {isEmojiOpen && (
            <div className="px-3 pt-2 shrink-0">
              <EmojiPicker
                onSelectEmoji={(emoji) => setInputText((prev) => prev + emoji)}
                onClose={() => setIsEmojiOpen(false)}
              />
            </div>
          )}

          {/* Audio Voice Recorder Panel */}
          {isRecordingVoice ? (
            <div className="p-3 bg-white dark:bg-[#131b2e] border-t border-slate-100 dark:border-slate-800 shrink-0">
              <VoiceRecorder
                onSendVoiceMessage={handleSendVoiceMessage}
                onCancel={() => setIsRecordingVoice(false)}
              />
            </div>
          ) : (
            /* Fixed Bottom Composer */
            <div className="p-3 bg-white dark:bg-[#131b2e] border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsAttachmentOpen(true)}
                className="p-2 rounded-full text-slate-400 hover:text-[#00B7FF] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Add Attachment"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
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
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-900 rounded-full text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00B7FF]"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
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
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1">
                      <span>{chat.name}</span>
                      {chat.isPinned && <Pin className="w-3 h-3 text-[#00B7FF] fill-[#00B7FF]" />}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate max-w-[180px]">{chat.lastMessage}</p>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold">{chat.time}</span>
                  {chat.unread > 0 && (
                    <div className="w-4 h-4 rounded-full bg-[#00B7FF] text-white text-[9px] font-black flex items-center justify-center ml-auto">
                      {chat.unread}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* AI MEMORY MODAL */}
      {isAiMemoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-[#131b2e] border border-slate-800 p-5 text-left space-y-4 text-xs text-white relative">
            <button onClick={() => setIsAiMemoryOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-purple-400 font-extrabold text-sm">
              <Brain className="w-5 h-5" />
              <span>🧠 AI Conversation Memory</span>
            </div>

            <form onSubmit={handleQueryMemory} className="space-y-2">
              <input
                type="text"
                placeholder='Ask AI e.g. "What did I discuss with Rahul?"'
                value={memoryQuery}
                onChange={(e) => setMemoryQuery(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold focus:outline-none focus:border-purple-500"
              />
              <button type="submit" className="w-full py-2 rounded-xl bg-purple-600 font-bold text-white text-xs">
                Search Memory
              </button>
            </form>

            {aiAnswer && (
              <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-300 font-medium whitespace-pre-line leading-relaxed">
                {aiAnswer}
              </div>
            )}

            <div className="space-y-2 pt-1 max-h-48 overflow-y-auto no-scrollbar">
              <div className="font-bold text-slate-400 text-[11px]">Stored Conversation Summaries</div>
              {memoryResults.map((mem) => (
                <div key={mem.id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="flex justify-between font-bold text-[#00B7FF]">
                    <span>{mem.contactName} • {mem.topic}</span>
                    <button onClick={() => aiMemoryService.deleteMemory(mem.id)} className="text-rose-400 hover:underline">
                      Delete
                    </button>
                  </div>
                  <div className="text-slate-300 text-[11px]">{mem.summary}</div>
                  <div className="text-[9px] text-slate-500 font-mono">{mem.date}</div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* Attachment Drawer Modal */}
      <MediaAttachmentDrawer
        isOpen={isAttachmentOpen}
        onClose={() => setIsAttachmentOpen(false)}
        onSelectOption={(type) => alert(`Selected attachment: ${type}`)}
      />

      {/* Privacy Settings Modal */}
      <ChatPrivacySettingsModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
        contactName={activeContact?.name}
      />

    </div>
  );
}
