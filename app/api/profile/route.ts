import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { verifyAuthToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawAddress = searchParams.get("walletAddress") || "";
    const address = rawAddress.toLowerCase().trim();

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    // Find profile or user
    let profile: any = null;
    let user: any = null;

    // Search by username or user relations
    const { data: profileByUsername } = await supabaseServer
      .from("Profile")
      .select("*, user:User(*)")
      .eq("username", address)
      .maybeSingle();

    if (profileByUsername) {
      profile = profileByUsername;
      user = profileByUsername.user;
    } else {
      const { data: userRecord } = await supabaseServer
        .from("User")
        .select("*, profile:Profile(*)")
        .or(`id.eq.${rawAddress},walletAddress.eq.${rawAddress},walletAddress.eq.${address},email.eq.${address}`)
        .maybeSingle();

      if (userRecord) {
        user = userRecord;
        profile = Array.isArray(userRecord.profile) ? userRecord.profile[0] : userRecord.profile;
      }
    }

    // Auto-provision fallback if authenticated user
    if (!profile) {
      const cookieToken = req.cookies.get("block_social_jwt")?.value;
      const authHeader = req.headers.get("authorization");
      const token = authHeader?.replace("Bearer ", "") || cookieToken;

      if (token) {
        const session = verifyAuthToken(token);
        if (session && (session.userId === rawAddress || session.email?.toLowerCase() === address || session.walletAddress === rawAddress)) {
          const isEmail = address.includes("@");
          const displayName = session.name || (isEmail ? address.split("@")[0] : `User_${rawAddress.slice(0, 6)}`);
          const baseUsername = `u_${displayName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 12)}`;
          let finalUsername = baseUsername || `user_${Math.floor(1000 + Math.random() * 9000)}`;

          const { data: collision } = await supabaseServer
            .from("Profile")
            .select("id")
            .eq("username", finalUsername)
            .maybeSingle();
          if (collision) {
            finalUsername = `${baseUsername}_${Math.floor(100 + Math.random() * 900)}`;
          }

          const newUserId = session.userId || rawAddress;
          const { data: newUser } = await supabaseServer
            .from("User")
            .upsert({
              id: newUserId,
              walletAddress: session.walletAddress || rawAddress,
              email: session.email?.toLowerCase() || (isEmail ? address : null),
            })
            .select()
            .single();

          if (newUser) {
            user = newUser;
            const { data: newProfile } = await supabaseServer
              .from("Profile")
              .insert({
                userId: user.id,
                username: finalUsername,
                displayName,
                avatarUrl: session.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(address)}`,
                bio: "Pulse Social Member.",
              })
              .select()
              .single();
            profile = newProfile;
          }
        }
      }
    }

    if (!profile || !user) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const userIdentifiers = Array.from(
      new Set([user.id, user.walletAddress, profile.username, user.email].filter(Boolean) as string[])
    );

    const [
      { count: followersCount },
      { count: followingCount },
      { count: postsCount },
    ] = await Promise.all([
      supabaseServer.from("Follow").select("*", { count: "exact", head: true }).in("followingAddress", userIdentifiers),
      supabaseServer.from("Follow").select("*", { count: "exact", head: true }).in("followerAddress", userIdentifiers),
      supabaseServer.from("Post").select("*", { count: "exact", head: true }).in("authorAddress", userIdentifiers),
    ]);

    return NextResponse.json(
      {
        profile: {
          ...profile,
          nickname: profile.nickname || "",
        },
        user,
        stats: {
          followersCount: followersCount || 0,
          followingCount: followingCount || 0,
          postsCount: postsCount || 0,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=5, stale-while-revalidate=30",
        },
      }
    );
  } catch (error: any) {
    console.error("Profile GET error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("block_social_jwt")?.value;
    const token = authHeader?.replace("Bearer ", "") || cookieToken;

    let targetUserIdentifier: string | null = null;
    if (token) {
      const session = verifyAuthToken(token);
      if (session) {
        targetUserIdentifier = session.userId || session.walletAddress || null;
      }
    }

    const body = await req.json();
    const { displayName, bio, avatarUrl, bannerUrl, username } = body;
    const walletAddress = body.walletAddress || targetUserIdentifier;

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address or session required" }, { status: 400 });
    }

    const { data: user } = await supabaseServer
      .from("User")
      .select("*, profile:Profile(*)")
      .or(`id.eq.${walletAddress},walletAddress.eq.${walletAddress},email.eq.${walletAddress.toLowerCase()}`)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (bio !== undefined) updateData.bio = bio;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (bannerUrl !== undefined) updateData.bannerUrl = bannerUrl;

    if (username !== undefined) {
      const { data: existing } = await supabaseServer
        .from("Profile")
        .select("userId")
        .eq("username", username)
        .maybeSingle();

      if (existing && existing.userId !== user.id) {
        return NextResponse.json({ error: "Username already taken" }, { status: 400 });
      }
      updateData.username = username;
    }

    let updatedProfile: any = null;
    const existingProfile = Array.isArray(user.profile) ? user.profile[0] : user.profile;

    if (existingProfile) {
      const { data: p } = await supabaseServer
        .from("Profile")
        .update(updateData)
        .eq("userId", user.id)
        .select()
        .single();
      updatedProfile = p;
    } else {
      const { data: p } = await supabaseServer
        .from("Profile")
        .insert({
          userId: user.id,
          username: username || `user_${user.id.slice(0, 8)}`,
          displayName: displayName || "Pulse Creator",
          bio: bio || "",
          avatarUrl: avatarUrl || "",
          bannerUrl: bannerUrl || "",
        })
        .select()
        .single();
      updatedProfile = p;
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
    });
  } catch (error: any) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: error.message || "Failed to update profile" }, { status: 500 });
  }
}
