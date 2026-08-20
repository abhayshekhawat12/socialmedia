import { NextRequest, NextResponse } from "next/server";
import { signAuthToken } from "@/lib/auth";
import { resolveOrCreateUser, normalizeEmail } from "@/lib/userResolver";

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
    const email = normalizeEmail(googleUser.email);
    const displayName = googleUser.name || (email ? email.split("@")[0] : "Pulse Creator");
    const picture = googleUser.picture || "";

    // 3. Centralized user identity resolution: ONE EMAIL = ONE USER
    const { user } = await resolveOrCreateUser({
      email,
      googleId,
      displayName,
      picture,
    });

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
