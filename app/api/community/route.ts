import { NextRequest, NextResponse } from "next/server";

export interface CommunityPost {
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
  type: "text" | "image" | "link" | "question" | "poll";
  title: string;
  content: string;
  imageUrl?: string;
  linkUrl?: string;
  pollOptions?: { id: string; option: string; votes: number }[];
  upvotes: number;
  commentsCount: number;
  saved: boolean;
  userVote?: "up" | "down";
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

const communityPosts: CommunityPost[] = [
  {
    id: "post_1",
    author: {
      name: "Rahul Sharma",
      username: "@rahul_s",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      reputationScore: 185,
      level: "Expert",
    },
    time: "2h ago",
    topic: "Web3 & AI",
    type: "poll",
    title: "What is the biggest barrier to mainstream Web3 social adoption?",
    content: "Cast your vote below! We are analyzing Community sentiment for our upcoming TrustGraph whitepaper.",
    pollOptions: [
      { id: "p1", option: "Complex Wallet Onboarding & Popups", votes: 142 },
      { id: "p2", option: "Gas Fees & Transaction Speeds", votes: 88 },
      { id: "p3", option: "Lack of High Quality Content", votes: 64 },
    ],
    upvotes: 294,
    commentsCount: 38,
    saved: false,
    comments: [
      {
        id: "c1",
        author: "Sarah Jenkins",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        text: "Silent auto-reconnection via eth_accounts completely solves option 1!",
        time: "1h ago",
        likes: 24,
        replies: [
          {
            id: "r1",
            author: "Abhay",
            avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
            text: "Exactly! Zero popups on app reopen is essential for proper UX.",
            time: "45m ago",
          },
        ],
      },
    ],
  },
  {
    id: "post_2",
    author: {
      name: "Elena Rostova",
      username: "@elena_vibe",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
      reputationScore: 160,
      level: "Trusted Contributor",
    },
    time: "5h ago",
    topic: "Proof of Creation",
    type: "text",
    title: "Why storing SHA-256 hashes instead of private text on-chain is critical",
    content: "Public blockchains are immutable. Storing private chat content directly violates user privacy. TrustGraph anchors only canonical keccak256 cryptographic hashes for instant message verification!",
    upvotes: 182,
    commentsCount: 19,
    saved: true,
    comments: [],
  },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") || "forYou"; // forYou | trending | latest | following
  const search = searchParams.get("search")?.toLowerCase();

  let result = [...communityPosts];

  if (search) {
    result = result.filter(
      (p) =>
        p.title.toLowerCase().includes(search) ||
        p.content.toLowerCase().includes(search) ||
        p.topic.toLowerCase().includes(search) ||
        p.author.name.toLowerCase().includes(search)
    );
  }

  if (filter === "trending") {
    result.sort((a, b) => b.upvotes - a.upvotes);
  }

  return NextResponse.json({ posts: result });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { authorName, username, topic, type, title, content, pollOptions } = body;

    const newPost: CommunityPost = {
      id: `post_${Date.now()}`,
      author: {
        name: authorName || "Abhay",
        username: username || "@abhay",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        reputationScore: 140,
        level: "Contributor",
      },
      time: "Just now",
      topic: topic || "General",
      type: type || "text",
      title: title || "New Discussion",
      content: content || "",
      pollOptions: pollOptions
        ? pollOptions.map((opt: string, idx: number) => ({ id: `opt_${idx}`, option: opt, votes: 0 }))
        : undefined,
      upvotes: 1,
      commentsCount: 0,
      saved: false,
      comments: [],
    };

    communityPosts.unshift(newPost);
    return NextResponse.json({ success: true, post: newPost });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create post" }, { status: 500 });
  }
}
