import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") || "forYou"; // forYou | following | trending
    const author = (searchParams.get("authorAddress") || searchParams.get("author"))?.toLowerCase();

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);

    const where: any = {};
    if (author) {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { walletAddress: author },
            { id: author },
            { email: author },
          ],
        },
      });

      if (user) {
        where.OR = [
          { authorAddress: user.walletAddress || "" },
          { authorAddress: user.id },
          { authorAddress: author },
        ];
      } else {
        where.authorAddress = author;
      }
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
    const authorIdentifiers = Array.from(new Set(paginatedPulses.map((p) => p.authorAddress.toLowerCase())));
    const profiles = authorIdentifiers.length > 0
      ? await prisma.profile.findMany({
          where: {
            OR: [
              { user: { walletAddress: { in: authorIdentifiers } } },
              { user: { id: { in: authorIdentifiers } } },
              { user: { email: { in: authorIdentifiers } } },
            ],
          },
          select: {
            username: true,
            displayName: true,
            avatarUrl: true,
            user: { select: { walletAddress: true, id: true, email: true } },
          },
        })
      : [];

    const profileMap = new Map<string, any>();
    for (const pr of profiles) {
      if (pr.user.walletAddress) profileMap.set(pr.user.walletAddress.toLowerCase(), pr);
      if (pr.user.id) profileMap.set(pr.user.id.toLowerCase(), pr);
      if (pr.user.email) profileMap.set(pr.user.email.toLowerCase(), pr);
    }

    const enrichedPulses = paginatedPulses.map((p) => {
      const authorKey = p.authorAddress.toLowerCase();
      const prof = profileMap.get(authorKey);
      return {
        ...p,
        author: {
          walletAddress: p.authorAddress,
          username: prof?.username || `user_${authorKey.slice(0, 8)}`,
          displayName: prof?.displayName || `Creator ${authorKey.slice(0, 6)}`,
          avatarUrl: prof?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${authorKey}`,
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
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error: any) {
    console.error("Error fetching pulses:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch pulses" }, { status: 500 });
  }
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

    const normalizedAuthor = authorAddress.toLowerCase();

    // Ensure user exists
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { walletAddress: normalizedAuthor },
          { id: normalizedAuthor },
          { email: normalizedAuthor },
        ],
      },
      include: { profile: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          walletAddress: normalizedAuthor,
          profile: {
            create: {
              username: `user_${normalizedAuthor.slice(0, 8)}`,
              displayName: `User ${normalizedAuthor.slice(0, 6)}`,
            },
          },
        },
        include: { profile: true },
      });
    }

    const finalAuthorAddress = user.walletAddress || user.id || normalizedAuthor;
    const pulseScore = Math.floor(Math.random() * 15) + 85;

    const newPulse = await prisma.pulse.create({
      data: {
        authorAddress: finalAuthorAddress,
        videoUrl,
        videoCid,
        thumbnailUrl: thumbnailUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
        caption,
        hashtags: hashtags || "#Pulse #Trending",
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
    console.error("Error creating pulse:", error);
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
            folder: folder || "Favorites",
          },
          update: {
            folder: folder || "Favorites",
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
