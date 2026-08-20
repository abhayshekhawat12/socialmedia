import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, withTimestamps, withCreatedAt } from "@/lib/supabaseServer";
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

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pulseId = params.id;
    const { data: comments, error } = await supabaseServer
      .from("Comment")
      .select("*")
      .eq("pulseId", pulseId)
      .order("createdAt", { ascending: false })
      .limit(60);

    if (error) {
      return NextResponse.json({ success: true, comments: [] });
    }

    const commentList = comments || [];
    const authorAddresses = Array.from(
      new Set(commentList.map((c) => (c.authorAddress || "").toLowerCase()))
    ).filter(Boolean);

    let profiles: any[] = [];
    if (authorAddresses.length > 0) {
      const { data: profileData } = await supabaseServer
        .from("Profile")
        .select("*, user:User(*)");
      profiles = profileData || [];
    }

    const profileMap = new Map<string, any>();
    for (const p of profiles) {
      if (p.user?.id) profileMap.set(p.user.id.toLowerCase(), p);
      if (p.user?.walletAddress) profileMap.set(p.user.walletAddress.toLowerCase(), p);
      if (p.user?.email) profileMap.set(p.user.email.toLowerCase(), p);
      if (p.userId) profileMap.set(p.userId.toLowerCase(), p);
      if (p.username) profileMap.set(p.username.toLowerCase(), p);
    }

    const formatted = commentList.map((c) => {
      const authorKey = (c.authorAddress || "").toLowerCase();
      const prof = profileMap.get(authorKey);
      return {
        id: c.id,
        authorAddress: c.authorAddress,
        content: c.content,
        createdAt: c.createdAt,
        authorProfile: {
          username: prof?.username || `user_${authorKey.slice(0, 8)}`,
          displayName: prof?.displayName || `User ${authorKey.slice(0, 6)}`,
          avatarUrl: prof?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${authorKey}`,
        },
      };
    });

    return NextResponse.json({ success: true, comments: formatted });
  } catch (error: any) {
    return NextResponse.json({ success: true, comments: [] });
  }
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

    const body = await req.json();
    const { authorAddress, content } = body;

    const rawAuthor = authUserId || authorAddress;
    if (!rawAuthor || !content || !content.trim()) {
      return NextResponse.json({ error: "Author address and content required" }, { status: 400 });
    }

    const canonicalAuthorId = await resolveCanonicalUserId(rawAuthor);
    if (!canonicalAuthorId) {
      return NextResponse.json({ error: "Author not found" }, { status: 404 });
    }

    const pulseId = params.id;

    const { data: comment, error: commentErr } = await supabaseServer
      .from("Comment")
      .insert(
        withCreatedAt({
          id: crypto.randomUUID(),
          pulseId,
          authorAddress: canonicalAuthorId,
          content: content.trim(),
        })
      )
      .select()
      .single();

    if (commentErr || !comment) {
      throw new Error(commentErr?.message || "Failed to create comment");
    }

    const { data: currentPulse } = await supabaseServer
      .from("Pulse")
      .select("commentCount, authorAddress")
      .eq("id", pulseId)
      .maybeSingle();

    const newCount = (currentPulse?.commentCount || 0) + 1;
    await supabaseServer
      .from("Pulse")
      .update({ commentCount: newCount, updatedAt: new Date().toISOString() })
      .eq("id", pulseId);

    if (currentPulse && currentPulse.authorAddress?.toLowerCase() !== canonicalAuthorId.toLowerCase()) {
      await supabaseServer.from("Notification").insert(
        withTimestamps({
          recipientAddress: currentPulse.authorAddress,
          senderAddress: canonicalAuthorId,
          type: "COMMENT",
          title: "New Comment on Reel 💬",
          message: `commented on your Reel: "${content.slice(0, 35)}${content.length > 35 ? "..." : ""}"`,
          link: `/pulse`,
          read: false,
        })
      );
    }

    const { data: authorProfile } = await supabaseServer
      .from("Profile")
      .select("*, user:User(*)")
      .or(`userId.eq.${canonicalAuthorId},username.eq.${canonicalAuthorId}`)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      comment: {
        ...comment,
        authorProfile: authorProfile
          ? {
              username: authorProfile.username,
              displayName: authorProfile.displayName,
              avatarUrl: authorProfile.avatarUrl,
            }
          : {
              username: `user_${canonicalAuthorId.slice(0, 8)}`,
              displayName: `User ${canonicalAuthorId.slice(0, 6)}`,
              avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${canonicalAuthorId}`,
            },
      },
      commentCount: newCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Comment creation failed" }, { status: 500 });
  }
}
