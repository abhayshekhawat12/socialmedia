import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("walletAddress")?.toLowerCase();

  if (!address) {
    return NextResponse.json({ error: "Address required" }, { status: 400 });
  }

  let settings = await prisma.userSettings.findUnique({
    where: { walletAddress: address },
  });

  if (!settings) {
    settings = await prisma.userSettings.create({
      data: { walletAddress: address },
    });
  }

  const blockedAccounts = await prisma.blockedAccount.findMany({
    where: { blockerAddress: address },
  });

  const sessions = await prisma.userSession.findMany({
    where: { walletAddress: address },
    orderBy: { lastActive: "desc" },
  });

  if (sessions.length === 0) {
    await prisma.userSession.create({
      data: {
        walletAddress: address,
        deviceName: "Chrome on Windows 11 (Current)",
        location: "Mumbai, India",
        isCurrent: true,
      },
    });
  }

  return NextResponse.json({
    settings,
    blockedAccounts,
    sessions,
  });
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const address = body.walletAddress?.toLowerCase();

    if (!address) {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
    }

    const { walletAddress, action, targetAddress, blockType, ...settingsData } = body;

    if (action === "block" || action === "unblock") {
      if (!targetAddress) {
        return NextResponse.json({ error: "Target address required" }, { status: 400 });
      }

      if (action === "block") {
        await prisma.blockedAccount.upsert({
          where: {
            blockerAddress_blockedAddress_type: {
              blockerAddress: address,
              blockedAddress: targetAddress.toLowerCase(),
              type: blockType || "block",
            },
          },
          create: {
            blockerAddress: address,
            blockedAddress: targetAddress.toLowerCase(),
            type: blockType || "block",
          },
          update: {
            type: blockType || "block",
          },
        });
      } else {
        await prisma.blockedAccount.deleteMany({
          where: {
            blockerAddress: address,
            blockedAddress: targetAddress.toLowerCase(),
            type: blockType || "block",
          },
        });
      }

      const blockedAccounts = await prisma.blockedAccount.findMany({
        where: { blockerAddress: address },
      });

      return NextResponse.json({ success: true, blockedAccounts });
    }

    const updatedSettings = await prisma.userSettings.upsert({
      where: { walletAddress: address },
      create: {
        walletAddress: address,
        ...settingsData,
      },
      update: {
        ...settingsData,
      },
    });

    return NextResponse.json({ success: true, settings: updatedSettings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save settings" }, { status: 500 });
  }
}
