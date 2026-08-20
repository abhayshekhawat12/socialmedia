import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, withCreatedAt } from "@/lib/supabaseServer";
import { verifyAuthToken } from "@/lib/auth";
import crypto from "crypto";

export const dynamic = "force-dynamic";

async function resolveUserCanonicalId(identifier: string): Promise<string | null> {
  if (!identifier) return null;
  const clean = identifier.toLowerCase().trim();

  const { data: user } = await supabaseServer
    .from("User")
    .select("id, profile:Profile(username)")
    .or(`id.eq.${clean},walletAddress.eq.${clean},email.eq.${clean}`)
    .maybeSingle();

  if (user?.id) return user.id;

  const { data: prof } = await supabaseServer
    .from("Profile")
    .select("userId")
    .eq("username", clean)
    .maybeSingle();

  if (prof?.userId) return prof.userId;

  return clean;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const followerParam = searchParams.get("followerId") || searchParams.get("followerAddress");
    const followingParam = searchParams.get("followingId") || searchParams.get("followingAddress");

    if (!followingParam) {
      return NextResponse.json({ error: "followingId is required" }, { status: 400 });
    }

    const targetUserId = await resolveUserCanonicalId(followingParam);
    const currentUserId = followerParam ? await resolveUserCanonicalId(followerParam) : null;

    if (!targetUserId) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    // Get exact follower and following counts from database
    const [
      { count: followersCount },
      { count: followingCount },
    ] = await Promise.all([
      supabaseServer.from("Follow").select("*", { count: "exact", head: true }).eq("followingAddress", targetUserId),
      supabaseServer.from("Follow").select("*", { count: "exact", head: true }).eq("followerAddress", targetUserId),
    ]);

    let isFollowing = false;
    if (currentUserId && currentUserId !== targetUserId) {
      const { data: followRecord } = await supabaseServer
        .from("Follow")
        .select("id")
        .eq("followerAddress", currentUserId)
        .eq("followingAddress", targetUserId)
        .maybeSingle();

      isFollowing = Boolean(followRecord);
    }

    return NextResponse.json({
      success: true,
      isFollowing,
      followersCount: followersCount || 0,
      followingCount: followingCount || 0,
    });
  } catch (error: any) {
    console.error("GET follow error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch follow status" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("block_social_jwt")?.value;
    const token = authHeader?.replace("Bearer ", "") || cookieToken;

    let authUserId: string | null = null;
    if (token) {
      const session = verifyAuthToken(token);
      if (session?.userId) authUserId = session.userId;
    }

    const body = await req.json();
    const { followerAddress, followingAddress, followerId, followingId } = body;

    const rawFollower = authUserId || followerId || followerAddress;
    const rawFollowing = followingId || followingAddress;

    if (!rawFollower || !rawFollowing) {
      return NextResponse.json({ error: "Follower and following IDs are required" }, { status: 400 });
    }

    const follower = await resolveUserCanonicalId(rawFollower);
    const following = await resolveUserCanonicalId(rawFollowing);

    if (!follower || !following) {
      return NextResponse.json({ error: "Invalid user identifiers" }, { status: 400 });
    }

    if (follower === following) {
      return NextResponse.json({ error: "You cannot follow yourself" }, { status: 400 });
    }

    // Check if relationship exists in DB
    const { data: existingFollow } = await supabaseServer
      .from("Follow")
      .select("id")
      .eq("followerAddress", follower)
      .eq("followingAddress", following)
      .maybeSingle();

    let isFollowing = false;
    let action = "unfollowed";

    if (existingFollow) {
      // Unfollow
      await supabaseServer.from("Follow").delete().eq("id", existingFollow.id);
      isFollowing = false;
      action = "unfollowed";
    } else {
      // Follow
      const { error: insErr } = await supabaseServer.from("Follow").insert(
        withCreatedAt({
          id: crypto.randomUUID(),
          followerAddress: follower,
          followingAddress: following,
        })
      );

      if (insErr) {
        console.error("Follow insert error:", insErr);
        throw new Error(insErr.message);
      }

      isFollowing = true;
      action = "followed";

      // Send in-app notification to followed user
      await supabaseServer.from("Notification").insert(
        withCreatedAt({
          id: crypto.randomUUID(),
          recipientAddress: following,
          senderAddress: follower,
          type: "FOLLOW",
          title: "New Follower 🎉",
          message: "started following you",
          link: `/profile/${follower}`,
          read: false,
        })
      );
    }

    // Query fresh counts directly from DB
    const [
      { count: followersCount },
      { count: followingCount },
    ] = await Promise.all([
      supabaseServer.from("Follow").select("*", { count: "exact", head: true }).eq("followingAddress", following),
      supabaseServer.from("Follow").select("*", { count: "exact", head: true }).eq("followerAddress", follower),
    ]);

    return NextResponse.json({
      success: true,
      isFollowing,
      action,
      followersCount: followersCount || 0,
      followingCount: followingCount || 0,
    });
  } catch (error: any) {
    console.error("POST follow error:", error);
    return NextResponse.json({ error: error.message || "Failed to update follow status" }, { status: 500 });
  }
}
