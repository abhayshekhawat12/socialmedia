import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";

    if (!query) {
      const { data: hashtags } = await supabaseServer
        .from("Hashtag")
        .select("*")
        .order("postCount", { ascending: false })
        .limit(10);

      const { data: topProfiles } = await supabaseServer
        .from("Profile")
        .select("*, user:User(*)")
        .limit(10);

      return NextResponse.json({
        success: true,
        hashtags: (hashtags || []).map((h) => ({
          tag: h.tag.startsWith("#") ? h.tag : `#${h.tag}`,
          count: `${(h.postCount / 1000).toFixed(1)}k posts`,
        })),
        accounts: (topProfiles || []).map((p) => ({
          address: p.user?.walletAddress || p.userId,
          name: p.displayName,
          handle: `@${p.username}`,
          avatar: p.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.userId}`,
          followers: "1.2k",
        })),
        posts: [],
      });
    }

    const cleanQ = query.replace("#", "").toLowerCase();

    // Profiles search
    const { data: profiles } = await supabaseServer
      .from("Profile")
      .select("*, user:User(*)")
      .or(`username.ilike.%${cleanQ}%,displayName.ilike.%${cleanQ}%`)
      .limit(10);

    // Posts search
    const { data: posts } = await supabaseServer
      .from("Post")
      .select("*")
      .ilike("caption", `%${query}%`)
      .limit(15);

    // Hashtags search
    const { data: hashtags } = await supabaseServer
      .from("Hashtag")
      .select("*")
      .ilike("tag", `%${cleanQ}%`)
      .limit(10);

    return NextResponse.json({
      success: true,
      accounts: (profiles || []).map((p) => ({
        address: p.user?.walletAddress || p.userId,
        name: p.displayName,
        handle: `@${p.username}`,
        avatar: p.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.userId}`,
        followers: "1.2k",
      })),
      posts: (posts || []).map((p) => ({
        id: p.id,
        image: p.mediaUrl,
        type: p.mediaType,
        likes: p.likeCount,
        comments: p.commentCount,
      })),
      hashtags: (hashtags || []).map((h) => ({
        tag: h.tag.startsWith("#") ? h.tag : `#${h.tag}`,
        count: `${h.postCount} posts`,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Search failed" }, { status: 500 });
  }
}
