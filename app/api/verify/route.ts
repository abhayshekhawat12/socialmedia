import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const contentHash = searchParams.get("contentHash");

  if (!contentHash) {
    return NextResponse.json({ error: "contentHash query parameter is required" }, { status: 400 });
  }

  const verification = await prisma.contentVerification.findFirst({
    where: { contentHash },
    include: {
      post: {
        include: {
          nfts: true,
        },
      },
    },
  });

  if (!verification) {
    return NextResponse.json({
      verified: false,
      message: "No matching Proof-of-Creation content fingerprint found on blockchain registry.",
    }, { status: 404 });
  }

  const creatorProfile = await prisma.profile.findFirst({
    where: { user: { walletAddress: verification.authorAddress } },
  });

  return NextResponse.json({
    verified: true,
    verification: {
      id: verification.id,
      contentHash: verification.contentHash,
      authorAddress: verification.authorAddress,
      txHash: verification.txHash,
      verificationStatus: verification.verificationStatus,
      verifiedAt: verification.verifiedAt,
      creatorProfile: creatorProfile || {
        username: `creator_${verification.authorAddress.slice(2, 8)}`,
        displayName: `Creator ${verification.authorAddress.slice(0, 6)}`,
        web3ProfileId: `web3_id_${verification.authorAddress.slice(2, 10)}`,
      },
      post: verification.post,
    },
  });
}
