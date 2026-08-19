import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, withTimestamps } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get("userAddress")?.toLowerCase();

    if (!userAddress) {
      return NextResponse.json({ error: "User address required" }, { status: 400 });
    }

    const { data: savedPosts } = await supabaseServer
      .from("SavedPost")
      .select("*, post:Post(*)")
      .eq("userAddress", userAddress);

    const { data: savedPulses } = await supabaseServer
      .from("SavedPulse")
      .select("*, pulse:Pulse(*)")
      .eq("userAddress", userAddress);

    const posts = (savedPosts || [])
      .filter((s) => s.post)
      .map((s) => ({
        id: s.post.id,
        imageUrl: s.post.mediaUrl,
        type: s.post.mediaType,
        likesCount: s.post.likeCount,
        commentsCount: s.post.commentCount,
        folder: s.folder,
      }));

    const reels = (savedPulses || [])
      .filter((s) => s.pulse)
      .map((s) => ({
        id: s.pulse.id,
        videoUrl: s.pulse.videoUrl,
        thumbnailUrl: s.pulse.thumbnailUrl,
        likesCount: s.pulse.likeCount,
        viewsCount: s.pulse.viewsCount,
        folder: s.folder,
      }));

    return NextResponse.json({
      success: true,
      items: [...posts, ...reels],
      posts,
      reels,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch saved items" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userAddress, targetId, postId, pulseId, targetType = "post", folder = "All" } = body;
    const finalTargetId = targetId || (targetType === "pulse" || targetType === "reel" ? pulseId : postId);

    if (!userAddress || !finalTargetId) {
      return NextResponse.json({ error: "User address and target ID required" }, { status: 400 });
    }

    const normalizedUser = userAddress.toLowerCase();

    if (targetType === "pulse" || targetType === "reel") {
      const { data: existing } = await supabaseServer
        .from("SavedPulse")
        .select("id")
        .eq("userAddress", normalizedUser)
        .eq("pulseId", finalTargetId)
        .maybeSingle();

      if (existing) {
        await supabaseServer.from("SavedPulse").delete().eq("id", existing.id);
        return NextResponse.json({ success: true, saved: false });
      } else {
        await supabaseServer.from("SavedPulse").insert(
          withTimestamps({
            userAddress: normalizedUser,
            pulseId: finalTargetId,
            folder,
          })
        );
        return NextResponse.json({ success: true, saved: true });
      }
    } else {
      const { data: existing } = await supabaseServer
        .from("SavedPost")
        .select("id")
        .eq("userAddress", normalizedUser)
        .eq("postId", finalTargetId)
        .maybeSingle();

      if (existing) {
        await supabaseServer.from("SavedPost").delete().eq("id", existing.id);
        return NextResponse.json({ success: true, saved: false });
      } else {
        await supabaseServer.from("SavedPost").insert(
          withTimestamps({
            userAddress: normalizedUser,
            postId: finalTargetId,
            folder,
          })
        );
        return NextResponse.json({ success: true, saved: true });
      }
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to toggle save" }, { status: 500 });
  }
}
