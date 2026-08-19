import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tab = searchParams.get("tab") || "forYou"; // forYou | following | trending
  const filter = searchParams.get("filter") || "all";
  const author = (searchParams.get("authorAddress") || searchParams.get("author"))?.toLowerCase();

  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "15", 10);

  const where: any = {};
  if (author) {
    where.authorAddress = author;
  }

  const pulses = await prisma.pulse.findMany({
    where,
    orderBy: tab === "trending" ? { pulseScore: "desc" } : { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit + 1,
    include: {
      audio: true,
      likes: {
        select: { userAddress: true },
      },
      savedPulses: {
        select: { userAddress: true },
      },
    },
  });

  const hasMore = pulses.length > limit;
  const paginatedPulses = hasMore ? pulses.slice(0, limit) : pulses;

  // Enrich each pulse with profile info
  const authorAddresses = Array.from(new Set(paginatedPulses.map((p) => p.authorAddress.toLowerCase())));
  const profiles = authorAddresses.length > 0
    ? await prisma.profile.findMany({
        where: { user: { walletAddress: { in: authorAddresses } } },
        select: {
          username: true,
          displayName: true,
          avatarUrl: true,
          user: { select: { walletAddress: true } },
        },
      })
    : [];

  const profileMap = new Map();
  profiles.forEach((pr) => {
    if (pr.user?.walletAddress) {
      profileMap.set(pr.user.walletAddress.toLowerCase(), pr);
    }
  });

  const enrichedPulses = paginatedPulses.map((p) => {
    const prof = profileMap.get(p.authorAddress.toLowerCase());
    return {
      ...p,
      author: {
        walletAddress: p.authorAddress,
        username: prof?.username || `user_${p.authorAddress.slice(0, 8)}`,
        displayName: prof?.displayName || `Creator ${p.authorAddress.slice(0, 6)}`,
        avatarUrl: prof?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
      },
    };
  });

  return NextResponse.json(
    {
      success: true,
      pulses: enrichedPulses,
      hasMore,
      page,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=5, stale-while-revalidate=30",
      },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      authorAddress,
      videoUrl,
      videoCid = "",
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

    const pulseScore = Math.floor(Math.random() * 15) + 85; // 85 - 99

    const newPulse = await prisma.pulse.create({
      data: {
        authorAddress: authorAddress.toLowerCase(),
        videoUrl,
        videoCid,
        thumbnailUrl: thumbnailUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
        caption,
        hashtags: hashtags || "#Pulse #Aura",
        category: category || "General",
        audioTitle: audioTitle || "Original Sound",
        audioId: audioId || null,
        filterName: filterName || "",
        privacy: privacy || "Everyone",
        allowComments: allowComments ?? true,
        allowRemix: allowRemix ?? true,
        allowDownload: allowDownload ?? true,
        remixOfId: remixOfId || null,
        pulseScore,
        authenticScore: 96,
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
