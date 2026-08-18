export interface MemoryEntry {
  id: string;
  contactName: string;
  topic: string;
  summary: string;
  date: string;
  sourceMsgId?: string;
}

const memoryStore: MemoryEntry[] = [
  {
    id: "mem_1",
    contactName: "Rahul Sharma",
    topic: "Blockchain Deployment",
    summary: "You discussed your blockchain social project, Sepolia contract deployment, and proof-of-creation hash anchoring.",
    date: "Last week (Aug 11, 2026)",
  },
  {
    id: "mem_2",
    contactName: "Sarah Jenkins",
    topic: "MetaMask Auto-Reconnection",
    summary: "Discussed silent eth_accounts reconnection without popup windows and seamless user authorization persistence.",
    date: "3 days ago",
  },
  {
    id: "mem_3",
    contactName: "Elena Rostova",
    topic: "NFT Asset Minting",
    summary: "Exchanged thoughts on Web3 photographer passports and social media content hash verification.",
    date: "Yesterday",
  },
];

export const aiMemoryService = {
  getMemories(): MemoryEntry[] {
    return [...memoryStore];
  },

  searchMemory(query: string): MemoryEntry[] {
    const q = query.toLowerCase();
    return memoryStore.filter(
      (m) =>
        m.topic.toLowerCase().includes(q) ||
        m.summary.toLowerCase().includes(q) ||
        m.contactName.toLowerCase().includes(q)
    );
  },

  deleteMemory(id: string) {
    const idx = memoryStore.findIndex((m) => m.id === id);
    if (idx !== -1) {
      memoryStore.splice(idx, 1);
    }
  },

  queryAiMemory(userQuestion: string): string {
    const q = userQuestion.toLowerCase();
    if (q.includes("rahul") || q.includes("blockchain")) {
      return '🧠 AI Memory Result:\n"You discussed your blockchain project, contract deployment on Sepolia, and cryptographic proof-of-creation hash anchoring with Rahul Sharma last week."';
    }
    if (q.includes("metamask") || q.includes("sarah")) {
      return '🧠 AI Memory Result:\n"You discussed silent eth_accounts auto-reconnection without popup windows with Sarah Jenkins 3 days ago."';
    }
    return `🧠 AI Memory Result:\n"Based on your private conversation memories, you have 3 stored topic summaries matching your query."`;
  },
};
