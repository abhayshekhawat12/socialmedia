import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, withTimestamps, withUpdatedTimestamp } from "@/lib/supabaseServer";
import { signAuthToken } from "@/lib/auth";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, name, picture, googleId, supabaseId } = await req.json();

    if (!email && !googleId && !supabaseId) {
      return NextResponse.json({ error: "Missing required Google account parameters." }, { status: 400 });
    }

    const cleanEmail = (email || "").toLowerCase().trim();
    const effectiveName = name || cleanEmail.split("@")[0] || "Pulse Member";
    const effectiveGoogleId = googleId ? String(googleId) : (supabaseId ? String(supabaseId) : "");

    // 1. Find user by googleId, email, or supabaseId
    let user: any = null;
    let profile: any = null;

    if (effectiveGoogleId) {
      const { data } = await supabaseServer
        .from("User")
        .select("*, profile:Profile(*)")
        .eq("googleId", effectiveGoogleId)
        .maybeSingle();
      if (data) user = data;
    }

    if (!user && cleanEmail) {
      const { data } = await supabaseServer
        .from("User")
        .select("*, profile:Profile(*)")
        .eq("email", cleanEmail)
        .maybeSingle();
      if (data) user = data;
    }

    if (!user && supabaseId) {
      const { data } = await supabaseServer
        .from("User")
        .select("*, profile:Profile(*)")
        .or(`id.eq.${supabaseId},walletAddress.eq.${supabaseId}`)
        .maybeSingle();
      if (data) user = data;
    }

    if (user) {
      // Update Google ID, email, or missing walletAddress
      const updateData: any = {};
      if (effectiveGoogleId && !user.googleId) updateData.googleId = effectiveGoogleId;
      if (cleanEmail && !user.email) updateData.email = cleanEmail;
      if (!user.walletAddress) updateData.walletAddress = supabaseId || user.id;

      if (Object.keys(updateData).length > 0) {
        const { data: updatedUser } = await supabaseServer
          .from("User")
          .update(withUpdatedTimestamp(updateData))
          .eq("id", user.id)
          .select()
          .single();
        if (updatedUser) user = { ...user, ...updatedUser };
      }

      // Check / Create profile if missing
      const existingProfile = Array.isArray(user.profile) ? user.profile[0] : user.profile;
      if (existingProfile) {
        profile = existingProfile;
      } else {
        const baseUsername = `g_${effectiveName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 10)}`;
        const finalUsername = `${baseUsername || "user"}_${Math.floor(100 + Math.random() * 900)}`;

        const { data: newProfile } = await supabaseServer
          .from("Profile")
          .insert(
            withTimestamps({
              userId: user.id,
              username: finalUsername,
              displayName: effectiveName,
              avatarUrl: picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`,
              bio: "Pulse Social Member.",
            })
          )
          .select()
          .single();
        profile = newProfile;
      }
    } else {
      // 2. Create brand-new user in Supabase
      const finalUserId = supabaseId || crypto.randomUUID();
      const finalAddress = supabaseId || `usr_${crypto.createHash("sha256").update(`google:${effectiveGoogleId}:${cleanEmail}`).digest("hex").slice(0, 16)}`;

      const { data: newUser, error: userErr } = await supabaseServer
        .from("User")
        .insert(
          withTimestamps({
            id: finalUserId,
            googleId: effectiveGoogleId || null,
            email: cleanEmail || null,
            walletAddress: finalAddress,
          })
        )
        .select()
        .single();

      if (userErr || !newUser) {
        console.error("Supabase user creation error:", userErr);
        // Fallback: try fetching by email
        const { data: fallbackUser } = await supabaseServer
          .from("User")
          .select("*, profile:Profile(*)")
          .eq("email", cleanEmail)
          .maybeSingle();

        if (fallbackUser) {
          user = fallbackUser;
        } else {
          throw new Error(userErr?.message || "Failed to create user in database");
        }
      } else {
        user = newUser;
      }

      if (user) {
        const baseUsername = `g_${effectiveName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 10)}`;
        const finalUsername = `${baseUsername || "user"}_${Math.floor(100 + Math.random() * 900)}`;

        const { data: newProfile } = await supabaseServer
          .from("Profile")
          .insert(
            withTimestamps({
              userId: user.id,
              username: finalUsername,
              displayName: effectiveName,
              avatarUrl: picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`,
              bio: "Pulse Social Member.",
            })
          )
          .select()
          .single();
        profile = newProfile;
      }
    }

    if (!user) {
      return NextResponse.json({ error: "Failed to establish user account." }, { status: 500 });
    }

    // Sign session token
    const token = signAuthToken(user.id, user.walletAddress || user.id);

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        walletAddress: user.walletAddress,
        profile: profile || {},
      },
    });

    response.cookies.set("block_social_jwt", token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Google authentication route error:", error);
    return NextResponse.json({ error: error.message || "Failed to authenticate with Google." }, { status: 500 });
  }
}
