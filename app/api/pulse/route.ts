import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateContentHash } from "@/lib/contract-helper";

// Initial seed videos if database has 0 pulses
const SEED_PULSES = [
  {
    id: "pulse_1",
    authorAddress: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-futuristic-robotic-arm-working-in-a-lab-43403-large.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
    caption: "Demystifying AI Agents & Decentralized Autonomous Workflows! 🚀🤖 #AIAgents #Tech #Future #BlockSocial",
    hashtags: "#AIAgents #Tech #Future",
    category: "AI",
    audioTitle: "Cosmic Cyber Beat - Aura Original",
    contentHash: "0xa1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef1",
    privacy: "Everyone",
    pulseScore: 94,
    authenticScore: 98,
    originalityVerified: true,
    viewsCount: 14200,
    likeCount: 3840,
    commentCount: 420,
    shareCount: 890,
    saveCount: 1250,
  },
  {
    id: "pulse_2",
    authorAddress: "0x3c44cdd0b2b95f6630f9a2e6b2165c79213194a2",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-smartphone-with-a-green-screen-41525-large.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80",
    caption: "Seamless MetaMask Wallet auto-reconnection without annoying popups! 🔥 Tech breakdown. #Web3 #MetaMask #UX",
    hashtags: "#Web3 #MetaMask #UX",
    category: "Web3",
    audioTitle: "Neon Cyber Synth - Web3 Vibe",
    contentHash: "0xb2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef2",
    privacy: "Everyone",
    pulseScore: 91,
    authenticScore: 96,
    originalityVerified: true,
    viewsCount: 9800,
    likeCount: 2450,
    commentCount: 310,
    shareCount: 620,
    saveCount: 940,
  },
  {
    id: "pulse_3",
    authorAddress: "0x90f79bf6eb2c4f870365e785982e1f101e93b906",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-abstract-glowing-digital-particle-lines-41551-large.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&auto=format&fit=crop&q=80",
    caption: "Proof-of-Creation content hash timeline anchored on-chain! 🔐✨ #Blockchain #CreatorEconomy #Originality",
    hashtags: "#Blockchain #CreatorEconomy",
    category: "Blockchain",
    audioTitle: "Decentralized Bassline Vol 4",
    contentHash: "0xc3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef3",
    privacy: "Everyone",
    pulseScore: 89,
    authenticScore: 92,
    originalityVerified: true,
    viewsCount: 7600,
    likeCount: 1890,
    commentCount: 215,
    shareCount: 410,
    saveCount: 780,
  },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tab = searchParams.get("tab") || "forYou"; // forYou | following | trending
  const filter = searchParams.get("filter") || "all"; // hotNow | rising | mostViewed | mostLiked
  const author = searchParams.get("author")?.toLowerCase();

  let pulses = await prisma.pulse.findMany({
    orderBy: tab === "trending" ? { pulseScore: "desc" } : { createdAt: "desc" },
    include: { audio: true },
  });

  if (pulses.length === 0) {
    for (const seed of SEED_PULSES) {
      await prisma.pulse.create({ data: seed });
    }
    pulses = await prisma.pulse.findMany({
      orderBy: { createdAt: "desc" },
      include: { audio: true },
    });
  }

  if (author) {
    pulses = pulses.filter((p) => p.authorAddress.toLowerCase() === author);
  }

  // Enrich each pulse with profile info
  const authorAddresses = Array.from(new Set(pulses.map((p) => p.authorAddress.toLowerCase())));
  const profiles = await prisma.profile.findMany({
    where: { user: { walletAddress: { in: authorAddresses } } },
    include: { user: true },
  });

  const profileMap = new Map();
  profiles.forEach((pr) => {
    profileMap.set(pr.user.walletAddress.toLowerCase(), pr);
  });

  const enrichedPulses = pulses.map((p) => {
    const prof = profileMap.get(p.authorAddress.toLowerCase());
    return {
      ...p,
      author: {
        walletAddress: p.authorAddress,
        username: prof?.username || `creator_${p.authorAddress.slice(2, 8)}`,
        displayName: prof?.displayName || `Creator ${p.authorAddress.slice(0, 6)}`,
        avatarUrl: prof?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
      },
    };
  });

  return NextResponse.json({
    pulses: enrichedPulses,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      authorAddress,
      videoUrl,
      thumbnailUrl,
      caption,
      hashtags,
      category,
      audioTitle,
      audioId,
      filterName,
      privacy,
      allowComments,
      allowRemix,
      allowDownload,
      remixOfId,
    } = body;

    if (!authorAddress || !videoUrl || !caption) {
      return NextResponse.json({ error: "Author, video URL, and caption are required" }, { status: 400 });
    }

    const contentHash = generateContentHash(videoUrl, caption, authorAddress);
    const pulseScore = Math.floor(Math.random() * 15) + 85; // 85 - 99

    const newPulse = await prisma.pulse.create({
      data: {
        authorAddress: authorAddress.toLowerCase(),
        videoUrl,
        thumbnailUrl: thumbnailUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
        caption,
        hashtags: hashtags || "#Pulse #BlockSocial",
        category: category || "General",
        audioTitle: audioTitle || "Original Sound",
        audioId: audioId || null,
        filterName: filterName || "",
        contentHash,
        privacy: privacy || "Everyone",
        allowComments: allowComments ?? true,
        allowRemix: allowRemix ?? true,
        allowDownload: allowDownload ?? true,
        remixOfId: remixOfId || null,
        pulseScore,
        authenticScore: 96,
        originalityVerified: true,
        txHash: `0xpulse_tx_${Date.now()}`,
      },
    });

    if (audioId) {
      try {
        await prisma.audio.update({
          where: { id: audioId },
          data: { useCount: { increment: 1 } },
        });
      } catch (err) {
        console.warn("Failed to increment audio usage count:", err);
      }
    }

    return NextResponse.json({ success: true, pulse: newPulse });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create Pulse" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, pulseId, userAddress, folder } = body;

    if (!pulseId) {
      return NextResponse.json({ error: "Pulse ID required" }, { status: 400 });
    }

    if (action === "like") {
      const pulse = await prisma.pulse.update({
        where: { id: pulseId },
        data: { likeCount: { increment: 1 } },
      });
      return NextResponse.json({ success: true, pulse });
    }

    if (action === "save") {
      if (userAddress) {
        await prisma.savedPulse.upsert({
          where: {
            userAddress_pulseId: {
              userAddress: userAddress.toLowerCase(),
              pulseId,
            },
          },
          create: {
            userAddress: userAddress.toLowerCase(),
            pulseId,
            folder: folder || "AI",
          },
          update: {
            folder: folder || "AI",
          },
        });
      }
      const pulse = await prisma.pulse.update({
        where: { id: pulseId },
        data: { saveCount: { increment: 1 } },
      });
      return NextResponse.json({ success: true, pulse });
    }

    if (action === "share") {
      const pulse = await prisma.pulse.update({
        where: { id: pulseId },
        data: { shareCount: { increment: 1 } },
      });
      return NextResponse.json({ success: true, pulse });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update pulse action" }, { status: 500 });
  }
}
