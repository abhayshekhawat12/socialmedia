import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signAuthToken } from "@/lib/auth";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { mobileNumber, otp, isFirebase = false } = await req.json();

    if (!mobileNumber || (!otp && !isFirebase)) {
      return NextResponse.json(
        { error: "Mobile number and 6-digit OTP code are required." },
        { status: 400 }
      );
    }

    const formattedNumber = mobileNumber.startsWith("+") ? mobileNumber.replace(/\s+/g, "") : `+${mobileNumber.replace(/\s+/g, "")}`;

    if (!isFirebase) {
      const verification = await prisma.otpVerification.findUnique({
        where: { identifier: formattedNumber },
      });

      if (!verification) {
        return NextResponse.json(
          { error: "No active verification code found for this mobile number. Please request a new OTP." },
          { status: 404 }
        );
      }

      // 1. Check Expiration (5 minutes)
      if (new Date() > new Date(verification.expiresAt)) {
        await prisma.otpVerification.delete({ where: { identifier: formattedNumber } });
        return NextResponse.json(
          { error: "The verification code has expired. Please request a new one." },
          { status: 400 }
        );
      }

      // 2. Check maximum failed attempts (3 attempts)
      if (verification.attempts >= 3) {
        await prisma.otpVerification.delete({ where: { identifier: formattedNumber } });
        return NextResponse.json(
          { error: "Too many failed attempts. This OTP has been invalidated for security. Please request a new code." },
          { status: 400 }
        );
      }

      // 3. Compare SHA-256 Hash
      const inputHash = crypto.createHash("sha256").update(otp.trim()).digest("hex");

      if (inputHash !== verification.otpHash) {
        const updatedAttempts = verification.attempts + 1;

        if (updatedAttempts >= 3) {
          await prisma.otpVerification.delete({ where: { identifier: formattedNumber } });
          return NextResponse.json(
            { error: "Too many incorrect attempts. This code is invalidated. Please request a new one." },
            { status: 400 }
          );
        }

        await prisma.otpVerification.update({
          where: { identifier: formattedNumber },
          data: { attempts: updatedAttempts },
        });

        return NextResponse.json(
          { error: `Incorrect verification code. You have ${3 - updatedAttempts} attempt(s) remaining.` },
          { status: 400 }
        );
      }

      // 4. Invalidate (delete) verified OTP
      await prisma.otpVerification.delete({ where: { identifier: formattedNumber } });
    }

    // 5. Find or create User in PostgreSQL
    let user = await prisma.user.findUnique({
      where: { mobileNumber: formattedNumber },
      include: { profile: true },
    });

    if (!user) {
      const hash = crypto.createHash("sha256").update(`mobile:${formattedNumber}`).digest("hex");
      const userIdentifier = `usr_${hash.slice(0, 16)}`;

      let finalAddress = userIdentifier;
      let collision = await prisma.user.findUnique({ where: { walletAddress: finalAddress } });
      let counter = 0;
      while (collision) {
        counter++;
        const newHash = crypto.createHash("sha256").update(`mobile:${formattedNumber}:${counter}`).digest("hex");
        finalAddress = `usr_${newHash.slice(0, 16)}`;
        collision = await prisma.user.findUnique({ where: { walletAddress: finalAddress } });
      }

      const sanitizedPhone = formattedNumber.replace(/[^0-9]/g, "");
      const phoneSuffix = sanitizedPhone.slice(-4) || "user";
      const baseUsername = `m_${sanitizedPhone.slice(-6)}`;
      let finalUsername = baseUsername;
      let usernameCollision = await prisma.profile.findUnique({ where: { username: finalUsername } });
      while (usernameCollision) {
        finalUsername = `${baseUsername}_${Math.floor(100 + Math.random() * 900)}`;
        usernameCollision = await prisma.profile.findUnique({ where: { username: finalUsername } });
      }

      user = await prisma.user.create({
        data: {
          mobileNumber: formattedNumber,
          walletAddress: finalAddress,
          profile: {
            create: {
              username: finalUsername,
              displayName: `User ${phoneSuffix}`,
              avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(formattedNumber)}`,
              bio: "Aura Mobile Member",
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
        mobileNumber: user.mobileNumber,
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
    console.error("[Verify Mobile OTP Error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify OTP code." },
      { status: 500 }
    );
  }
}
