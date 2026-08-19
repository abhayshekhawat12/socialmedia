import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, withTimestamps, withUpdatedTimestamp } from "@/lib/supabaseServer";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") || "forYou"; // forYou | following | trending
    const author = (searchParams.get("authorAddress") || searchParams.get("author"))?.toLowerCase();

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);

    let query = supabaseServer
      .from("Pulse")
      .select(`
        *,
        audio:Audio(*),
        likes:Like(userAddress),
        savedPulses:SavedPulse(userAddress)
      `)
      .range((page - 1) * limit, page * limit);

    if (tab === "trending") {
      query = query.order("pulseScore", { ascending: false });
    } else {
      query = query.order("createdAt", { ascending: false });
    }

    if (author) {
      query = query.eq("authorAddress", author);
    }

    const { data: pulses, error } = await query;

    if (error) {
      console.error("Supabase pulse fetch error:", error);
      throw new Error(error.message);
    }

    const pulseList = pulses || [];
    const hasMore = pulseList.length > limit;
    const paginatedPulses = hasMore ? pulseList.slice(0, limit) : pulseList;

    // Fetch author profiles
    const authorIdentifiers = Array.from(
      new Set(paginatedPulses.map((p) => (p.authorAddress || "").toLowerCase()))
    ).filter(Boolean);

    let profiles: any[] = [];
    if (authorIdentifiers.length > 0) {
      const { data: profileData } = await supabaseServer
        .from("Profile")
        .select("*, user:User(*)");
      profiles = profileData || [];
    }

    const profileMap = new Map<string, any>();
    for (const pr of profiles) {
      if (pr.user) {
        if (pr.user.walletAddress) profileMap.set(pr.user.walletAddress.toLowerCase(), pr);
        if (pr.user.id) profileMap.set(pr.user.id.toLowerCase(), pr);
        if (pr.user.email) profileMap.set(pr.user.email.toLowerCase(), pr);
      }
      if (pr.userId) profileMap.set(pr.userId.toLowerCase(), pr);
      if (pr.username) profileMap.set(pr.username.toLowerCase(), pr);
    }

    const enrichedPulses = paginatedPulses.map((p) => {
      const authorKey = (p.authorAddress || "").toLowerCase();
      const prof = profileMap.get(authorKey);
      return {
        ...p,
        author: {
          walletAddress: p.authorAddress,
          username: prof?.username || `user_${authorKey.slice(0, 8)}`,
          displayName: prof?.displayName || `Creator ${authorKey.slice(0, 6)}`,
          avatarUrl: prof?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${authorKey}`,
        },
      };
    });

    return NextResponse.json(
      {
        success: true,
        pulses: enrichedPulses,
        hasMore,
        page,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error: any) {
    console.error("Error fetching pulses:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch pulses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      authorAddress,
      videoUrl,
      videoCid = "",
      thumbnailUrl,
      caption,
      hashtags,
      category,
      audioTitle,
      audioId,
      filterName,
      privacy,
      allowComments,
      allowRemix,
      allowDownload,
      remixOfId,
    } = body;

    if (!authorAddress || !videoUrl || !caption) {
      return NextResponse.json({ error: "Author, video URL, and caption are required" }, { status: 400 });
    }

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

    const finalAuthorAddress = user?.walletAddress || user?.id || normalizedAuthor;
    const pulseScore = Math.floor(Math.random() * 15) + 85;

    const { data: newPulse, error: pulseErr } = await supabaseServer
      .from("Pulse")
      .insert(
        withTimestamps({
          authorAddress: finalAuthorAddress,
          videoUrl,
          videoCid: videoCid || "",
          thumbnailUrl: thumbnailUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
          caption,
          hashtags: hashtags || "#Pulse #Trending",
          category: category || "General",
          audioTitle: audioTitle || "Original Sound",
          audioId: audioId || null,
          filterName: filterName || "",
          privacy: privacy || "Everyone",
          allowComments: allowComments ?? true,
          allowRemix: allowRemix ?? true,
          allowDownload: allowDownload ?? true,
          remixOfId: remixOfId || null,
          pulseScore,
          authenticScore: 96,
        })
      )
      .select()
      .single();

    if (pulseErr || !newPulse) {
      throw new Error(pulseErr?.message || "Failed to create Pulse");
    }

    return NextResponse.json({ success: true, pulse: newPulse });
  } catch (error: any) {
    console.error("Error creating pulse:", error);
    return NextResponse.json({ error: error.message || "Failed to create Pulse" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, pulseId, userAddress, folder } = body;

    if (!pulseId) {
      return NextResponse.json({ error: "Pulse ID required" }, { status: 400 });
    }

    if (action === "like") {
      const { data: pulse } = await supabaseServer
        .from("Pulse")
        .select("likeCount")
        .eq("id", pulseId)
        .single();
      const currentCount = pulse?.likeCount || 0;
      const { data: updated } = await supabaseServer
        .from("Pulse")
        .update({ likeCount: currentCount + 1, updatedAt: new Date().toISOString() })
        .eq("id", pulseId)
        .select()
        .single();
      return NextResponse.json({ success: true, pulse: updated });
    }

    if (action === "save") {
      if (userAddress) {
        await supabaseServer.from("SavedPulse").upsert(
          withTimestamps({
            userAddress: userAddress.toLowerCase(),
            pulseId,
            folder: folder || "Favorites",
          })
        );
      }
      const { data: pulse } = await supabaseServer
        .from("Pulse")
        .select("saveCount")
        .eq("id", pulseId)
        .single();
      const currentCount = pulse?.saveCount || 0;
      const { data: updated } = await supabaseServer
        .from("Pulse")
        .update({ saveCount: currentCount + 1, updatedAt: new Date().toISOString() })
        .eq("id", pulseId)
        .select()
        .single();
      return NextResponse.json({ success: true, pulse: updated });
    }

    if (action === "share") {
      const { data: pulse } = await supabaseServer
        .from("Pulse")
        .select("shareCount")
        .eq("id", pulseId)
        .single();
      const currentCount = pulse?.shareCount || 0;
      const { data: updated } = await supabaseServer
        .from("Pulse")
        .update({ shareCount: currentCount + 1, updatedAt: new Date().toISOString() })
        .eq("id", pulseId)
        .select()
        .single();
      return NextResponse.json({ success: true, pulse: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update pulse action" }, { status: 500 });
  }
}
