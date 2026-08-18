import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const post = await prisma.post.update({
      where: { id: params.id },
      data: { viewsCount: { increment: 1 } },
      include: {
        likes: true,
        comments: {
          orderBy: { createdAt: "asc" },
        },
        verifications: true,
        nfts: true,
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const authorProfile = await prisma.profile.findFirst({
      where: {
        user: { walletAddress: post.authorAddress },
      },
      include: { user: true },
    });

    // Populate commenter profiles
    const commenterAddresses = Array.from(new Set(post.comments.map((c) => c.authorAddress)));
    const commenterProfiles = await prisma.profile.findMany({
      where: {
        user: { walletAddress: { in: commenterAddresses } },
      },
      include: { user: true },
    });

    const commenterProfileMap = new Map(commenterProfiles.map((p) => [p.userId, p]));

    const enrichedComments = post.comments.map((comment) => {
      const p = commenterProfiles.find((pr) => pr.user?.walletAddress === comment.authorAddress);
      return {
        ...comment,
        authorProfile: p || {
          username: `creator_${comment.authorAddress.slice(2, 8)}`,
          displayName: `User ${comment.authorAddress.slice(0, 6)}`,
          avatarUrl: "",
        },
      };
    });

    return NextResponse.json({
      success: true,
      post: {
        ...post,
        comments: enrichedComments,
        authorProfile: authorProfile || {
          username: `creator_${post.authorAddress.slice(2, 8)}`,
          displayName: `Creator ${post.authorAddress.slice(0, 6)}`,
          avatarUrl: "",
          web3ProfileId: `web3_id_${post.authorAddress.slice(2, 10)}`,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Post not found" }, { status: 404 });
  }
}
