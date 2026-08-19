import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, withTimestamps } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id;
    const { data: comments, error } = await supabaseServer
      .from("Comment")
      .select("*")
      .eq("postId", postId)
      .order("createdAt", { ascending: false });

    if (error) {
      return NextResponse.json({ success: true, comments: [] });
    }

    const commentList = comments || [];
    const authorAddresses = Array.from(new Set(commentList.map((c) => (c.authorAddress || "").toLowerCase()))).filter(Boolean);

    let profiles: any[] = [];
    if (authorAddresses.length > 0) {
      const { data: profileData } = await supabaseServer
        .from("Profile")
        .select("*, user:User(*)");
      profiles = profileData || [];
    }

    const profileMap = new Map<string, any>();
    for (const p of profiles) {
      if (p.user?.walletAddress) profileMap.set(p.user.walletAddress.toLowerCase(), p);
      if (p.userId) profileMap.set(p.userId.toLowerCase(), p);
      if (p.username) profileMap.set(p.username.toLowerCase(), p);
    }

    const enriched = commentList.map((c) => {
      const authorKey = (c.authorAddress || "").toLowerCase();
      const prof = profileMap.get(authorKey);
      return {
        ...c,
        authorProfile: {
          username: prof?.username || `user_${authorKey.slice(0, 8)}`,
          displayName: prof?.displayName || `User ${authorKey.slice(0, 6)}`,
          avatarUrl: prof?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${authorKey}`,
        },
      };
    });

    return NextResponse.json({ success: true, comments: enriched });
  } catch (error: any) {
    return NextResponse.json({ success: true, comments: [] });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { authorAddress, content } = await req.json();

    if (!authorAddress || !content) {
      return NextResponse.json({ error: "Author address and content required" }, { status: 400 });
    }

    const normalizedAuthor = authorAddress.toLowerCase();
    const postId = params.id;

    const { data: comment, error: commentErr } = await supabaseServer
      .from("Comment")
      .insert(
        withTimestamps({
          postId,
          authorAddress: normalizedAuthor,
          content,
        })
      )
      .select()
      .single();

    if (commentErr || !comment) {
      throw new Error(commentErr?.message || "Failed to create comment");
    }

    const { data: post } = await supabaseServer
      .from("Post")
      .select("id, authorAddress, commentCount")
      .eq("id", postId)
      .single();

    const newCommentCount = (post?.commentCount || 0) + 1;
    await supabaseServer
      .from("Post")
      .update({ commentCount: newCommentCount, updatedAt: new Date().toISOString() })
      .eq("id", postId);

    // Send notification to post author if not own comment
    if (post && post.authorAddress?.toLowerCase() !== normalizedAuthor) {
      await supabaseServer.from("Notification").insert(
        withTimestamps({
          recipientAddress: post.authorAddress.toLowerCase(),
          actorAddress: normalizedAuthor,
          type: "COMMENT",
          message: `commented: "${content.slice(0, 40)}${content.length > 40 ? "..." : ""}"`,
        })
      );
    }

    // Fetch author profile for newly created comment
    const { data: authorProfile } = await supabaseServer
      .from("Profile")
      .select("*, user:User(*)")
      .or(`userId.eq.${normalizedAuthor},username.eq.${normalizedAuthor}`)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      comment: {
        ...comment,
        authorProfile: authorProfile || {
          username: `user_${normalizedAuthor.slice(0, 8)}`,
          displayName: `User ${normalizedAuthor.slice(0, 6)}`,
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${normalizedAuthor}`,
        },
      },
      commentCount: newCommentCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Comment creation failed" }, { status: 500 });
  }
}
