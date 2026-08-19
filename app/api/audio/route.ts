import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MUSIC_CATALOG } from "@/lib/musicCatalog";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim().toLowerCase() || "";
    const category = searchParams.get("category") || "all";
    const userAddress = searchParams.get("userAddress")?.toLowerCase();

    // 1. Fetch user preferences if userAddress is provided
    let userInterests: string[] = [];
    if (userAddress) {
      try {
        const settings = await prisma.userSettings.findUnique({
          where: { walletAddress: userAddress },
        });
        if (settings?.interests) {
          userInterests = settings.interests.split(",").map((s) => s.trim().toLowerCase());
        }
      } catch (err) {
        console.warn("User settings query warning:", err);
      }
    }

    // 2. Query DB with fallback to static MUSIC_CATALOG
    const where: any = {};
    if (category && category !== "all" && category !== "recommended") {
      if (category.toLowerCase() === "trending") {
        where.status = "trending";
      } else {
        where.category = { equals: category };
      }
    }

    let tracks: any[] = [];
    try {
      tracks = await prisma.audio.findMany({
        where,
        orderBy: { useCount: "desc" },
      });
    } catch (dbErr) {
      console.warn("Audio DB fetch warning, falling back to catalog:", dbErr);
    }

    // If DB is empty, use MUSIC_CATALOG directly
    if (!tracks || tracks.length === 0) {
      tracks = MUSIC_CATALOG.map((t) => ({
        ...t,
        useCount: t.trending ? 150 : 25,
        status: t.trending ? "trending" : "rising",
      }));

      if (category && category !== "all" && category !== "recommended") {
        if (category.toLowerCase() === "trending") {
          tracks = tracks.filter((t) => t.trending);
        } else {
          tracks = tracks.filter((t) => t.category.toLowerCase() === category.toLowerCase());
        }
      }
    }

    if (query) {
      tracks = tracks.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.artist.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query) ||
          t.language.toLowerCase().includes(query)
      );
    }

    // 3. Personalized scoring / sorting
    if (userInterests.length > 0) {
      tracks.sort((a, b) => {
        const aMatches = userInterests.includes(a.category.toLowerCase()) || userInterests.includes(a.language.toLowerCase()) ? 1 : 0;
        const bMatches = userInterests.includes(b.category.toLowerCase()) || userInterests.includes(b.language.toLowerCase()) ? 1 : 0;
        if (aMatches !== bMatches) return bMatches - aMatches;
        return (b.useCount || 0) - (a.useCount || 0);
      });
    }

    return NextResponse.json(
      {
        success: true,
        audio: tracks,
        total: tracks.length,
        categories: ["All", "Trending", "Bollywood", "Punjabi", "Haryanvi", "Rajasthani", "Hindi", "English", "Instrumental"],
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      }
    );
  } catch (error: any) {
    console.error("GET /api/audio error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch audio tracks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, artist, url, duration, thumbnailUrl, category = "Bollywood", language = "Hindi" } = body;

    if (!title || !url) {
      return NextResponse.json({ error: "Title and audio URL are required" }, { status: 400 });
    }

    const newAudio = await prisma.audio.create({
      data: {
        title,
        artist: artist || "Original Audio",
        url,
        duration: duration || 30,
        thumbnailUrl: thumbnailUrl || "",
        category,
        language,
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
