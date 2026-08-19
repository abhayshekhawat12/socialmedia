import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { signAuthToken } from "@/lib/auth";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json({ error: "Identifier and password are required" }, { status: 400 });
    }

    const cleanIdent = identifier.trim().toLowerCase();

    // Find user by email, mobileNumber, walletAddress, or id
    let user: any = null;
    let profile: any = null;

    const { data: existingUser } = await supabaseServer
      .from("User")
      .select("*, profile:Profile(*)")
      .or(`email.eq.${cleanIdent},mobileNumber.eq.${cleanIdent},walletAddress.eq.${cleanIdent},id.eq.${cleanIdent}`)
      .maybeSingle();

    if (existingUser) {
      user = existingUser;
      profile = Array.isArray(existingUser.profile) ? existingUser.profile[0] : existingUser.profile;
    } else {
      // Create user and profile seamlessly
      const hash = crypto.createHash("sha256").update(cleanIdent).digest("hex");
      const generatedAddress = `usr_${hash.slice(0, 16)}`;
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanIdent);
      const isMobile = /^\+?[0-9]{7,15}$/.test(cleanIdent);
      const newUserId = crypto.randomUUID();

      const { data: newUser, error: userErr } = await supabaseServer
        .from("User")
        .insert({
          id: newUserId,
          walletAddress: generatedAddress,
          email: isEmail ? cleanIdent : null,
          mobileNumber: isMobile ? cleanIdent : null,
        })
        .select()
        .single();

      if (userErr || !newUser) {
        throw new Error(userErr?.message || "Failed to create user in database");
      }
      user = newUser;

      const { data: newProfile } = await supabaseServer
        .from("Profile")
        .insert({
          userId: newUser.id,
          username: `user_${generatedAddress.slice(4, 12)}`,
          displayName: cleanIdent.split("@")[0],
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${generatedAddress}`,
          bio: "Pulse Mobile Creator",
        })
        .select()
        .single();
      profile = newProfile;
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
