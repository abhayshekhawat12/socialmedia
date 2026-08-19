import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, withTimestamps, withUpdatedTimestamp } from "@/lib/supabaseServer";
import { signAuthToken } from "@/lib/auth";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error || !code) {
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error || "Google authentication was cancelled.")}`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Google OAuth credentials are not configured on the server.")}`);
    }

    // 1. Exchange code for access token directly with Google
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("[Google OAuth Token Error]", tokenData);
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Failed to exchange Google OAuth code.")}`);
    }

    // 2. Fetch verified Google user info
    const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const googleUser = await userinfoRes.json();
    if (!userinfoRes.ok || !googleUser.email) {
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Failed to retrieve Google profile information.")}`);
    }

    const googleId = String(googleUser.sub);
    const email = String(googleUser.email).toLowerCase().trim();
    const displayName = googleUser.name || email.split("@")[0] || "Pulse Creator";
    const picture = googleUser.picture || "";

    // 3. Find or create user directly in Supabase
    let user: any = null;
    let profile: any = null;

    // Search by googleId first
    const { data: userByGoogle } = await supabaseServer
      .from("User")
      .select("*, profile:Profile(*)")
      .eq("googleId", googleId)
      .maybeSingle();

    if (userByGoogle) {
      user = userByGoogle;
    } else {
      // Search by email
      const { data: userByEmail } = await supabaseServer
        .from("User")
        .select("*, profile:Profile(*)")
        .eq("email", email)
        .maybeSingle();

      if (userByEmail) {
        user = userByEmail;
        // Update googleId if missing
        if (!user.googleId) {
          await supabaseServer
            .from("User")
            .update(withUpdatedTimestamp({ googleId }))
            .eq("id", user.id);
          user.googleId = googleId;
        }
      }
    }

    if (user) {
      // User exists — check if profile exists
      const existingProfile = Array.isArray(user.profile) ? user.profile[0] : user.profile;
      if (existingProfile) {
        profile = existingProfile;
      } else {
        // Create missing profile for existing user
        const baseUsername = `g_${displayName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 10)}`;
        const finalUsername = `${baseUsername || "user"}_${Math.floor(100 + Math.random() * 900)}`;

        const { data: newProfile } = await supabaseServer
          .from("Profile")
          .insert(
            withTimestamps({
              userId: user.id,
              username: finalUsername,
              displayName,
              avatarUrl: picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`,
              bio: "Pulse Creator",
            })
          )
          .select()
          .single();
        profile = newProfile;
      }
    } else {
      // Brand new user creation
      const hash = crypto.createHash("sha256").update(`google:${googleId}:${email}`).digest("hex");
      const userIdentifier = `usr_${hash.slice(0, 16)}`;
      const newUserId = crypto.randomUUID();

      const { data: newUser, error: userErr } = await supabaseServer
        .from("User")
        .insert(
          withTimestamps({
            id: newUserId,
            googleId,
            email,
            walletAddress: userIdentifier,
          })
        )
        .select()
        .single();

      if (userErr || !newUser) {
        console.error("User creation error:", userErr);
        // Fallback: try fetching by email in case of race condition
        const { data: fallbackUser } = await supabaseServer
          .from("User")
          .select("*, profile:Profile(*)")
          .eq("email", email)
          .maybeSingle();

        if (fallbackUser) {
          user = fallbackUser;
        } else {
          return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(userErr?.message || "Failed to create user profile in database.")}`);
        }
      } else {
        user = newUser;
      }

      if (user) {
        const baseUsername = `g_${displayName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 10)}`;
        const finalUsername = `${baseUsername || "user"}_${Math.floor(100 + Math.random() * 900)}`;

        const { data: newProfile } = await supabaseServer
          .from("Profile")
          .insert(
            withTimestamps({
              userId: user.id,
              username: finalUsername,
              displayName,
              avatarUrl: picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`,
              bio: "Pulse Creator",
            })
          )
          .select()
          .single();

        profile = newProfile;
      }
    }

    if (!user) {
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Could not complete authentication.")}`);
    }

    // 4. Sign JWT session and set secure cookie
    const token = signAuthToken(user.id, user.walletAddress || user.id);

    const response = NextResponse.redirect(`${origin}/feed`);
    response.cookies.set("block_social_jwt", token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("[Google OAuth Callback Error]", err);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(err.message || "Failed to complete Google login.")}`);
  }
}
