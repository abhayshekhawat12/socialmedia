import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get("address")?.toLowerCase();

    if (!userAddress) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const { count: postsCount } = await supabaseServer
      .from("Post")
      .select("*", { count: "exact", head: true })
      .eq("authorAddress", userAddress);

    const { count: pulsesCount } = await supabaseServer
      .from("Pulse")
      .select("*", { count: "exact", head: true })
      .eq("authorAddress", userAddress);

    const { count: followersCount } = await supabaseServer
      .from("Follow")
      .select("*", { count: "exact", head: true })
      .eq("followingAddress", userAddress);

    const { count: followingCount } = await supabaseServer
      .from("Follow")
      .select("*", { count: "exact", head: true })
      .eq("followerAddress", userAddress);

    const { data: posts } = await supabaseServer
      .from("Post")
      .select("likeCount, commentCount")
      .eq("authorAddress", userAddress);

    const { data: pulses } = await supabaseServer
      .from("Pulse")
      .select("likeCount, commentCount, viewsCount")
      .eq("authorAddress", userAddress);

    const totalLikes = (posts || []).reduce((acc, p) => acc + (p.likeCount || 0), 0) +
      (pulses || []).reduce((acc, p) => acc + (p.likeCount || 0), 0);

    const totalViews = (pulses || []).reduce((acc, p) => acc + (p.viewsCount || 0), 0);

    return NextResponse.json({
      success: true,
      stats: {
        totalPosts: postsCount || 0,
        totalReels: pulsesCount || 0,
        followersCount: followersCount || 0,
        followingCount: followingCount || 0,
        totalLikes,
        totalViews,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load dashboard" }, { status: 500 });
  }
}
