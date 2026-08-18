import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuthToken } from "@/lib/auth";

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

  const followersCount = await prisma.follow.count({
    where: { followingAddress: address },
  });

  const followingCount = await prisma.follow.count({
    where: { followerAddress: address },
  });

  const postsCount = await prisma.post.count({
    where: { authorAddress: address },
  });

  const nftsCount = await prisma.nFT.count({
    where: { ownerAddress: address },
  });

  return NextResponse.json({
    profile,
    stats: {
      followersCount,
      followingCount,
      postsCount,
      nftsCount,
    },
  });
}

export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    let walletAddress: string | null = null;
    if (token) {
      const session = verifyAuthToken(token);
      if (session) walletAddress = session.walletAddress;
    }

    const body = await req.json();
    const targetAddress = body.walletAddress?.toLowerCase() || walletAddress;

    if (!targetAddress) {
      return NextResponse.json({ error: "Unauthorized wallet request" }, { status: 401 });
    }

    const { username, displayName, bio, avatarUrl, bannerUrl, avatarCid, web3ProfileId } = body;

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
        username: username || `creator_${targetAddress.slice(2, 8)}`,
        displayName: displayName || `Creator ${targetAddress.slice(0, 6)}`,
        bio: bio || "",
        avatarUrl: avatarUrl || "",
        bannerUrl: bannerUrl || "",
        avatarCid: avatarCid || "",
        web3ProfileId: web3ProfileId || `web3_id_${targetAddress.slice(2, 10)}`,
      },
      update: {
        ...(username && { username }),
        ...(displayName && { displayName }),
        ...(bio !== undefined && { bio }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(bannerUrl !== undefined && { bannerUrl }),
        ...(avatarCid !== undefined && { avatarCid }),
        ...(web3ProfileId !== undefined && { web3ProfileId }),
      },
    });

    return NextResponse.json({ success: true, profile: updatedProfile });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update profile" }, { status: 500 });
  }
}
