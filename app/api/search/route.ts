import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim() || "";

  if (!query) {
    // Return trending hashtags & top creators as fallback
    const hashtags = await prisma.hashtag.findMany({
      orderBy: { postCount: "desc" },
      take: 10,
    });

    const topProfiles = await prisma.profile.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
    });

    const trendingPosts = await prisma.post.findMany({
      take: 12,
      orderBy: { likeCount: "desc" },
      include: { likes: true, comments: true },
    });

    return NextResponse.json({
      trendingHashtags: hashtags,
      trendingCreators: topProfiles,
      trendingPosts,
    });
  }

  const cleanQuery = query.startsWith("#") ? query.slice(1).toLowerCase() : query.toLowerCase();

  const [users, posts, hashtags] = await Promise.all([
    prisma.profile.findMany({
      where: {
        OR: [
          { username: { contains: cleanQuery } },
          { displayName: { contains: cleanQuery } },
          { user: { walletAddress: { contains: cleanQuery } } },
        ],
      },
      take: 10,
      include: { user: true },
    }),
    prisma.post.findMany({
      where: {
        OR: [
          { caption: { contains: query } },
          { location: { contains: query } },
        ],
      },
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { likes: true, comments: true },
    }),
    prisma.hashtag.findMany({
      where: { tag: { contains: cleanQuery } },
      take: 10,
    }),
  ]);

  return NextResponse.json({
    users,
    posts,
    hashtags,
    verifiedRecords: [],
  });
}
