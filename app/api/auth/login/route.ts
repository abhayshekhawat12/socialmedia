import { NextRequest, NextResponse } from "next/server";
import { signAuthToken } from "@/lib/auth";
import { resolveOrCreateUser, normalizeEmail } from "@/lib/userResolver";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json({ error: "Identifier and password are required" }, { status: 400 });
    }

    const cleanIdent = identifier.trim().toLowerCase();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanIdent);

    // Enforce centralized identity resolution
    const { user, profile } = await resolveOrCreateUser({
      email: isEmail ? cleanIdent : null,
      userId: !isEmail && !cleanIdent.startsWith("0x") ? cleanIdent : null,
      walletAddress: cleanIdent.startsWith("0x") ? cleanIdent : null,
      displayName: cleanIdent.split("@")[0],
    });

    if (!user) {
      return NextResponse.json({ error: "Failed to authenticate" }, { status: 500 });
    }

    const token = signAuthToken(user.id, user.walletAddress || user.id);

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        ...user,
        profile,
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
    console.error("Login API error:", error);
    return NextResponse.json({ error: error.message || "Failed to authenticate" }, { status: 500 });
  }
}
