import { supabase } from "../supabase";

export interface ProfileData {
  username: string;
  displayName: string;
  nickname?: string;
  bio: string;
  avatarUrl: string;
  bannerUrl: string;
}

export interface PostItem {
  id: string;
  authorAddress: string;
  caption: string;
  mediaUrl: string;
  mediaCid?: string;
  mediaType?: string;
  location?: string;
  privacy?: string;
  likeCount?: number;
  commentCount?: number;
  createdAt: string;
  authorProfile?: ProfileData;
}

// 1. PROFILE SERVICE
export const profileService = {
  async getProfile(identifier: string) {
    const res = await fetch(`/api/profile?walletAddress=${encodeURIComponent(identifier)}`);
    if (!res.ok) throw new Error("Failed to fetch profile");
    return await res.json();
  },

  async updateProfile(walletAddress: string, data: Partial<ProfileData>) {
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress, ...data }),
    });
    if (!res.ok) throw new Error("Failed to update profile");
    return await res.json();
  },
};

// 2. POST SERVICE
export const postService = {
  async getPosts(page = 1, limit = 10, authorAddress?: string) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (authorAddress) params.append("authorAddress", authorAddress);

    const res = await fetch(`/api/posts?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch posts");
    return await res.json();
  },

  async createPost(postData: {
    authorAddress: string;
    caption: string;
    mediaUrl: string;
    mediaCid?: string;
    mediaType?: string;
    location?: string;
    privacy?: string;
  }) {
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(postData),
    });
    if (!res.ok) throw new Error("Failed to create post");
    return await res.json();
  },

  async deletePost(postId: string, userAddress: string) {
    const res = await fetch(`/api/posts/${postId}?userAddress=${encodeURIComponent(userAddress)}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete post");
    return await res.json();
  },

  async toggleLike(postId: string, userAddress: string) {
    const res = await fetch(`/api/posts/${postId}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userAddress }),
    });
    if (!res.ok) throw new Error("Failed to toggle like");
    return await res.json();
  },

  async toggleSave(postId: string, userAddress: string) {
    const res = await fetch("/api/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, userAddress }),
    });
    if (!res.ok) throw new Error("Failed to toggle save");
    return await res.json();
  },
};

// 3. STORY SERVICE
export const storyService = {
  async getStories() {
    const res = await fetch("/api/stories");
    if (!res.ok) throw new Error("Failed to fetch stories");
    return await res.json();
  },

  async createStory(storyData: {
    authorAddress: string;
    mediaUrl?: string;
    mediaType: string;
    textContent?: string;
    textBgColor?: string;
    audioTitle?: string | null;
    audioUrl?: string | null;
    privacy?: string;
  }) {
    const res = await fetch("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(storyData),
    });
    if (!res.ok) throw new Error("Failed to create story");
    return await res.json();
  },

  async deleteStory(id: string, authorAddress: string) {
    const res = await fetch(`/api/stories?id=${id}&authorAddress=${encodeURIComponent(authorAddress)}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete story");
    return await res.json();
  },
};

// 4. REEL / PULSE SERVICE
export const reelService = {
  async getReels(tab = "trending", authorAddress?: string, limit = 15) {
    const params = new URLSearchParams({ tab, limit: String(limit) });
    if (authorAddress) params.append("authorAddress", authorAddress);

    const res = await fetch(`/api/pulse?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch reels");
    return await res.json();
  },

  async createReel(reelData: {
    authorAddress: string;
    videoUrl: string;
    videoCid?: string;
    caption: string;
    hashtags?: string;
    category?: string;
    audioTitle?: string;
    audioId?: string | null;
    filterName?: string;
    privacy?: string;
  }) {
    const res = await fetch("/api/pulse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reelData),
    });
    if (!res.ok) throw new Error("Failed to create reel");
    return await res.json();
  },
};

// 5. MESSAGE SERVICE (With Supabase Realtime)
export const messageService = {
  async getConversations() {
    const res = await fetch("/api/chats");
    if (!res.ok) throw new Error("Failed to fetch conversations");
    return await res.json();
  },

  async getMessages(conversationId: string) {
    const res = await fetch(`/api/chats/messages?conversationId=${conversationId}`);
    if (!res.ok) throw new Error("Failed to fetch messages");
    return await res.json();
  },

  async sendMessage(conversationId: string, content: string) {
    const res = await fetch("/api/chats/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, content }),
    });
    if (!res.ok) throw new Error("Failed to send message");
    return await res.json();
  },

  async startConversation(targetAddress: string) {
    const res = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetAddress }),
    });
    if (!res.ok) throw new Error("Failed to start conversation");
    return await res.json();
  },

  async deleteConversation(conversationId: string) {
    const res = await fetch(`/api/chats?conversationId=${conversationId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete conversation");
    return await res.json();
  },

  // Realtime message subscription via Supabase Realtime Channels
  subscribeToMessages(conversationId: string, onNewMessage: (msg: any) => void) {
    const channel = supabase
      .channel(`chat_${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Message",
          filter: `conversationId=eq.${conversationId}`,
        },
        (payload) => {
          onNewMessage(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};

// 6. SUGGESTED CREATORS SERVICE
export const creatorService = {
  async getSuggestedCreators(limit = 5) {
    const res = await fetch(`/api/users/suggested?limit=${limit}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.creators || [];
  },
};
