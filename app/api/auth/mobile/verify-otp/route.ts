import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signAuthToken } from "@/lib/auth";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { mobileNumber, otp, isFirebase = false } = await req.json();

    if (!mobileNumber || (!otp && !isFirebase)) {
      return NextResponse.json({ error: "Mobile number and OTP code are required." }, { status: 400 });
    }

    if (!isFirebase) {
      const verification = await prisma.otpVerification.findUnique({
        where: { mobileNumber }
      });

      if (!verification) {
        return NextResponse.json({ error: "No active OTP request found for this mobile number. Please request one first." }, { status: 404 });
      }

      // 1. Check Expiration
      if (new Date() > new Date(verification.expiresAt)) {
        await prisma.otpVerification.delete({ where: { mobileNumber } });
        return NextResponse.json({ error: "The OTP has expired. Please request a new one." }, { status: 400 });
      }

      // 2. Check maximum incorrect attempts limit (3 attempts)
      if (verification.attempts >= 3) {
        await prisma.otpVerification.delete({ where: { mobileNumber } });
        return NextResponse.json({ error: "Too many failed attempts. This OTP has been invalidated. Please request a new one." }, { status: 400 });
      }

      // Hash the input OTP to verify against the stored hash
      const inputHash = crypto.createHash("sha256").update(otp.trim()).digest("hex");

      if (inputHash !== verification.otpHash) {
        const updatedAttempts = verification.attempts + 1;

        if (updatedAttempts >= 3) {
          await prisma.otpVerification.delete({ where: { mobileNumber } });
          return NextResponse.json({ error: "Too many incorrect attempts. This OTP has been invalidated. Please request a new one." }, { status: 400 });
        }

        await prisma.otpVerification.update({
          where: { mobileNumber },
          data: { attempts: updatedAttempts }
        });

        return NextResponse.json({
          error: `Incorrect OTP. You have ${3 - updatedAttempts} attempts remaining.`
        }, { status: 400 });
      }

      // OTP verified successfully - consume (delete) it
      await prisma.otpVerification.delete({ where: { mobileNumber } });
    }

    // Find or create User based on mobileNumber
    let user = await prisma.user.findUnique({
      where: { mobileNumber },
      include: { profile: true }
    });

    if (!user) {
      const hash = crypto.createHash("sha256").update(`mobile:${mobileNumber}`).digest("hex");
      const userIdentifier = `usr_${hash.slice(0, 16)}`;

      let finalAddress = userIdentifier;
      let collision = await prisma.user.findUnique({ where: { walletAddress: finalAddress } });
      let counter = 0;
      while (collision) {
        counter++;
        const newHash = crypto.createHash("sha256").update(`mobile:${mobileNumber}:${counter}`).digest("hex");
        finalAddress = `usr_${newHash.slice(0, 16)}`;
        collision = await prisma.user.findUnique({ where: { walletAddress: finalAddress } });
      }

      const sanitizedPhone = mobileNumber.replace(/[^0-9]/g, "");
      const phoneSuffix = sanitizedPhone.slice(-6) || "user";
      const baseUsername = `m_${phoneSuffix}`;
      let finalUsername = baseUsername;
      let usernameCollision = await prisma.profile.findUnique({ where: { username: finalUsername } });
      while (usernameCollision) {
        finalUsername = `${baseUsername}_${Math.floor(100 + Math.random() * 900)}`;
        usernameCollision = await prisma.profile.findUnique({ where: { username: finalUsername } });
      }

      // Create new user & profile
      user = await prisma.user.create({
        data: {
          mobileNumber,
          walletAddress: finalAddress,
          profile: {
            create: {
              username: finalUsername,
              displayName: `User ${mobileNumber.slice(-4)}`,
              avatarUrl: "",
              bio: "Mobile Account on Aura.",
            }
          }
        },
        include: { profile: true }
      });
    }

    if (!user || !user.profile) {
      return NextResponse.json({ error: "Failed to establish user account." }, { status: 500 });
    }

    // Generate JWT token
    const token = signAuthToken(user.id, user.walletAddress || user.id);

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        mobileNumber: user.mobileNumber,
        walletAddress: user.walletAddress,
        profile: user.profile
      }
    });
  } catch (error: any) {
    console.error("Verify OTP route error:", error);
    return NextResponse.json({ error: error.message || "Failed to verify OTP." }, { status: 500 });
  }
}
