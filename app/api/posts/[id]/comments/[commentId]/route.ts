import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get("userAddress")?.toLowerCase();
    const { id: postId, commentId } = params;

    if (!userAddress || !commentId) {
      return NextResponse.json({ error: "userAddress and commentId required" }, { status: 400 });
    }

    const { data: comment } = await supabaseServer
      .from("Comment")
      .select("*")
      .eq("id", commentId)
      .maybeSingle();

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.authorAddress.toLowerCase() !== userAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await supabaseServer.from("Comment").delete().eq("id", commentId);

    const { data: post } = await supabaseServer
      .from("Post")
      .select("commentCount")
      .eq("id", postId)
      .maybeSingle();

    const newCount = Math.max(0, (post?.commentCount || 1) - 1);
    await supabaseServer.from("Post").update({ commentCount: newCount, updatedAt: new Date().toISOString() }).eq("id", postId);

    return NextResponse.json({ success: true, message: "Comment deleted", commentCount: newCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete comment" }, { status: 500 });
  }
}
