import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

    // Find user by walletAddress, email, mobileNumber, or id
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanIdent },
          { mobileNumber: cleanIdent },
          { walletAddress: cleanIdent },
          { id: cleanIdent },
          { profile: { username: cleanIdent } },
        ],
      },
      include: { profile: true },
    });

    // If user does not exist, create user and profile seamlessly
    if (!user) {
      const hash = crypto.createHash("sha256").update(cleanIdent).digest("hex");
      const generatedAddress = `usr_${hash.slice(0, 16)}`;
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanIdent);
      const isMobile = /^\+?[0-9]{7,15}$/.test(cleanIdent);

      user = await prisma.user.create({
        data: {
          walletAddress: generatedAddress,
          email: isEmail ? cleanIdent : null,
          mobileNumber: isMobile ? cleanIdent : null,
          profile: {
            create: {
              username: `user_${generatedAddress.slice(4, 12)}`,
              displayName: cleanIdent.split("@")[0],
              avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${generatedAddress}`,
              bio: "Pulse Mobile Creator",
            },
          },
        },
        include: { profile: true },
      });
    }

    const token = signAuthToken(user.id, user.walletAddress || user.id);

    return NextResponse.json({
      success: true,
      token,
      user,
    });
  } catch (error: any) {
    console.error("Login API error:", error);
    return NextResponse.json({ error: error.message || "Failed to authenticate" }, { status: 500 });
  }
}
