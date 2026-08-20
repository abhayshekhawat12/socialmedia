import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, withCreatedAt } from "@/lib/supabaseServer";
import { verifyAuthToken } from "@/lib/auth";
import crypto from "crypto";

export const dynamic = "force-dynamic";

async function resolveCanonicalUserId(identifier?: string | null): Promise<string | null> {
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
    const userAddress = searchParams.get("userAddress") || searchParams.get("userId");

    if (!userAddress) {
      return NextResponse.json({ error: "User identifier required" }, { status: 400 });
    }

    const canonicalUserId = await resolveCanonicalUserId(userAddress);
    if (!canonicalUserId) {
      return NextResponse.json({ success: true, items: [], posts: [], reels: [] });
    }

    const { data: userRecord } = await supabaseServer
      .from("User")
      .select("id, walletAddress, email")
      .eq("id", canonicalUserId)
      .maybeSingle();

    const userAliases = Array.from(
      new Set([
        canonicalUserId,
        userRecord?.walletAddress?.toLowerCase(),
        userRecord?.email?.toLowerCase(),
      ].filter(Boolean) as string[])
    );

    const { data: savedPosts } = await supabaseServer
      .from("SavedPost")
      .select("*, post:Post(*)")
      .in("userAddress", userAliases);

    const { data: savedPulses } = await supabaseServer
      .from("SavedPulse")
      .select("*, pulse:Pulse(*)")
      .in("userAddress", userAliases);

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
    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("block_social_jwt")?.value;
    const token = authHeader?.replace("Bearer ", "") || cookieToken;

    let authUserId: string | null = null;
    if (token) {
      const session = verifyAuthToken(token);
      if (session?.userId) authUserId = session.userId;
    }

    const body = await req.json();
    const { userAddress, targetId, postId, pulseId, targetType = "post", folder = "All" } = body;
    const rawUser = authUserId || userAddress;
    const finalTargetId = targetId || (targetType === "pulse" || targetType === "reel" ? pulseId : postId);

    if (!rawUser || !finalTargetId) {
      return NextResponse.json({ error: "User address and target ID required" }, { status: 400 });
    }

    const canonicalUserId = await resolveCanonicalUserId(rawUser);
    if (!canonicalUserId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data: userRecord } = await supabaseServer
      .from("User")
      .select("id, walletAddress, email")
      .eq("id", canonicalUserId)
      .maybeSingle();

    const userAliases = Array.from(
      new Set([
        canonicalUserId,
        userRecord?.walletAddress?.toLowerCase(),
        userRecord?.email?.toLowerCase(),
      ].filter(Boolean) as string[])
    );

    if (targetType === "pulse" || targetType === "reel") {
      const { data: existing } = await supabaseServer
        .from("SavedPulse")
        .select("id")
        .in("userAddress", userAliases)
        .eq("pulseId", finalTargetId)
        .maybeSingle();

      if (existing) {
        await supabaseServer.from("SavedPulse").delete().eq("id", existing.id);
        return NextResponse.json({ success: true, saved: false });
      } else {
        await supabaseServer.from("SavedPulse").insert(
          withCreatedAt({
            id: crypto.randomUUID(),
            userAddress: canonicalUserId,
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
        .in("userAddress", userAliases)
        .eq("postId", finalTargetId)
        .maybeSingle();

      if (existing) {
        await supabaseServer.from("SavedPost").delete().eq("id", existing.id);
        return NextResponse.json({ success: true, saved: false });
      } else {
        await supabaseServer.from("SavedPost").insert(
          withCreatedAt({
            id: crypto.randomUUID(),
            userAddress: canonicalUserId,
            postId: finalTargetId,
            folder,
          })
        );
        return NextResponse.json({ success: true, saved: true });
      }
    }
  } catch (error: any) {
    console.error("Saved post error:", error);
    return NextResponse.json({ error: error.message || "Failed to toggle save" }, { status: 500 });
  }
}
