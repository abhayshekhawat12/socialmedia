import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuthToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("walletAddress")?.toLowerCase();

  if (!address) {
    return NextResponse.json({ error: "Address required" }, { status: 400 });
  }

  const profile = await prisma.profile.findFirst({
    where: {
      user: {
        walletAddress: address,
      },
    },
    include: {
      user: true,
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const [followersCount, followingCount, postsCount] = await Promise.all([
    prisma.follow.count({ where: { followingAddress: address } }),
    prisma.follow.count({ where: { followerAddress: address } }),
    prisma.post.count({ where: { authorAddress: address } }),
  ]);

  return NextResponse.json(
    {
      profile: {
        ...profile,
        nickname: profile.nickname || "",
      },
      user: profile.user,
      stats: {
        followersCount,
        followingCount,
        postsCount,
      },
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=60",
      },
    }
  );
}

export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    let walletAddress: string | null = null;
    if (token) {
      const session = verifyAuthToken(token);
      if (session) walletAddress = session.walletAddress || null;
    }

    const body = await req.json();
    const targetAddress = body.walletAddress?.toLowerCase() || walletAddress;

    if (!targetAddress) {
      return NextResponse.json({ error: "Unauthorized user request" }, { status: 401 });
    }

    const { username, displayName, nickname, bio, avatarUrl, bannerUrl } = body;

    const user = await prisma.user.findUnique({
      where: { walletAddress: targetAddress },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updatedProfile = await prisma.profile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        username: username || `user_${targetAddress.slice(0, 8)}`,
        displayName: displayName || `User ${targetAddress.slice(0, 6)}`,
        nickname: nickname || "",
        bio: bio || "",
        avatarUrl: avatarUrl || "",
        bannerUrl: bannerUrl || "",
      },
      update: {
        ...(username && { username }),
        ...(displayName && { displayName }),
        ...(nickname !== undefined && { nickname }),
        ...(bio !== undefined && { bio }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(bannerUrl !== undefined && { bannerUrl }),
      },
    });

    return NextResponse.json({ success: true, profile: updatedProfile });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update profile" }, { status: 500 });
  }
}
