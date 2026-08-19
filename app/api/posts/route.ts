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
    if (authorAddress) {
      // Allow searching by walletAddress or user ID or email
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { walletAddress: authorAddress },
            { id: authorAddress },
            { email: authorAddress },
          ],
        },
      });

      if (user) {
        where.OR = [
          { authorAddress: user.walletAddress || "" },
          { authorAddress: user.id },
          { authorAddress },
        ];
      } else {
        where.authorAddress = authorAddress;
      }
    }

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
          take: 10,
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

    // Collect all author addresses from posts & comments
    const authorIdentifiers = Array.from(
      new Set([
        ...paginatedPosts.map((p) => p.authorAddress.toLowerCase()),
        ...paginatedPosts.flatMap((p) => p.comments.map((c) => c.authorAddress.toLowerCase())),
      ])
    );

    // Fetch user profiles for all matching identifiers (walletAddress, id, email)
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
    for (const p of profiles) {
      if (p.user.walletAddress) profileMap.set(p.user.walletAddress.toLowerCase(), p);
      if (p.user.id) profileMap.set(p.user.id.toLowerCase(), p);
      if (p.user.email) profileMap.set(p.user.email.toLowerCase(), p);
    }

    const enrichedPosts = paginatedPosts.map((post) => {
      const authorKey = post.authorAddress.toLowerCase();
      const authorProf = profileMap.get(authorKey);

      return {
        ...post,
        authorProfile: authorProf || {
          username: `user_${authorKey.slice(0, 8)}`,
          displayName: `Creator ${authorKey.slice(0, 6)}`,
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${authorKey}`,
        },
        comments: post.comments.map((c) => {
          const commentAuthorKey = c.authorAddress.toLowerCase();
          const commentProf = profileMap.get(commentAuthorKey);
          return {
            ...c,
            authorProfile: commentProf || {
              username: `user_${commentAuthorKey.slice(0, 8)}`,
              displayName: `User ${commentAuthorKey.slice(0, 6)}`,
              avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${commentAuthorKey}`,
            },
          };
        }),
      };
    });

    return NextResponse.json(
      { success: true, posts: enrichedPosts, hasMore, page },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error: any) {
    console.error("Error fetching posts:", error);
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

    // Ensure user exists (check by walletAddress, id, or email)
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

    // Unify authorAddress with the user's primary walletAddress or id
    const finalAuthorAddress = user.walletAddress || user.id || normalizedAuthor;

    // Create post in database
    const post = await prisma.post.create({
      data: {
        ...(id && { id }),
        authorAddress: finalAuthorAddress,
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
          try {
            await prisma.hashtag.upsert({
              where: { tag },
              create: { tag, postCount: 1 },
              update: { postCount: { increment: 1 } },
            });
          } catch (e) {
            console.warn("Hashtag upsert error:", e);
          }
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
    console.error("Error creating post:", error);
    return NextResponse.json({ error: error.message || "Failed to create post" }, { status: 500 });
  }
}
