import { NextRequest, NextResponse } from "next/server";
import { signAuthToken } from "@/lib/auth";
import { resolveOrCreateUser, normalizeEmail } from "@/lib/userResolver";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, name, picture, googleId, supabaseId } = await req.json();

    if (!email && !googleId && !supabaseId) {
      return NextResponse.json({ error: "Missing required Google account parameters." }, { status: 400 });
    }

    const cleanEmail = normalizeEmail(email);
    const effectiveName = name || (cleanEmail ? cleanEmail.split("@")[0] : "Pulse Member");
    const effectiveGoogleId = googleId ? String(googleId) : (supabaseId ? String(supabaseId) : null);

    // Enforce centralized identity resolution: ONE EMAIL = ONE USER
    const { user, profile } = await resolveOrCreateUser({
      email: cleanEmail,
      googleId: effectiveGoogleId,
      userId: supabaseId || null,
      displayName: effectiveName,
      picture: picture || null,
    });

    if (!user) {
      return NextResponse.json({ error: "Failed to establish user account." }, { status: 500 });
    }

    // Sign session token with permanent user ID
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
