export interface MemoryEntry {
  id: string;
  contactName: string;
  topic: string;
  summary: string;
  date: string;
  sourceMsgId?: string;
}

export const aiMemoryService = {
  getMemories(): MemoryEntry[] {
    return [
      {
        id: "mem_1",
        contactName: "Active Connections",
        topic: "Mobile Performance & Media",
        summary: "Conversations on video loading, responsive layout, and glass design.",
        date: "Recent",
      },
      {
        id: "mem_2",
        contactName: "Creative Network",
        topic: "Audio & Visual Storytelling",
        summary: "Creative discussions on Pulse reels, music tracks, and creator marketplace.",
        date: "Recent",
      },
    ];
  },

  searchMemory(query: string): MemoryEntry[] {
    const q = query.toLowerCase();
    const memories = this.getMemories();
    return memories.filter(
      (m) =>
        m.topic.toLowerCase().includes(q) ||
        m.summary.toLowerCase().includes(q) ||
        m.contactName.toLowerCase().includes(q)
    );
  },

  deleteMemory(id: string) {
    // No-op for runtime
  },

  queryAiMemory(userQuestion: string): string {
    const q = userQuestion.toLowerCase();
    if (q.includes("performance") || q.includes("speed")) {
      return '🧠 AI Assistant Summary:\n"Your conversations highlight high-performance media loading, glassmorphism UI, and low-latency realtime messaging on Pulse."';
    }
    if (q.includes("design") || q.includes("ui")) {
      return '🧠 AI Assistant Summary:\n"You have active discussions focusing on frosted glass aesthetics, smooth spring animations, and Apple 2026 design tokens."';
    }
    return `🧠 AI Assistant Summary:\n"Based on your private conversation memories, your discussions center on creative collaboration, reels production, and creator deals."`;
  },
};
