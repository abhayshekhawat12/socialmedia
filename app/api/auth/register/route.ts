import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { signAuthToken } from "@/lib/auth";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { identifier, displayName } = await req.json();

    if (!identifier) {
      return NextResponse.json({ error: "Email or mobile number is required" }, { status: 400 });
    }

    const cleanIdent = identifier.trim().toLowerCase();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanIdent);
    const isMobile = /^\+?[0-9]{7,15}$/.test(cleanIdent);

    // Check existing user
    const { data: existingUser } = await supabaseServer
      .from("User")
      .select("*, profile:Profile(*)")
      .or(`email.eq.${cleanIdent},mobileNumber.eq.${cleanIdent},walletAddress.eq.${cleanIdent}`)
      .maybeSingle();

    if (existingUser) {
      const profile = Array.isArray(existingUser.profile) ? existingUser.profile[0] : existingUser.profile;
      const token = signAuthToken(existingUser.id, existingUser.walletAddress || existingUser.id);
      return NextResponse.json({
        success: true,
        token,
        user: { ...existingUser, profile },
      });
    }

    const hash = crypto.createHash("sha256").update(cleanIdent).digest("hex");
    const generatedAddress = `usr_${hash.slice(0, 16)}`;
    const chosenName = displayName || cleanIdent.split("@")[0];
    const newUserId = crypto.randomUUID();

    const baseUsername = `u_${chosenName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 10)}`;
    let finalUsername = baseUsername || `user_${generatedAddress.slice(4, 10)}`;

    const { data: usernameExists } = await supabaseServer
      .from("Profile")
      .select("id")
      .eq("username", finalUsername)
      .maybeSingle();

    if (usernameExists) {
      finalUsername = `${finalUsername}_${Math.floor(100 + Math.random() * 900)}`;
    }

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
      throw new Error(userErr?.message || "Failed to register user");
    }

    const { data: newProfile } = await supabaseServer
      .from("Profile")
      .insert({
        userId: newUser.id,
        username: finalUsername,
        displayName: chosenName,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${generatedAddress}`,
        bio: "Pulse Creator",
      })
      .select()
      .single();

    const token = signAuthToken(newUser.id, newUser.walletAddress || newUser.id);

    const response = NextResponse.json({
      success: true,
      token,
      user: { ...newUser, profile: newProfile },
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
