import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, withTimestamps } from "@/lib/supabaseServer";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const now = new Date().toISOString();
    
    // Fetch stories that have not expired yet
    const { data: stories, error } = await supabaseServer
      .from("Story")
      .select("*")
      .gt("expiresAt", now)
      .order("createdAt", { ascending: true });

    if (error) {
      console.error("Supabase fetch stories error:", error);
      return NextResponse.json({ success: true, groups: [] });
    }

    const storyList = stories || [];

    // Populate user profiles for each author
    const authorAddresses = Array.from(new Set(storyList.map((s) => (s.authorAddress || "").toLowerCase()))).filter(Boolean);
    
    let profiles: any[] = [];
    if (authorAddresses.length > 0) {
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

    // Group stories by author
    const groupedMap = new Map<string, any>();

    for (const story of storyList) {
      const authorLower = (story.authorAddress || "").toLowerCase();
      const profile = profileMap.get(authorLower) || {
        username: `creator_${authorLower.slice(0, 8)}`,
        displayName: `Creator ${authorLower.slice(0, 6)}`,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${authorLower}`,
      };

      if (!groupedMap.has(authorLower)) {
        groupedMap.set(authorLower, {
          authorAddress: authorLower,
          username: profile.username,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
          stories: [],
        });
      }
      groupedMap.get(authorLower).stories.push(story);
    }

    return NextResponse.json({ success: true, groups: Array.from(groupedMap.values()) });
  } catch (error: any) {
    console.error("Stories GET error:", error);
    return NextResponse.json({ success: true, groups: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { authorAddress, mediaUrl, mediaType, textContent, textBgColor = "#121212", audioTitle, audioUrl, privacy = "everyone" } = body;

    if (!authorAddress || !mediaType) {
      return NextResponse.json({ error: "Author address and media type required" }, { status: 400 });
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const normalizedAuthor = authorAddress.toLowerCase();

    // Ensure user exists
    let user: any = null;
    const { data: existingUser } = await supabaseServer
      .from("User")
      .select("*, profile:Profile(*)")
      .or(`walletAddress.eq.${normalizedAuthor},id.eq.${normalizedAuthor},email.eq.${normalizedAuthor}`)
      .maybeSingle();

    if (existingUser) {
      user = existingUser;
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
        await supabaseServer.from("Profile").insert(
          withTimestamps({
            userId: newUser.id,
            username: `user_${normalizedAuthor.slice(0, 8)}`,
            displayName: `User ${normalizedAuthor.slice(0, 6)}`,
          })
        );
      }
    }

    const finalAuthor = user?.walletAddress || user?.id || normalizedAuthor;

    const { data: story, error: storyErr } = await supabaseServer
      .from("Story")
      .insert(
        withTimestamps({
          authorAddress: finalAuthor,
          mediaUrl: mediaUrl || null,
          mediaType,
          textContent: textContent || null,
          textBgColor,
          audioTitle: audioTitle || null,
          audioUrl: audioUrl || null,
          privacy,
          expiresAt,
        })
      )
      .select()
      .single();

    if (storyErr || !story) {
      throw new Error(storyErr?.message || "Failed to save story");
    }

    return NextResponse.json({ success: true, story });
  } catch (error: any) {
    console.error("Story POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to post story" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const authorAddress = searchParams.get("authorAddress");

    if (!id || !authorAddress) {
      return NextResponse.json({ error: "Story ID and author address required" }, { status: 400 });
    }

    const { data: story } = await supabaseServer
      .from("Story")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    if (story.authorAddress.toLowerCase() !== authorAddress.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await supabaseServer.from("Story").delete().eq("id", id);
    return NextResponse.json({ success: true, message: "Story deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete story" }, { status: 500 });
  }
}
