import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmailOtp } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { error: "Invalid email address. Please enter a valid email (e.g. alex@gmail.com)." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Rate limiting & Resend Cooldown (60 seconds)
    const existing = await prisma.otpVerification.findUnique({
      where: { identifier: cleanEmail },
    });

    if (existing) {
      const lastRequested = new Date(existing.requestedAt).getTime();
      const timeDiff = Date.now() - lastRequested;

      if (timeDiff < 60 * 1000) {
        const secondsLeft = Math.ceil((60 * 1000 - timeDiff) / 1000);
        return NextResponse.json(
          { error: `Please wait ${secondsLeft} seconds before requesting a new OTP.` },
          { status: 429 }
        );
      }
    }

    // 2. Generate secure 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash("sha256").update(rawOtp).digest("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    // 3. Dispatch real Email via Resend / SendGrid / SMTP
    const emailResult = await sendEmailOtp(cleanEmail, rawOtp);

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error || "Failed to send verification email. Please check your email configuration." },
        { status: 502 }
      );
    }

    // 4. Save hashed OTP in PostgreSQL
    await prisma.otpVerification.upsert({
      where: { identifier: cleanEmail },
      create: {
        identifier: cleanEmail,
        email: cleanEmail,
        type: "email",
        otpHash,
        expiresAt,
        attempts: 0,
        requestedAt: new Date(),
      },
      update: {
        otpHash,
        expiresAt,
        attempts: 0,
        requestedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Verification code sent to your email address.",
    });
  } catch (error: any) {
    console.error("[Send Email OTP Error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to send email verification code." },
      { status: 500 }
    );
  }
}
