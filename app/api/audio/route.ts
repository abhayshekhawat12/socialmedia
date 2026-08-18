import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SEED_AUDIO = [
  {
    title: "Cosmic Cyber Beat",
    artist: "Aura Original",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    duration: 372,
    thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80",
    useCount: 12500,
    trendGrowth: 124.0,
    status: "trending",
  },
  {
    title: "Neon Cyber Synth",
    artist: "Web3 Vibe",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    duration: 423,
    thumbnailUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&auto=format&fit=crop&q=80",
    useCount: 9800,
    trendGrowth: 85.5,
    status: "trending",
  },
  {
    title: "Decentralized Bassline",
    artist: "DJ Hardhat",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    duration: 302,
    thumbnailUrl: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200&auto=format&fit=crop&q=80",
    useCount: 7600,
    trendGrowth: 42.1,
    status: "rising",
  },
  {
    title: "Lofi Pulse",
    artist: "Chill Wave Creator",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    duration: 300,
    thumbnailUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200&auto=format&fit=crop&q=80",
    useCount: 5400,
    trendGrowth: 110.2,
    status: "trending",
  },
  {
    title: "Retro Future Wave",
    artist: "Synthesizer Dream",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    duration: 345,
    thumbnailUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
    useCount: 3200,
    trendGrowth: 67.4,
    status: "popular",
  }
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";
    const filter = searchParams.get("filter") || "all"; // all | trending | rising | popular

    let audioList = await prisma.audio.findMany({
      orderBy: { useCount: "desc" },
    });

    if (audioList.length === 0) {
      for (const item of SEED_AUDIO) {
        await prisma.audio.create({ data: item });
      }
      audioList = await prisma.audio.findMany({
        orderBy: { useCount: "desc" },
      });
    }

    if (query) {
      const cleanQ = query.toLowerCase();
      audioList = audioList.filter(
        (a) => a.title.toLowerCase().includes(cleanQ) || a.artist.toLowerCase().includes(cleanQ)
      );
    }

    if (filter !== "all") {
      audioList = audioList.filter((a) => a.status === filter);
    }

    return NextResponse.json({ success: true, audio: audioList });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch audio tracks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, artist, url, duration, thumbnailUrl } = body;

    if (!title || !url) {
      return NextResponse.json({ error: "Title and audio URL are required" }, { status: 400 });
    }

    const newAudio = await prisma.audio.create({
      data: {
        title,
        artist: artist || "Original Audio",
        url,
        duration: duration || 15,
        thumbnailUrl: thumbnailUrl || "",
        useCount: 1,
        trendGrowth: 10.0,
        status: "rising",
      },
    });

    return NextResponse.json({ success: true, audio: newAudio });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create audio track" }, { status: 500 });
  }
}
