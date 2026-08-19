import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, withTimestamps } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storyId = searchParams.get("storyId");

    if (!storyId) {
      return NextResponse.json({ error: "Story ID required" }, { status: 400 });
    }

    const { data: views, error } = await supabaseServer
      .from("StoryView")
      .select("*")
      .eq("storyId", storyId)
      .order("viewedAt", { ascending: false });

    if (error) {
      return NextResponse.json({ success: true, count: 0, viewers: [] });
    }

    const viewList = views || [];
    const viewerAddresses = Array.from(new Set(viewList.map((v) => (v.viewerAddress || "").toLowerCase()))).filter(Boolean);

    let profiles: any[] = [];
    if (viewerAddresses.length > 0) {
      const { data: profileData } = await supabaseServer
        .from("Profile")
        .select("*, user:User(*)");
      profiles = profileData || [];
    }

    const profileMap = new Map<string, any>();
    for (const p of profiles) {
      if (p.user) {
        if (p.user.walletAddress) profileMap.set(p.user.walletAddress.toLowerCase(), p);
        if (p.user.id) profileMap.set(p.user.id.toLowerCase(), p);
      }
      if (p.userId) profileMap.set(p.userId.toLowerCase(), p);
      if (p.username) profileMap.set(p.username.toLowerCase(), p);
    }

    const enrichedViewers = viewList.map((v) => {
      const viewerKey = (v.viewerAddress || "").toLowerCase();
      const profile = profileMap.get(viewerKey);
      return {
        viewerAddress: v.viewerAddress,
        viewedAt: v.viewedAt || v.createdAt,
        username: profile?.username || `user_${viewerKey.slice(0, 8)}`,
        displayName: profile?.displayName || `User ${viewerKey.slice(0, 6)}`,
        avatarUrl: profile?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${viewerKey}`,
      };
    });

    return NextResponse.json({
      success: true,
      count: viewList.length,
      viewers: enrichedViewers,
    });
  } catch (error: any) {
    return NextResponse.json({ success: true, count: 0, viewers: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { storyId, viewerAddress } = body;

    if (!storyId || !viewerAddress) {
      return NextResponse.json({ error: "Story ID and viewer address required" }, { status: 400 });
    }

    const normalizedViewer = viewerAddress.toLowerCase();

    // Check if story exists
    const { data: story } = await supabaseServer
      .from("Story")
      .select("id, viewsCount")
      .eq("id", storyId)
      .maybeSingle();

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    // Upsert story view
    await supabaseServer
      .from("StoryView")
      .upsert(
        withTimestamps({
          storyId,
          viewerAddress: normalizedViewer,
          viewedAt: new Date().toISOString(),
        })
      );

    // Update story viewsCount
    await supabaseServer
      .from("Story")
      .update({ viewsCount: (story.viewsCount || 0) + 1, updatedAt: new Date().toISOString() })
      .eq("id", storyId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to record view" }, { status: 500 });
  }
}
