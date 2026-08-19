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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, comments: comments || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch comments" }, { status: 500 });
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
      .update({ commentCount: newCommentCount })
      .eq("id", postId);

    return NextResponse.json({
      success: true,
      comment,
      commentCount: newCommentCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Comment creation failed" }, { status: 500 });
  }
}
