import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "5", 10);
    const currentAddress = searchParams.get("currentAddress")?.toLowerCase();

    const users = await prisma.user.findMany({
      where: currentAddress
        ? {
            NOT: [
              { walletAddress: currentAddress },
              { id: currentAddress },
              { email: currentAddress },
            ],
          }
        : undefined,
      take: limit,
      include: { profile: true },
      orderBy: { createdAt: "desc" },
    });

    const creators = users
      .filter((u) => u.profile)
      .map((u) => ({
        walletAddress: u.walletAddress || u.id,
        username: u.profile?.username || `user_${(u.walletAddress || u.id).slice(0, 8)}`,
        displayName: u.profile?.displayName || "Pulse Creator",
        avatarUrl:
          u.profile?.avatarUrl ||
          `https://api.dicebear.com/7.x/bottts/svg?seed=${u.walletAddress || u.id}`,
        bio: u.profile?.bio || "Pulse Community Member",
      }));

    return NextResponse.json({ success: true, creators });
  } catch (error: any) {
    console.error("Error fetching suggested users:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch suggestions" }, { status: 500 });
  }
}
