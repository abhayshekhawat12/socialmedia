import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userAddress } = await req.json();

    if (!userAddress) {
      return NextResponse.json({ error: "User address required" }, { status: 400 });
    }

    const normalizedUser = userAddress.toLowerCase();
    const pulseId = params.id;

    const existingLike = await prisma.like.findUnique({
      where: {
        pulseId_userAddress: {
          pulseId,
          userAddress: normalizedUser,
        },
      },
    });

    if (existingLike) {
      // Unlike
      await prisma.like.delete({
        where: { id: existingLike.id },
      });

      const pulse = await prisma.pulse.update({
        where: { id: pulseId },
        data: { likeCount: { decrement: 1 } },
      });

      return NextResponse.json({ success: true, liked: false, likeCount: Math.max(0, pulse.likeCount) });
    } else {
      // Like
      await prisma.like.create({
        data: {
          pulseId,
          userAddress: normalizedUser,
        },
      });

      const pulse = await prisma.pulse.update({
        where: { id: pulseId },
        data: { likeCount: { increment: 1 } },
      });

      // Notification trigger
      if (pulse.authorAddress !== normalizedUser) {
        await prisma.notification.create({
          data: {
            recipientAddress: pulse.authorAddress,
            senderAddress: normalizedUser,
            type: "LIKE",
            title: "New Like on Reel",
            message: `User ${normalizedUser.slice(0, 6)}... liked your Reel`,
            link: `/pulse`,
          },
        });
      }

      return NextResponse.json({ success: true, liked: true, likeCount: pulse.likeCount });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Like action failed" }, { status: 500 });
  }
}
