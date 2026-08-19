import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const authorAddress = searchParams.get("authorAddress")?.toLowerCase();
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const where: any = {};
    if (authorAddress) where.authorAddress = authorAddress;

    const posts = await prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit + 1,
      include: {
        likes: {
          select: { userAddress: true },
        },
        savedPosts: {
          select: { userAddress: true },
        },
        comments: {
          take: 6,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            authorAddress: true,
            content: true,
            createdAt: true,
          },
        },
      },
    });

    const hasMore = posts.length > limit;
    const paginatedPosts = hasMore ? posts.slice(0, limit) : posts;

    // Populate profiles for all authors efficiently
    const authorAddresses = Array.from(new Set(paginatedPosts.map((p) => p.authorAddress)));
    const profiles = authorAddresses.length > 0
      ? await prisma.profile.findMany({
          where: {
            user: {
              walletAddress: { in: authorAddresses },
            },
          },
          select: {
            username: true,
            displayName: true,
            avatarUrl: true,
            user: { select: { walletAddress: true } },
          },
        })
      : [];

    const profileMap = new Map(profiles.map((p) => [p.user.walletAddress, p]));

    const enrichedPosts = paginatedPosts.map((post) => ({
      ...post,
      authorProfile: profileMap.get(post.authorAddress) || {
        username: `user_${post.authorAddress.slice(0, 8)}`,
        displayName: `Creator ${post.authorAddress.slice(0, 6)}`,
        avatarUrl: "",
      },
    }));

    return NextResponse.json(
      { success: true, posts: enrichedPosts, hasMore, page },
      {
        headers: {
          "Cache-Control": "public, s-maxage=5, stale-while-revalidate=30",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      authorAddress,
      caption = "",
      mediaUrl = "",
      mediaCid = "",
      mediaType = "image",
      location = "",
      privacy = "public",
    } = body;

    if (!authorAddress || (!mediaUrl && !mediaCid)) {
      return NextResponse.json({ error: "Author address and media URL are required" }, { status: 400 });
    }

    const normalizedAuthor = authorAddress.toLowerCase();

    // Ensure user exists
    let user = await prisma.user.findUnique({
      where: { walletAddress: normalizedAuthor },
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

    // Create post
    const post = await prisma.post.create({
      data: {
        ...(id && { id }),
        authorAddress: normalizedAuthor,
        caption,
        mediaUrl: mediaUrl || (mediaCid ? `/uploads/${mediaCid}` : ""),
        mediaCid,
        mediaType,
        location,
        privacy,
      },
    });

    // Parse and update Hashtags
    if (caption) {
      const hashtags = caption.match(/#[a-zA-Z0-9_]+/g);
      if (hashtags) {
        for (const tagRaw of hashtags) {
          const tag = tagRaw.toLowerCase();
          await prisma.hashtag.upsert({
            where: { tag },
            create: { tag, postCount: 1 },
            update: { postCount: { increment: 1 } },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      post: {
        ...post,
        authorProfile: user.profile,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create post" }, { status: 500 });
  }
}
