import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get("userAddress")?.toLowerCase();

    if (!userAddress) {
      return NextResponse.json({ error: "User address required" }, { status: 400 });
    }

    const saved = await prisma.savedCreator.findMany({
      where: { userAddress },
      include: {
        listing: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Populate user profiles
    const listingAddresses = saved.map((s) => s.listing.userAddress.toLowerCase());
    const profiles = await prisma.profile.findMany({
      where: { user: { walletAddress: { in: listingAddresses } } },
      include: { user: true },
    });

    const profileMap = new Map<string, any>();
    profiles.forEach((p) => {
      if (p.user?.walletAddress) {
        profileMap.set(p.user.walletAddress.toLowerCase(), p);
      }
    });

    const enriched = saved.map((s) => {
      const p = profileMap.get(s.listing.userAddress.toLowerCase());
      return {
        ...s,
        listing: {
          ...s.listing,
          profile: {
            username: p?.username || `user_${s.listing.userAddress.slice(0, 8)}`,
            displayName: p?.displayName || s.listing.fullName,
            avatarUrl: p?.avatarUrl || "",
          },
        },
      };
    });

    return NextResponse.json({ success: true, savedCreators: enriched, total: enriched.length });
  } catch (error: any) {
    console.error("GET /api/hiring/saved error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch saved creators" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userAddress, listingId } = body;

    if (!userAddress || !listingId) {
      return NextResponse.json({ error: "userAddress and listingId required" }, { status: 400 });
    }

    const normalizedAddress = userAddress.toLowerCase();

    // Check if already saved
    const existing = await prisma.savedCreator.findUnique({
      where: {
        userAddress_listingId: {
          userAddress: normalizedAddress,
          listingId,
        },
      },
    });

    if (existing) {
      await prisma.savedCreator.delete({
        where: { id: existing.id },
      });
      return NextResponse.json({ success: true, isSaved: false, message: "Creator removed from saved" });
    } else {
      await prisma.savedCreator.create({
        data: {
          userAddress: normalizedAddress,
          listingId,
        },
      });
      return NextResponse.json({ success: true, isSaved: true, message: "Creator saved ⭐" });
    }
  } catch (error: any) {
    console.error("POST /api/hiring/saved error:", error);
    return NextResponse.json({ error: error.message || "Failed to toggle save creator" }, { status: 500 });
  }
}
