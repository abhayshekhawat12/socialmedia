import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, withTimestamps } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userAddress } = await req.json();

    if (!userAddress) {
      return NextResponse.json({ error: "User wallet address required" }, { status: 400 });
    }

    const normalizedUser = userAddress.toLowerCase();
    const postId = params.id;

    // Check existing like
    const { data: existingLike } = await supabaseServer
      .from("Like")
      .select("*")
      .eq("postId", postId)
      .eq("userAddress", normalizedUser)
      .maybeSingle();

    const { data: post } = await supabaseServer
      .from("Post")
      .select("id, authorAddress, likeCount")
      .eq("id", postId)
      .single();

    const currentLikes = post?.likeCount || 0;

    if (existingLike) {
      // Unlike
      await supabaseServer
        .from("Like")
        .delete()
        .eq("id", existingLike.id);

      const newLikeCount = Math.max(0, currentLikes - 1);
      await supabaseServer
        .from("Post")
        .update({ likeCount: newLikeCount })
        .eq("id", postId);

      return NextResponse.json({ success: true, liked: false, likeCount: newLikeCount });
    } else {
      // Like
      await supabaseServer
        .from("Like")
        .insert(
          withTimestamps({
            postId,
            userAddress: normalizedUser,
          })
        );

      const newLikeCount = currentLikes + 1;
      await supabaseServer
        .from("Post")
        .update({ likeCount: newLikeCount })
        .eq("id", postId);

      // Notification
      if (post && post.authorAddress !== normalizedUser) {
        await supabaseServer.from("Notification").insert(
          withTimestamps({
            recipientAddress: post.authorAddress,
            senderAddress: normalizedUser,
            type: "LIKE",
            title: "New Like",
            message: `User ${normalizedUser.slice(0, 6)}... liked your post`,
            link: `/post/${postId}`,
          })
        );
      }

      return NextResponse.json({ success: true, liked: true, likeCount: newLikeCount });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Like action failed" }, { status: 500 });
  }
}
