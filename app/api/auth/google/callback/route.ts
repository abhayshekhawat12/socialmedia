import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signAuthToken } from "@/lib/auth";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    const origin = req.nextUrl.origin;

    if (error || !code) {
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error || "Google authentication was cancelled.")}`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Google OAuth credentials are not configured on the server.")}`);
    }

    // 1. Exchange code for access token
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

    const googleId = googleUser.sub;
    const email = googleUser.email.toLowerCase();
    const displayName = googleUser.name || googleUser.email.split("@")[0];
    const picture = googleUser.picture || "";

    // 3. Find or create user in PostgreSQL
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId }, { email }],
      },
      include: { profile: true },
    });

    if (user) {
      const updateData: any = {};
      if (!user.googleId) updateData.googleId = googleId;
      if (!user.email) updateData.email = email;

      if (Object.keys(updateData).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
          include: { profile: true },
        });
      }
    } else {
      const hash = crypto.createHash("sha256").update(`google:${googleId}`).digest("hex");
      const userIdentifier = `usr_${hash.slice(0, 16)}`;

      let finalAddress = userIdentifier;
      let collision = await prisma.user.findUnique({ where: { walletAddress: finalAddress } });
      let counter = 0;
      while (collision) {
        counter++;
        const newHash = crypto.createHash("sha256").update(`google:${googleId}:${counter}`).digest("hex");
        finalAddress = `usr_${newHash.slice(0, 16)}`;
        collision = await prisma.user.findUnique({ where: { walletAddress: finalAddress } });
      }

      const baseUsername = `g_${displayName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 12)}`;
      let finalUsername = baseUsername;
      let usernameCollision = await prisma.profile.findUnique({ where: { username: finalUsername } });
      while (usernameCollision) {
        finalUsername = `${baseUsername}_${Math.floor(100 + Math.random() * 900)}`;
        usernameCollision = await prisma.profile.findUnique({ where: { username: finalUsername } });
      }

      user = await prisma.user.create({
        data: {
          googleId,
          email,
          walletAddress: finalAddress,
          profile: {
            create: {
              username: finalUsername,
              displayName,
              avatarUrl: picture,
              bio: "Aura Google Member",
            },
          },
        },
        include: { profile: true },
      });
    }

    if (!user || !user.profile) {
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Failed to establish account profile.")}`);
    }

    // 4. Sign JWT session
    const token = signAuthToken(user.id, user.walletAddress || user.id);
    const accountIdentifier = user.walletAddress || user.id;

    // Render an HTML landing bridge that populates localStorage and cookies, then redirects to /feed
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Signing in to Aura...</title>
  <script>
    try {
      localStorage.setItem("block_social_jwt", ${JSON.stringify(token)});
      localStorage.setItem("block_social_account", ${JSON.stringify(accountIdentifier)});
      localStorage.setItem("block_social_cached_profile", ${JSON.stringify(JSON.stringify(user.profile))});
    } catch(e) {}
    window.location.replace("/feed");
  </script>
</head>
<body style="background: #0b0f19; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
  <p>Authenticating with Aura...</p>
</body>
</html>
    `;

    const response = new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });

    response.cookies.set("block_social_jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("[Google OAuth Callback Error]", err);
    return NextResponse.redirect(`${req.nextUrl.origin}/login?error=${encodeURIComponent(err.message || "Failed to complete Google login.")}`);
  }
}
