import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signAuthToken } from "@/lib/auth";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email address and 6-digit verification code are required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    const verification = await prisma.otpVerification.findUnique({
      where: { identifier: cleanEmail },
    });

    if (!verification) {
      return NextResponse.json(
        { error: "No active verification request found for this email. Please request a new code." },
        { status: 404 }
      );
    }

    // 1. Check Expiry
    if (new Date() > new Date(verification.expiresAt)) {
      await prisma.otpVerification.delete({ where: { identifier: cleanEmail } });
      return NextResponse.json(
        { error: "The verification code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // 2. Check Attempts Limit
    if (verification.attempts >= 3) {
      await prisma.otpVerification.delete({ where: { identifier: cleanEmail } });
      return NextResponse.json(
        { error: "Too many failed attempts. This code has been invalidated for security. Please request a new one." },
        { status: 400 }
      );
    }

    // 3. Verify Hash
    const inputHash = crypto.createHash("sha256").update(otp.trim()).digest("hex");

    if (inputHash !== verification.otpHash) {
      const updatedAttempts = verification.attempts + 1;

      if (updatedAttempts >= 3) {
        await prisma.otpVerification.delete({ where: { identifier: cleanEmail } });
        return NextResponse.json(
          { error: "Too many incorrect attempts. This code is invalidated. Please request a new one." },
          { status: 400 }
        );
      }

      await prisma.otpVerification.update({
        where: { identifier: cleanEmail },
        data: { attempts: updatedAttempts },
      });

      return NextResponse.json(
        { error: `Incorrect verification code. You have ${3 - updatedAttempts} attempt(s) remaining.` },
        { status: 400 }
      );
    }

    // 4. Invalidate verified OTP
    await prisma.otpVerification.delete({ where: { identifier: cleanEmail } });

    // 5. Find or create User in PostgreSQL
    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { profile: true },
    });

    if (!user) {
      const hash = crypto.createHash("sha256").update(`email:${cleanEmail}`).digest("hex");
      const userIdentifier = `usr_${hash.slice(0, 16)}`;

      let finalAddress = userIdentifier;
      let collision = await prisma.user.findUnique({ where: { walletAddress: finalAddress } });
      let counter = 0;
      while (collision) {
        counter++;
        const newHash = crypto.createHash("sha256").update(`email:${cleanEmail}:${counter}`).digest("hex");
        finalAddress = `usr_${newHash.slice(0, 16)}`;
        collision = await prisma.user.findUnique({ where: { walletAddress: finalAddress } });
      }

      const emailPrefix = cleanEmail.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 12);
      const baseUsername = `e_${emailPrefix || "user"}`;
      let finalUsername = baseUsername;
      let usernameCollision = await prisma.profile.findUnique({ where: { username: finalUsername } });
      while (usernameCollision) {
        finalUsername = `${baseUsername}_${Math.floor(100 + Math.random() * 900)}`;
        usernameCollision = await prisma.profile.findUnique({ where: { username: finalUsername } });
      }

      const displayName = cleanEmail.split("@")[0]
        .split(/[._-]/)
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          walletAddress: finalAddress,
          profile: {
            create: {
              username: finalUsername,
              displayName: displayName || "Aura Member",
              avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}`,
              bio: "Aura Community Member",
            },
          },
        },
        include: { profile: true },
      });
    }

    if (!user || !user.profile) {
      return NextResponse.json(
        { error: "Failed to establish user account." },
        { status: 500 }
      );
    }

    // 6. Sign JWT session
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

    // Set secure session cookie
    response.cookies.set("block_social_jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("[Verify Email OTP Error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify OTP code." },
      { status: 500 }
    );
  }
}
