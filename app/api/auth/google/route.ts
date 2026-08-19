import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signAuthToken } from "@/lib/auth";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email, name, picture, googleId } = await req.json();

    if (!googleId || !email || !name) {
      return NextResponse.json({ error: "Missing required Google account parameters." }, { status: 400 });
    }

    // Find user by googleId, email, or profile email
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId },
          { email: email.toLowerCase() }
        ]
      },
      include: { profile: true }
    });

    if (user) {
      // Update Google ID or profile picture if missing
      const updateData: any = {};
      if (!user.googleId) updateData.googleId = googleId;
      if (!user.email) updateData.email = email.toLowerCase();
      
      if (Object.keys(updateData).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
          include: { profile: true }
        });
      }
    } else {
      // Generate deterministic unique handle / address based on Google ID
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

      // Generate a unique clean username
      const baseUsername = `g_${name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 12)}`;
      let finalUsername = baseUsername;
      let usernameCollision = await prisma.profile.findUnique({ where: { username: finalUsername } });
      while (usernameCollision) {
        finalUsername = `${baseUsername}_${Math.floor(100 + Math.random() * 900)}`;
        usernameCollision = await prisma.profile.findUnique({ where: { username: finalUsername } });
      }

      // Create new user & profile
      user = await prisma.user.create({
        data: {
          googleId,
          email: email.toLowerCase(),
          walletAddress: finalAddress,
          profile: {
            create: {
              username: finalUsername,
              displayName: name,
              avatarUrl: picture || "",
              bio: "Google Account linked to Aura.",
            }
          }
        },
        include: { profile: true }
      });
    }

    if (!user || !user.profile) {
      return NextResponse.json({ error: "Failed to establish user account." }, { status: 500 });
    }

    // Sign session token
    const token = signAuthToken(user.id, user.walletAddress || user.id);

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        walletAddress: user.walletAddress,
        profile: user.profile
      }
    });
  } catch (error: any) {
    console.error("Google authentication route error:", error);
    return NextResponse.json({ error: error.message || "Failed to authenticate with Google." }, { status: 500 });
  }
}
