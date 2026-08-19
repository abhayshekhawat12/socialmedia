import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signAuthToken } from "@/lib/auth";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { identifier, password, displayName } = await req.json();

    if (!identifier) {
      return NextResponse.json({ error: "Email or mobile number is required" }, { status: 400 });
    }

    const cleanIdent = identifier.trim().toLowerCase();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanIdent);
    const isMobile = /^\+?[0-9]{7,15}$/.test(cleanIdent);

    // Check existing
    let existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanIdent },
          { mobileNumber: cleanIdent },
          { walletAddress: cleanIdent },
        ],
      },
      include: { profile: true },
    });

    if (existingUser) {
      const token = signAuthToken(existingUser.id, existingUser.walletAddress || existingUser.id);
      return NextResponse.json({
        success: true,
        token,
        user: existingUser,
      });
    }

    const hash = crypto.createHash("sha256").update(cleanIdent).digest("hex");
    const generatedAddress = `usr_${hash.slice(0, 16)}`;
    const chosenName = displayName || cleanIdent.split("@")[0];

    const baseUsername = `u_${chosenName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 10)}`;
    let finalUsername = baseUsername || `user_${generatedAddress.slice(4, 10)}`;

    const usernameExists = await prisma.profile.findUnique({ where: { username: finalUsername } });
    if (usernameExists) {
      finalUsername = `${finalUsername}_${Math.floor(100 + Math.random() * 900)}`;
    }

    const newUser = await prisma.user.create({
      data: {
        walletAddress: generatedAddress,
        email: isEmail ? cleanIdent : null,
        mobileNumber: isMobile ? cleanIdent : null,
        profile: {
          create: {
            username: finalUsername,
            displayName: chosenName,
            avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${generatedAddress}`,
            bio: "Pulse Creator",
          },
        },
      },
      include: { profile: true },
    });

    const token = signAuthToken(newUser.id, newUser.walletAddress || newUser.id);

    return NextResponse.json({
      success: true,
      token,
      user: newUser,
    });
  } catch (error: any) {
    console.error("Register API error:", error);
    return NextResponse.json({ error: error.message || "Failed to create account" }, { status: 500 });
  }
}
