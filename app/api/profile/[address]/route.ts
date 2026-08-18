import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { address: string } }
) {
  const queryParam = params.address.toLowerCase();

  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { walletAddress: queryParam },
        { profile: { username: queryParam } },
      ],
    },
    include: {
      profile: true,
    },
  });

  if (!user || !user.profile) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }

  const walletAddress = user.walletAddress;

  const [posts, nfts, verifications, followersCount, followingCount] = await Promise.all([
    prisma.post.findMany({
      where: { authorAddress: walletAddress },
      orderBy: { createdAt: "desc" },
      include: {
        likes: true,
        comments: true,
        verifications: true,
        nfts: true,
      },
    }),
    prisma.nFT.findMany({
      where: { ownerAddress: walletAddress },
      include: { post: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contentVerification.findMany({
      where: { authorAddress: walletAddress },
      include: { post: true },
      orderBy: { verifiedAt: "desc" },
    }),
    prisma.follow.count({ where: { followingAddress: walletAddress } }),
    prisma.follow.count({ where: { followerAddress: walletAddress } }),
  ]);

  return NextResponse.json({
    user: {
      id: user.id,
      walletAddress: user.walletAddress,
      profile: user.profile,
    },
    posts,
    nfts,
    verifications,
    stats: {
      postsCount: posts.length,
      nftsCount: nfts.length,
      verificationsCount: verifications.length,
      followersCount,
      followingCount,
    },
  });
}
