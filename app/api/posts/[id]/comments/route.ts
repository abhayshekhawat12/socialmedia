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
    const postId = params.id;
    if (!postId) {
      return NextResponse.json({ success: true, comments: [] });
    }

    const { data: comments, error } = await supabaseServer
      .from("Comment")
      .select("*")
      .eq("postId", postId)
      .order("createdAt", { ascending: false });

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

    const enriched = commentList.map((c) => {
      const authorKey = (c.authorAddress || "").toLowerCase();
      const prof = profileMap.get(authorKey);
      return {
        id: c.id,
        postId: c.postId,
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

    return NextResponse.json({ success: true, comments: enriched, count: enriched.length });
  } catch (error: any) {
    console.error("GET comments error:", error);
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
      return NextResponse.json({ error: "Author and non-empty comment content are required" }, { status: 400 });
    }

    const canonicalAuthorId = (await resolveCanonicalUserId(rawAuthor)) || rawAuthor;
    const postId = params.id;

    // Verify post exists
    const { data: post } = await supabaseServer
      .from("Post")
      .select("id, authorAddress, commentCount")
      .eq("id", postId)
      .maybeSingle();

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const commentId = crypto.randomUUID();
    const commentData = withCreatedAt({
      id: commentId,
      postId,
      authorAddress: canonicalAuthorId,
      content: content.trim(),
    });

    // Insert comment with canonical User.id
    const { data: comment, error: commentErr } = await supabaseServer
      .from("Comment")
      .insert(commentData)
      .select()
      .single();

    if (commentErr || !comment) {
      console.error("Insert comment error:", commentErr);
      throw new Error(commentErr?.message || "Failed to create comment");
    }

    // Update comment count on post
    const newCommentCount = (post.commentCount || 0) + 1;
    supabaseServer
      .from("Post")
      .update({ commentCount: newCommentCount, updatedAt: new Date().toISOString() })
      .eq("id", postId)
      .then(() => {});

    // Send notification to post author if not own comment
    if (post.authorAddress && post.authorAddress.toLowerCase() !== canonicalAuthorId.toLowerCase()) {
      supabaseServer.from("Notification").insert(
        withTimestamps({
          recipientAddress: post.authorAddress,
          senderAddress: canonicalAuthorId,
          type: "COMMENT",
          title: "New Comment 💬",
          message: `commented: "${content.slice(0, 40)}${content.length > 40 ? "..." : ""}"`,
          link: `/post/${postId}`,
          read: false,
        })
      ).then(() => {});
    }

    // Fetch author profile for the comment response
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
      commentCount: newCommentCount,
    });
  } catch (error: any) {
    console.error("POST comment error:", error);
    return NextResponse.json({ error: error.message || "Comment creation failed" }, { status: 500 });
  }
}
