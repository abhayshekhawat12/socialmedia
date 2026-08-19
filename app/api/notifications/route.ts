import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const recipientAddress = searchParams.get("recipientAddress")?.toLowerCase();

  if (!recipientAddress) {
    return NextResponse.json({ error: "Recipient address required" }, { status: 400 });
  }

  const notifications = await prisma.notification.findMany({
    where: { recipientAddress },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const senderAddresses = Array.from(new Set(notifications.map((n) => n.senderAddress)));
  const profiles = await prisma.profile.findMany({
    where: {
      user: { walletAddress: { in: senderAddresses } },
    },
  });

  const enrichedNotifications = notifications.map((n) => {
    const senderProfile = profiles.find((p) => p.userId === n.senderAddress || p.id === n.senderAddress);
    return {
      ...n,
      senderProfile: senderProfile || {
        username: `user_${n.senderAddress.slice(0, 8)}`,
        displayName: `Creator ${n.senderAddress.slice(0, 6)}`,
        avatarUrl: "",
      },
    };
  });

  return NextResponse.json({ success: true, notifications: enrichedNotifications });
}

export async function PATCH(req: NextRequest) {
  try {
    const { recipientAddress } = await req.json();
    if (!recipientAddress) {
      return NextResponse.json({ error: "Recipient address required" }, { status: 400 });
    }

    await prisma.notification.updateMany({
      where: { recipientAddress: recipientAddress.toLowerCase(), read: false },
      data: { read: true },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Mark notifications read failed" }, { status: 500 });
  }
}
