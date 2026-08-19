import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id;

    // Fetch post with likes, savedPosts, comments
    const { data: post, error } = await supabaseServer
      .from("Post")
      .select(`
        *,
        likes:Like(*),
        savedPosts:SavedPost(*),
        comments:Comment(*)
      `)
      .eq("id", postId)
      .single();

    if (error || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Increment views
    await supabaseServer
      .from("Post")
      .update({ viewsCount: (post.viewsCount || 0) + 1 })
      .eq("id", postId);

    // Fetch author profile
    const { data: authorProfile } = await supabaseServer
      .from("Profile")
      .select("*, user:User(*)")
      .or(`username.eq.${post.authorAddress}`)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      post: {
        ...post,
        authorProfile: authorProfile || {
          username: `user_${post.authorAddress.slice(0, 8)}`,
          displayName: `Creator ${post.authorAddress.slice(0, 6)}`,
          avatarUrl: "",
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Post not found" }, { status: 404 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get("userAddress")?.toLowerCase();
    const postId = params.id;

    if (!userAddress || !postId) {
      return NextResponse.json({ error: "userAddress and postId required" }, { status: 400 });
    }

    const { data: post } = await supabaseServer
      .from("Post")
      .select("*")
      .eq("id", postId)
      .single();

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.authorAddress.toLowerCase() !== userAddress) {
      return NextResponse.json({ error: "Unauthorized to delete this post" }, { status: 403 });
    }

    // Delete post
    await supabaseServer
      .from("Post")
      .delete()
      .eq("id", postId);

    return NextResponse.json({
      success: true,
      message: "Post deleted permanently",
      postId,
    });
  } catch (error: any) {
    console.error("DELETE /api/posts/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete post" }, { status: 500 });
  }
}
