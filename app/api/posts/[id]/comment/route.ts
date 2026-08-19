import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, withTimestamps } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

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
      .update({ commentCount: newCommentCount })
      .eq("id", postId);

    // Send notification
    if (post && post.authorAddress !== normalizedAuthor) {
      await supabaseServer.from("Notification").insert(
        withTimestamps({
          recipientAddress: post.authorAddress,
          senderAddress: normalizedAuthor,
          type: "COMMENT",
          title: "New Comment",
          message: `User ${normalizedAuthor.slice(0, 6)}... commented on your post`,
          link: `/post/${postId}`,
        })
      );
    }

    const { data: authorProfile } = await supabaseServer
      .from("Profile")
      .select("*, user:User(*)")
      .or(`username.eq.${normalizedAuthor}`)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      comment: {
        ...comment,
        authorProfile: authorProfile || {
          username: `user_${normalizedAuthor.slice(0, 8)}`,
          displayName: `User ${normalizedAuthor.slice(0, 6)}`,
          avatarUrl: "",
        },
      },
      commentCount: newCommentCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Comment creation failed" }, { status: 500 });
  }
}
