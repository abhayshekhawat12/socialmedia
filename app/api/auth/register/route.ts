import { NextRequest, NextResponse } from "next/server";
import { signAuthToken } from "@/lib/auth";
import { resolveOrCreateUser, normalizeEmail } from "@/lib/userResolver";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { identifier, displayName } = await req.json();

    if (!identifier) {
      return NextResponse.json({ error: "Email or mobile number is required" }, { status: 400 });
    }

    const cleanIdent = identifier.trim().toLowerCase();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanIdent);

    // Enforce centralized identity resolution
    const { user, profile } = await resolveOrCreateUser({
      email: isEmail ? cleanIdent : null,
      userId: !isEmail && !cleanIdent.startsWith("0x") ? cleanIdent : null,
      walletAddress: cleanIdent.startsWith("0x") ? cleanIdent : null,
      displayName: displayName || cleanIdent.split("@")[0],
    });

    if (!user) {
      throw new Error("Failed to register user");
    }

    const token = signAuthToken(user.id, user.walletAddress || user.id);

    const response = NextResponse.json({
      success: true,
      token,
      user: { ...user, profile },
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
    console.error("Register API error:", error);
    return NextResponse.json({ error: error.message || "Failed to create account" }, { status: 500 });
  }
}
