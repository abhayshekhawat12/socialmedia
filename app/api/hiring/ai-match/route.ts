import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { matchCreatorsWithAI } from "@/lib/aiCreatorMatch";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt = "", category, location, budget, campaignDescription } = body;

    if (!prompt && !campaignDescription) {
      return NextResponse.json({ error: "Search prompt or campaign description is required" }, { status: 400 });
    }

    const combinedQuery = `${prompt} ${campaignDescription || ""}`.trim();

    // Fetch all creator listings
    const listings = await prisma.hiringListing.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Populate user profile info
    const userAddresses = Array.from(new Set(listings.map((l) => l.userAddress.toLowerCase())));
    const profiles = await prisma.profile.findMany({
      where: { user: { walletAddress: { in: userAddresses } } },
      include: { user: true },
    });

    const profileMap = new Map<string, any>();
    profiles.forEach((p) => {
      if (p.user?.walletAddress) {
        profileMap.set(p.user.walletAddress.toLowerCase(), p);
      }
    });

    const enriched = listings.map((l) => {
      const p = profileMap.get(l.userAddress.toLowerCase());
      return {
        ...l,
        profile: {
          username: p?.username || `user_${l.userAddress.slice(0, 8)}`,
          displayName: p?.displayName || l.fullName,
          avatarUrl: p?.avatarUrl || "",
        },
      };
    });

    const matches = matchCreatorsWithAI(combinedQuery, enriched, {
      budget: budget ? Number(budget) : undefined,
      category,
      location,
    });

    return NextResponse.json({
      success: true,
      matches,
      total: matches.length,
      query: combinedQuery,
    });
  } catch (error: any) {
    console.error("POST /api/hiring/ai-match error:", error);
    return NextResponse.json({ error: error.message || "AI creator matching failed" }, { status: 500 });
  }
}
