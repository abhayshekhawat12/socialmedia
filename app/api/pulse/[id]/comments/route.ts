import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, withTimestamps } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

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
      .limit(50);

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
    const { authorAddress, content } = await req.json();

    if (!authorAddress || !content) {
      return NextResponse.json({ error: "Author address and content required" }, { status: 400 });
    }

    const normalizedAuthor = authorAddress.toLowerCase();
    const pulseId = params.id;

    const { data: comment, error: commentErr } = await supabaseServer
      .from("Comment")
      .insert(
        withTimestamps({
          pulseId,
          authorAddress: normalizedAuthor,
          content,
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

    if (currentPulse && currentPulse.authorAddress !== normalizedAuthor) {
      await supabaseServer.from("Notification").insert(
        withTimestamps({
          recipientAddress: currentPulse.authorAddress,
          senderAddress: normalizedAuthor,
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
      commentCount: newCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Comment creation failed" }, { status: 500 });
  }
}
