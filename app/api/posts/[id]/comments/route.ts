import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { authorAddress, content } = await req.json();

    if (!authorAddress || !content) {
      return NextResponse.json({ error: "Author address and content required" }, { status: 400 });
    }

    const normalizedAuthor = authorAddress.toLowerCase();
    const postId = params.id;

    const comment = await prisma.comment.create({
      data: {
        postId,
        authorAddress: normalizedAuthor,
        content,
      },
    });

    const post = await prisma.post.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } },
    });

    // Send notification to post author
    if (post.authorAddress !== normalizedAuthor) {
      await prisma.notification.create({
        data: {
          recipientAddress: post.authorAddress,
          senderAddress: normalizedAuthor,
          type: "COMMENT",
          title: "New Comment",
          message: `User ${normalizedAuthor.slice(0, 6)}... commented on your post`,
          link: `/post/${postId}`,
        },
      });
    }

    const authorProfile = await prisma.profile.findFirst({
      where: { user: { walletAddress: normalizedAuthor } },
    });

    return NextResponse.json({
      success: true,
      comment: {
        ...comment,
        authorProfile: authorProfile || {
          username: `user_${normalizedAuthor.slice(0, 8)}`,
          displayName: `User ${normalizedAuthor.slice(0, 6)}`,
          avatarUrl: "",
        },
      },
      commentCount: post.commentCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Comment creation failed" }, { status: 500 });
  }
}
