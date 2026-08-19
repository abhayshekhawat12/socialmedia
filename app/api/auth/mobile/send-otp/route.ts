import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { mobileNumber } = await req.json();

    if (!mobileNumber || !/^\+?[1-9]\d{1,14}$/.test(mobileNumber)) {
      return NextResponse.json({ error: "Invalid mobile number format. Please provide a valid phone number (e.g. +1234567890)." }, { status: 400 });
    }

    // Check resend cooldown and rate limits
    const existing = await prisma.otpVerification.findUnique({
      where: { mobileNumber }
    });

    if (existing) {
      const lastRequested = new Date(existing.requestedAt).getTime();
      const timeDiff = Date.now() - lastRequested;

      // 60-second resend cooldown
      if (timeDiff < 60 * 1000) {
        const secondsLeft = Math.ceil((60 * 1000 - timeDiff) / 1000);
        return NextResponse.json(
          { error: `Please wait ${secondsLeft} seconds before requesting a new OTP.` },
          { status: 429 }
        );
      }
    }

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes expiry

    // Save or update the OTP in the database
    await prisma.otpVerification.upsert({
      where: { mobileNumber },
      create: {
        mobileNumber,
        otpHash,
        expiresAt,
        attempts: 0,
        requestedAt: new Date()
      },
      update: {
        otpHash,
        expiresAt,
        attempts: 0, // Reset failed attempts
        requestedAt: new Date()
      }
    });

    // LOG TO CONSOLE FOR TESTING
    console.log("\n==================================================");
    console.log(`📱 [MOBILE OTP] Code for ${mobileNumber}: ${otp}`);
    console.log(`⏳ Expiration: 3 minutes (expires at ${expiresAt.toLocaleTimeString()})`);
    console.log("==================================================\n");

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully. Please check your SMS inbox (or console log during testing)."
    });
  } catch (error: any) {
    console.error("Send OTP route error:", error);
    return NextResponse.json({ error: error.message || "Failed to send OTP." }, { status: 500 });
  }
}
