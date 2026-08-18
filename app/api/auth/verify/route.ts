import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWalletSignature, signAuthToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, signature } = await req.json();

    if (!walletAddress || !signature) {
      return NextResponse.json({ error: "Wallet address and signature required" }, { status: 400 });
    }

    const normalizedAddress = walletAddress.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { walletAddress: normalizedAddress },
      include: { profile: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User non-existent. Request nonce first." }, { status: 404 });
    }

    const isValid = verifyWalletSignature(normalizedAddress, user.nonce, signature);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature verification" }, { status: 401 });
    }

    // Refresh nonce after successful signature
    const newNonce = `nonce_${Math.floor(Math.random() * 1000000).toString()}_${Date.now()}`;
    await prisma.user.update({
      where: { walletAddress: normalizedAddress },
      data: { nonce: newNonce },
    });

    const token = signAuthToken(normalizedAddress);

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        profile: user.profile,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Authentication failed" }, { status: 500 });
  }
}
