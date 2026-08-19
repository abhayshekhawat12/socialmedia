import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    // Fetch stories that have not expired yet
    const stories = await prisma.story.findMany({
      where: {
        expiresAt: {
          gt: now,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Populate user profiles for each author
    const authorAddresses = Array.from(new Set(stories.map((s) => s.authorAddress.toLowerCase())));
    const profiles = await prisma.profile.findMany({
      where: {
        user: {
          walletAddress: { in: authorAddresses },
        },
      },
      include: { user: true },
    });

    const profileMap = new Map(profiles.map((p) => [p.user.walletAddress, p]));

    // Group stories by author
    const groupedMap = new Map<string, any>();

    for (const story of stories) {
      const authorLower = story.authorAddress.toLowerCase();
      const profile = profileMap.get(authorLower) || {
        username: `creator_${authorLower.slice(2, 8)}`,
        displayName: `Creator ${authorLower.slice(0, 6)}`,
        avatarUrl: "",
      };

      if (!groupedMap.has(authorLower)) {
        groupedMap.set(authorLower, {
          authorAddress: authorLower,
          username: profile.username,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
          stories: [],
        });
      }
      groupedMap.get(authorLower).stories.push(story);
    }

    return NextResponse.json({ success: true, groups: Array.from(groupedMap.values()) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch stories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { authorAddress, mediaUrl, mediaType, textContent, textBgColor = "#121212", audioTitle, audioUrl, privacy = "everyone" } = body;

    if (!authorAddress || !mediaType) {
      return NextResponse.json({ error: "Author address and media type required" }, { status: 400 });
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Ensure user exists
    const normalizedAuthor = authorAddress.toLowerCase();
    let user = await prisma.user.findUnique({
      where: { walletAddress: normalizedAuthor },
    });

    if (!user) {
      await prisma.user.create({
        data: {
          walletAddress: normalizedAuthor,
          profile: {
            create: {
              username: `user_${normalizedAuthor.slice(0, 8)}`,
              displayName: `User ${normalizedAuthor.slice(0, 6)}`,
            },
          },
        },
      });
    }

    const story = await prisma.story.create({
      data: {
        authorAddress: normalizedAuthor,
        mediaUrl: mediaUrl || null,
        mediaType,
        textContent: textContent || null,
        textBgColor,
        audioTitle: audioTitle || null,
        audioUrl: audioUrl || null,
        privacy,
        expiresAt,
      },
    });

    return NextResponse.json({ success: true, story });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to post story" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const authorAddress = searchParams.get("authorAddress");

    if (!id || !authorAddress) {
      return NextResponse.json({ error: "Story ID and author address required" }, { status: 400 });
    }

    const story = await prisma.story.findUnique({ where: { id } });

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    if (story.authorAddress.toLowerCase() !== authorAddress.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.story.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Story deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete story" }, { status: 500 });
  }
}
