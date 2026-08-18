import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { followerAddress, followingAddress } = await req.json();

    if (!followerAddress || !followingAddress) {
      return NextResponse.json({ error: "Follower and Following addresses required" }, { status: 400 });
    }

    const follower = followerAddress.toLowerCase();
    const following = followingAddress.toLowerCase();

    if (follower === following) {
      return NextResponse.json({ error: "Cannot follow self" }, { status: 400 });
    }

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerAddress_followingAddress: {
          followerAddress: follower,
          followingAddress: following,
        },
      },
    });

    if (existingFollow) {
      // Unfollow
      await prisma.follow.delete({
        where: { id: existingFollow.id },
      });

      return NextResponse.json({ success: true, isFollowing: false });
    } else {
      // Follow
      await prisma.follow.create({
        data: {
          followerAddress: follower,
          followingAddress: following,
        },
      });

      // Notification
      await prisma.notification.create({
        data: {
          recipientAddress: following,
          senderAddress: follower,
          type: "FOLLOW",
          title: "New Follower",
          message: `User ${follower.slice(0, 6)}... started following you`,
          link: `/profile/${follower}`,
        },
      });

      return NextResponse.json({ success: true, isFollowing: true });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Follow operation failed" }, { status: 500 });
  }
}
