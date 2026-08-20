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

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("block_social_jwt")?.value;
    const token = authHeader?.replace("Bearer ", "") || cookieToken;

    let authUserId: string | null = null;
    if (token) {
      const session = verifyAuthToken(token);
      if (session?.userId) authUserId = session.userId;
    }

    const { userAddress } = await req.json();
    const rawUser = authUserId || userAddress;

    if (!rawUser) {
      return NextResponse.json({ error: "User authentication required" }, { status: 400 });
    }

    const canonicalUserId = await resolveCanonicalUserId(rawUser);
    if (!canonicalUserId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const postId = params.id;

    // Get user aliases to find existing like
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

    // Check existing like
    const { data: existingLike } = await supabaseServer
      .from("Like")
      .select("id")
      .eq("postId", postId)
      .in("userAddress", userAliases)
      .maybeSingle();

    const { data: post } = await supabaseServer
      .from("Post")
      .select("id, authorAddress, likeCount")
      .eq("id", postId)
      .maybeSingle();

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const currentLikes = post.likeCount || 0;

    if (existingLike) {
      // Unlike
      await supabaseServer
        .from("Like")
        .delete()
        .eq("id", existingLike.id);

      const newLikeCount = Math.max(0, currentLikes - 1);
      await supabaseServer
        .from("Post")
        .update({ likeCount: newLikeCount, updatedAt: new Date().toISOString() })
        .eq("id", postId);

      return NextResponse.json({ success: true, liked: false, likeCount: newLikeCount });
    } else {
      // Like
      const { error: insErr } = await supabaseServer
        .from("Like")
        .insert(
          withCreatedAt({
            id: crypto.randomUUID(),
            postId,
            userAddress: canonicalUserId,
          })
        );

      if (insErr) {
        console.error("Like insert error:", insErr);
        throw new Error(insErr.message);
      }

      const newLikeCount = currentLikes + 1;
      await supabaseServer
        .from("Post")
        .update({ likeCount: newLikeCount, updatedAt: new Date().toISOString() })
        .eq("id", postId);

      // Notification
      if (post.authorAddress && post.authorAddress.toLowerCase() !== canonicalUserId.toLowerCase()) {
        const { data: authorProfile } = await supabaseServer
          .from("Profile")
          .select("displayName, username")
          .eq("userId", canonicalUserId)
          .maybeSingle();

        const senderName = authorProfile?.displayName || authorProfile?.username || "Someone";

        await supabaseServer.from("Notification").insert(
          withCreatedAt({
            id: crypto.randomUUID(),
            recipientAddress: post.authorAddress,
            senderAddress: canonicalUserId,
            type: "LIKE",
            title: "New Like ❤️",
            message: `${senderName} liked your post`,
            link: `/post/${postId}`,
            read: false,
          })
        );
      }

      return NextResponse.json({ success: true, liked: true, likeCount: newLikeCount });
    }
  } catch (error: any) {
    console.error("Post like error:", error);
    return NextResponse.json({ error: error.message || "Like action failed" }, { status: 500 });
  }
}
