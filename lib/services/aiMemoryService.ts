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
    topic: "Mobile App Performance",
    summary: "You discussed mobile responsiveness, image caching optimizations, and fast video loading on Aura.",
    date: "Last week",
  },
  {
    id: "mem_2",
    contactName: "Sarah Jenkins",
    topic: "Design System & Dark Mode",
    summary: "Discussed frosted glass aesthetics, smooth spring animations, and cohesive typography for creator profiles.",
    date: "3 days ago",
  },
  {
    id: "mem_3",
    contactName: "Elena Rostova",
    topic: "Short Video Storytelling",
    summary: "Exchanged creative tips on audio overlays, cinematic portrait filters, and trending audio discovery in Pulse.",
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
    if (q.includes("rahul") || q.includes("performance")) {
      return '🧠 AI Memory Result:\n"You discussed mobile responsiveness, image caching, and fast media loading on Aura with Rahul Sharma last week."';
    }
    if (q.includes("design") || q.includes("sarah")) {
      return '🧠 AI Memory Result:\n"You discussed frosted glass aesthetics, smooth animations, and typography with Sarah Jenkins 3 days ago."';
    }
    return `🧠 AI Memory Result:\n"Based on your private conversation memories, you have stored topic summaries matching your query."`;
  },
};
