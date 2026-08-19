import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";

    if (!query) {
      // 1. Fetch top trending hashtags
      const { data: hashtags } = await supabaseServer
        .from("Hashtag")
        .select("*")
        .order("postCount", { ascending: false })
        .limit(10);

      // 2. Fetch active creators
      const { data: topProfiles } = await supabaseServer
        .from("Profile")
        .select("*, user:User(*)")
        .limit(12);

      // 3. Fetch explore posts
      const { data: explorePosts } = await supabaseServer
        .from("Post")
        .select("*")
        .order("createdAt", { ascending: false })
        .limit(20);

      const formattedAccounts = (topProfiles || []).map((p) => {
        const address = p.user?.walletAddress || p.userId || p.user?.id;
        return {
          id: p.userId || p.user?.id,
          walletAddress: address,
          address,
          name: p.displayName || p.username,
          displayName: p.displayName || p.username,
          username: p.username || `user_${(address || "").slice(0, 6)}`,
          handle: `@${p.username || (address || "").slice(0, 6)}`,
          avatar: p.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${address}`,
          avatarUrl: p.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${address}`,
          bio: p.bio,
          followers: `${p.followersCount || 0}`,
          followersCount: p.followersCount || 0,
        };
      });

      return NextResponse.json({
        success: true,
        hashtags: (hashtags || []).map((h) => ({
          tag: h.tag.startsWith("#") ? h.tag : `#${h.tag}`,
          count: `${h.postCount || 0} posts`,
        })),
        users: formattedAccounts,
        accounts: formattedAccounts,
        posts: explorePosts || [],
      });
    }

    const cleanQ = query.replace("#", "").toLowerCase();

    // 1. Profiles & Users search (by username, displayName, or bio)
    const { data: profiles } = await supabaseServer
      .from("Profile")
      .select("*, user:User(*)")
      .or(`username.ilike.%${cleanQ}%,displayName.ilike.%${cleanQ}%,bio.ilike.%${cleanQ}%`)
      .limit(15);

    // 2. Search User table by email or walletAddress
    const { data: usersByEmail } = await supabaseServer
      .from("User")
      .select("*, profile:Profile(*)")
      .or(`email.ilike.%${cleanQ}%,walletAddress.ilike.%${cleanQ}%,id.ilike.%${cleanQ}%`)
      .limit(10);

    const mergedProfiles = new Map<string, any>();

    for (const p of profiles || []) {
      const key = (p.user?.walletAddress || p.userId || p.username || "").toLowerCase();
      if (key) mergedProfiles.set(key, p);
    }

    for (const u of usersByEmail || []) {
      const key = (u.walletAddress || u.id || u.email || "").toLowerCase();
      if (key && !mergedProfiles.has(key)) {
        mergedProfiles.set(key, {
          ...u.profile,
          user: u,
          userId: u.id,
          username: u.profile?.username || u.email?.split("@")[0] || `user_${u.id.slice(0, 6)}`,
          displayName: u.profile?.displayName || u.email?.split("@")[0] || "Pulse Creator",
          avatarUrl: u.profile?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.id}`,
        });
      }
    }

    const formattedUsers = Array.from(mergedProfiles.values()).map((p) => {
      const address = p.user?.walletAddress || p.userId || p.user?.id || p.id;
      return {
        id: p.userId || p.user?.id,
        walletAddress: address,
        address,
        name: p.displayName || p.username,
        displayName: p.displayName || p.username,
        username: p.username || `user_${(address || "").slice(0, 6)}`,
        handle: `@${p.username || (address || "").slice(0, 6)}`,
        avatar: p.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${address}`,
        avatarUrl: p.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${address}`,
        bio: p.bio,
        followers: `${p.followersCount || 0}`,
        followersCount: p.followersCount || 0,
      };
    });

    // 3. Posts search
    const { data: posts } = await supabaseServer
      .from("Post")
      .select("*")
      .ilike("caption", `%${query}%`)
      .limit(20);

    // 4. Hashtags search
    const { data: hashtags } = await supabaseServer
      .from("Hashtag")
      .select("*")
      .ilike("tag", `%${cleanQ}%`)
      .limit(10);

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      accounts: formattedUsers,
      posts: (posts || []).map((p) => ({
        id: p.id,
        mediaUrl: p.mediaUrl,
        mediaType: p.mediaType,
        caption: p.caption,
        likeCount: p.likeCount,
        commentCount: p.commentCount,
      })),
      hashtags: (hashtags || []).map((h) => ({
        tag: h.tag.startsWith("#") ? h.tag : `#${h.tag}`,
        count: `${h.postCount || 0} posts`,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Search failed" }, { status: 500 });
  }
}
