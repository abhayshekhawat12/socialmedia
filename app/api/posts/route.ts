import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, withTimestamps, withUpdatedTimestamp } from "@/lib/supabaseServer";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const authorAddress = searchParams.get("authorAddress")?.toLowerCase();
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    let query = supabaseServer
      .from("Post")
      .select(`
        *,
        likes:Like(userAddress),
        savedPosts:SavedPost(userAddress),
        comments:Comment(id, authorAddress, content, createdAt)
      `)
      .order("createdAt", { ascending: false })
      .range((page - 1) * limit, page * limit);

    if (authorAddress) {
      query = query.eq("authorAddress", authorAddress);
    }

    const { data: posts, error } = await query;

    if (error) {
      console.error("Supabase fetch posts error:", error);
      throw new Error(error.message);
    }

    const postList = posts || [];
    const hasMore = postList.length > limit;
    const paginatedPosts = hasMore ? postList.slice(0, limit) : postList;

    // Collect all author addresses
    const authorIdentifiers = Array.from(
      new Set([
        ...paginatedPosts.map((p) => (p.authorAddress || "").toLowerCase()),
        ...paginatedPosts.flatMap((p) => (p.comments || []).map((c: any) => (c.authorAddress || "").toLowerCase())),
      ])
    ).filter(Boolean);

    // Fetch user profiles for all authors
    let profiles: any[] = [];
    if (authorIdentifiers.length > 0) {
      const { data: profileData } = await supabaseServer
        .from("Profile")
        .select("*, user:User(*)");
      profiles = profileData || [];
    }

    const profileMap = new Map<string, any>();
    for (const p of profiles) {
      if (p.user) {
        if (p.user.walletAddress) profileMap.set(p.user.walletAddress.toLowerCase(), p);
        if (p.user.id) profileMap.set(p.user.id.toLowerCase(), p);
        if (p.user.email) profileMap.set(p.user.email.toLowerCase(), p);
      }
      if (p.userId) profileMap.set(p.userId.toLowerCase(), p);
      if (p.username) profileMap.set(p.username.toLowerCase(), p);
    }

    const enrichedPosts = paginatedPosts.map((post) => {
      const authorKey = (post.authorAddress || "").toLowerCase();
      const authorProf = profileMap.get(authorKey);

      return {
        ...post,
        authorProfile: authorProf || {
          username: `user_${authorKey.slice(0, 8)}`,
          displayName: `Creator ${authorKey.slice(0, 6)}`,
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${authorKey}`,
        },
        comments: (post.comments || []).map((c: any) => {
          const commentAuthorKey = (c.authorAddress || "").toLowerCase();
          const commentProf = profileMap.get(commentAuthorKey);
          return {
            ...c,
            authorProfile: commentProf || {
              username: `user_${commentAuthorKey.slice(0, 8)}`,
              displayName: `User ${commentAuthorKey.slice(0, 6)}`,
              avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${commentAuthorKey}`,
            },
          };
        }),
      };
    });

    return NextResponse.json(
      { success: true, posts: enrichedPosts, hasMore, page },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error: any) {
    console.error("Error fetching posts:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      authorAddress,
      caption = "",
      mediaUrl = "",
      mediaCid = "",
      mediaType = "image",
      location = "",
      privacy = "public",
    } = body;

    if (!authorAddress || (!mediaUrl && !mediaCid)) {
      return NextResponse.json({ error: "Author address and media URL are required" }, { status: 400 });
    }

    const normalizedAuthor = authorAddress.toLowerCase();

    // Ensure user exists
    let user: any = null;
    let profile: any = null;

    const { data: existingUser } = await supabaseServer
      .from("User")
      .select("*, profile:Profile(*)")
      .or(`walletAddress.eq.${normalizedAuthor},id.eq.${normalizedAuthor},email.eq.${normalizedAuthor}`)
      .maybeSingle();

    if (existingUser) {
      user = existingUser;
      profile = Array.isArray(existingUser.profile) ? existingUser.profile[0] : existingUser.profile;
    } else {
      const newUserId = crypto.randomUUID();
      const { data: newUser } = await supabaseServer
        .from("User")
        .insert(
          withTimestamps({
            id: newUserId,
            walletAddress: normalizedAuthor,
          })
        )
        .select()
        .single();

      if (newUser) {
        user = newUser;
        const { data: newProfile } = await supabaseServer
          .from("Profile")
          .insert(
            withTimestamps({
              userId: newUser.id,
              username: `user_${normalizedAuthor.slice(0, 8)}`,
              displayName: `User ${normalizedAuthor.slice(0, 6)}`,
            })
          )
          .select()
          .single();
        profile = newProfile;
      }
    }

    const finalAuthorAddress = user?.walletAddress || user?.id || normalizedAuthor;

    // Create post in Supabase with guaranteed UUID and timestamps!
    const { data: post, error: postErr } = await supabaseServer
      .from("Post")
      .insert(
        withTimestamps({
          ...(id ? { id } : {}),
          authorAddress: finalAuthorAddress,
          caption,
          mediaUrl: mediaUrl || (mediaCid ? `/uploads/${mediaCid}` : ""),
          mediaCid: mediaCid || "",
          mediaType: mediaType || "image",
          location: location || "",
          privacy: privacy || "public",
        })
      )
      .select()
      .single();

    if (postErr || !post) {
      console.error("Supabase post insert error:", postErr);
      throw new Error(postErr?.message || "Failed to create post in database");
    }

    return NextResponse.json({
      success: true,
      post: {
        ...post,
        authorProfile: profile,
      },
    });
  } catch (error: any) {
    console.error("Error creating post:", error);
    return NextResponse.json({ error: error.message || "Failed to create post" }, { status: 500 });
  }
}
