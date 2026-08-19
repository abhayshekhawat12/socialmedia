import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signAuthToken } from "@/lib/auth";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email, name, picture, googleId, supabaseId } = await req.json();

    if (!email && !googleId && !supabaseId) {
      return NextResponse.json({ error: "Missing required Google account parameters." }, { status: 400 });
    }

    const cleanEmail = (email || "").toLowerCase().trim();
    const effectiveName = name || cleanEmail.split("@")[0] || "Aura Member";
    const effectiveGoogleId = googleId || supabaseId;

    // 1. Find user by supabaseId, googleId, email, or walletAddress
    const orConditions: any[] = [];
    if (supabaseId) orConditions.push({ id: supabaseId }, { walletAddress: supabaseId });
    if (effectiveGoogleId) orConditions.push({ googleId: effectiveGoogleId });
    if (cleanEmail) orConditions.push({ email: cleanEmail });

    let user = await prisma.user.findFirst({
      where: { OR: orConditions },
      include: { profile: true },
    });

    if (user) {
      // Update Google ID, email, or missing profile
      const updateData: any = {};
      if (effectiveGoogleId && !user.googleId) updateData.googleId = effectiveGoogleId;
      if (cleanEmail && !user.email) updateData.email = cleanEmail;
      if (!user.walletAddress) updateData.walletAddress = supabaseId || user.id;

      if (Object.keys(updateData).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
          include: { profile: true },
        });
      }

      // Ensure profile exists for existing user
      if (!user.profile) {
        const baseUsername = `g_${effectiveName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 12)}`;
        let finalUsername = baseUsername || `user_${Math.floor(1000 + Math.random() * 9000)}`;
        let usernameCollision = await prisma.profile.findUnique({ where: { username: finalUsername } });
        while (usernameCollision) {
          finalUsername = `${baseUsername}_${Math.floor(100 + Math.random() * 900)}`;
          usernameCollision = await prisma.profile.findUnique({ where: { username: finalUsername } });
        }

        const newProfile = await prisma.profile.create({
          data: {
            userId: user.id,
            username: finalUsername,
            displayName: effectiveName,
            avatarUrl: picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail || user.id)}`,
            bio: "Pulse Social Member.",
          },
        });
        user = { ...user, profile: newProfile };
      }
    } else {
      // 2. Create brand-new user with authentic Supabase user ID
      const finalUserId = supabaseId || undefined;
      const finalAddress = supabaseId || `usr_${crypto.createHash("sha256").update(`google:${effectiveGoogleId}:${cleanEmail}`).digest("hex").slice(0, 16)}`;

      const baseUsername = `g_${effectiveName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 12)}`;
      let finalUsername = baseUsername || `user_${Math.floor(1000 + Math.random() * 9000)}`;
      let usernameCollision = await prisma.profile.findUnique({ where: { username: finalUsername } });
      while (usernameCollision) {
        finalUsername = `${baseUsername}_${Math.floor(100 + Math.random() * 900)}`;
        usernameCollision = await prisma.profile.findUnique({ where: { username: finalUsername } });
      }

      user = await prisma.user.create({
        data: {
          id: finalUserId,
          googleId: effectiveGoogleId,
          email: cleanEmail || undefined,
          walletAddress: finalAddress,
          profile: {
            create: {
              username: finalUsername,
              displayName: effectiveName,
              avatarUrl: picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail || finalAddress)}`,
              bio: "Pulse Social Member.",
            },
          },
        },
        include: { profile: true },
      });
    }

    if (!user || !user.profile) {
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
        profile: user.profile,
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
