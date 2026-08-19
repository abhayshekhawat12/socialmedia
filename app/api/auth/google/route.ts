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
    const effectiveName = name || cleanEmail.split("@")[0] || "Aura Member";
    const effectiveGoogleId = googleId || supabaseId;

    // 1. Find user by supabaseId, googleId, or email
    let user: any = null;
    let profile: any = null;

    if (supabaseId) {
      const { data } = await supabaseServer
        .from("User")
        .select("*, profile:Profile(*)")
        .or(`id.eq.${supabaseId},walletAddress.eq.${supabaseId}`)
        .maybeSingle();
      if (data) {
        user = data;
        profile = Array.isArray(data.profile) ? data.profile[0] : data.profile;
      }
    }

    if (!user && effectiveGoogleId) {
      const { data } = await supabaseServer
        .from("User")
        .select("*, profile:Profile(*)")
        .eq("googleId", effectiveGoogleId)
        .maybeSingle();
      if (data) {
        user = data;
        profile = Array.isArray(data.profile) ? data.profile[0] : data.profile;
      }
    }

    if (!user && cleanEmail) {
      const { data } = await supabaseServer
        .from("User")
        .select("*, profile:Profile(*)")
        .eq("email", cleanEmail)
        .maybeSingle();
      if (data) {
        user = data;
        profile = Array.isArray(data.profile) ? data.profile[0] : data.profile;
      }
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

      // Ensure profile exists
      if (!profile) {
        const { data: existingProfile } = await supabaseServer
          .from("Profile")
          .select("*")
          .eq("userId", user.id)
          .maybeSingle();

        if (existingProfile) {
          profile = existingProfile;
        } else {
          const baseUsername = `g_${effectiveName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 12)}`;
          let finalUsername = baseUsername || `user_${Math.floor(1000 + Math.random() * 9000)}`;

          const { data: collision } = await supabaseServer
            .from("Profile")
            .select("id")
            .eq("username", finalUsername)
            .maybeSingle();
          if (collision) {
            finalUsername = `${baseUsername}_${Math.floor(100 + Math.random() * 900)}`;
          }

          const { data: newProfile } = await supabaseServer
            .from("Profile")
            .insert(
              withTimestamps({
                userId: user.id,
                username: finalUsername,
                displayName: effectiveName,
                avatarUrl: picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail || user.id)}`,
                bio: "Pulse Social Member.",
              })
            )
            .select()
            .single();
          profile = newProfile;
        }
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
            googleId: effectiveGoogleId,
            email: cleanEmail || null,
            walletAddress: finalAddress,
          })
        )
        .select()
        .single();

      if (userErr || !newUser) {
        console.error("Supabase user creation error:", userErr);
        throw new Error(userErr?.message || "Failed to create user in database");
      }
      user = newUser;

      const baseUsername = `g_${effectiveName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 12)}`;
      let finalUsername = baseUsername || `user_${Math.floor(1000 + Math.random() * 9000)}`;
      const { data: collision } = await supabaseServer
        .from("Profile")
        .select("id")
        .eq("username", finalUsername)
        .maybeSingle();
      if (collision) {
        finalUsername = `${baseUsername}_${Math.floor(100 + Math.random() * 900)}`;
      }

      const { data: newProfile, error: profileErr } = await supabaseServer
        .from("Profile")
        .insert(
          withTimestamps({
            userId: user.id,
            username: finalUsername,
            displayName: effectiveName,
            avatarUrl: picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail || finalAddress)}`,
            bio: "Pulse Social Member.",
          })
        )
        .select()
        .single();

      if (profileErr) {
        console.error("Supabase profile creation error:", profileErr);
      }
      profile = newProfile;
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
