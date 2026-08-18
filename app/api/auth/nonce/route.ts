import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthChallengeMessage } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const walletAddress = searchParams.get("walletAddress")?.toLowerCase();

  if (!walletAddress) {
    return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
  }

  const nonce = `nonce_${Math.floor(Math.random() * 1000000).toString()}_${Date.now()}`;

  let user = await prisma.user.findUnique({
    where: { walletAddress },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        walletAddress,
        nonce,
        profile: {
          create: {
            username: `creator_${walletAddress.slice(2, 8)}`,
            displayName: `Web3 Creator ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
            bio: "Building on BlockSocial decentralized network.",
            web3ProfileId: `web3_id_${walletAddress.slice(2, 10)}`,
          },
        },
      },
    });
  } else {
    user = await prisma.user.update({
      where: { walletAddress },
      data: { nonce },
    });
  }

  const message = getAuthChallengeMessage(walletAddress, nonce);

  return NextResponse.json({
    walletAddress,
    nonce,
    message,
  });
}
