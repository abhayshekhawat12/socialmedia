import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

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
        savedPosts: true,
        comments: {
          orderBy: { createdAt: "asc" },
        },
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

    const enrichedComments = post.comments.map((comment) => {
      const p = commenterProfiles.find((pr) => pr.user?.walletAddress === comment.authorAddress);
      return {
        ...comment,
        authorProfile: p || {
          username: `user_${comment.authorAddress.slice(0, 8)}`,
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
          username: `user_${post.authorAddress.slice(0, 8)}`,
          displayName: `Creator ${post.authorAddress.slice(0, 6)}`,
          avatarUrl: "",
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Post not found" }, { status: 404 });
  }
}

// DELETE /api/posts/[id]?userAddress=...
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get("userAddress")?.toLowerCase();
    const postId = params.id;

    if (!userAddress || !postId) {
      return NextResponse.json({ error: "userAddress and postId required" }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.authorAddress.toLowerCase() !== userAddress) {
      return NextResponse.json({ error: "Unauthorized to delete this post" }, { status: 403 });
    }

    // Try deleting media from disk if it was stored locally in public/uploads
    if (post.mediaUrl && post.mediaUrl.startsWith("/uploads/")) {
      try {
        const filePath = path.join(process.cwd(), "public", post.mediaUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fileErr) {
        console.warn("Could not delete file from disk:", fileErr);
      }
    }

    // Delete post record (cascade deletes likes, comments, savedPosts, shares, views)
    await prisma.post.delete({
      where: { id: postId },
    });

    return NextResponse.json({
      success: true,
      message: "Post deleted permanently",
      postId,
    });
  } catch (error: any) {
    console.error("DELETE /api/posts/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete post" }, { status: 500 });
  }
}
