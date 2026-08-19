import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, withTimestamps } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { followerAddress, followingAddress } = body;

    if (!followerAddress || !followingAddress) {
      return NextResponse.json({ error: "Follower and following addresses required" }, { status: 400 });
    }

    const follower = followerAddress.toLowerCase();
    const following = followingAddress.toLowerCase();

    if (follower === following) {
      return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
    }

    const { data: existingFollow } = await supabaseServer
      .from("Follow")
      .select("id")
      .eq("followerAddress", follower)
      .eq("followingAddress", following)
      .maybeSingle();

    if (existingFollow) {
      // Unfollow
      await supabaseServer.from("Follow").delete().eq("id", existingFollow.id);
      return NextResponse.json({ success: true, isFollowing: false, action: "unfollowed" });
    } else {
      // Follow
      await supabaseServer.from("Follow").insert(
        withTimestamps({
          followerAddress: follower,
          followingAddress: following,
        })
      );

      // Notification to followed user
      await supabaseServer.from("Notification").insert(
        withTimestamps({
          recipientAddress: following,
          senderAddress: follower,
          type: "FOLLOW",
          title: "New Follower 🎉",
          message: "started following you",
          link: `/profile/${follower}`,
          read: false,
        })
      );

      return NextResponse.json({ success: true, isFollowing: true, action: "followed" });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update follow status" }, { status: 500 });
  }
}
