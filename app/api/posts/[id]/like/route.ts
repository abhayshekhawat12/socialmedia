import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userAddress } = await req.json();

    if (!userAddress) {
      return NextResponse.json({ error: "User wallet address required" }, { status: 400 });
    }

    const normalizedUser = userAddress.toLowerCase();
    const postId = params.id;

    const existingLike = await prisma.like.findUnique({
      where: {
        postId_userAddress: {
          postId,
          userAddress: normalizedUser,
        },
      },
    });

    if (existingLike) {
      // Unlike
      await prisma.like.delete({
        where: { id: existingLike.id },
      });

      const post = await prisma.post.update({
        where: { id: postId },
        data: { likeCount: { decrement: 1 } },
      });

      return NextResponse.json({ success: true, liked: false, likeCount: post.likeCount });
    } else {
      // Like
      await prisma.like.create({
        data: {
          postId,
          userAddress: normalizedUser,
        },
      });

      const post = await prisma.post.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
      });

      // Notification trigger
      if (post.authorAddress !== normalizedUser) {
        await prisma.notification.create({
          data: {
            recipientAddress: post.authorAddress,
            senderAddress: normalizedUser,
            type: "LIKE",
            title: "New Like",
            message: `User ${normalizedUser.slice(0, 6)}... liked your post`,
            link: `/post/${postId}`,
          },
        });
      }

      return NextResponse.json({ success: true, liked: true, likeCount: post.likeCount });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Like action failed" }, { status: 500 });
  }
}
