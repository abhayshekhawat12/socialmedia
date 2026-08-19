import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
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
    const { data: listingsData } = await supabaseServer
      .from("HiringListing")
      .select("*")
      .order("createdAt", { ascending: false });

    const listings = listingsData || [];

    // Populate user profile info
    const userAddresses = Array.from(new Set(listings.map((l: any) => l.userAddress.toLowerCase())));
    let profiles: any[] = [];
    if (userAddresses.length > 0) {
      const { data: profs } = await supabaseServer
        .from("Profile")
        .select("*, user:User(*)");
      profiles = profs || [];
    }

    const profileMap = new Map<string, any>();
    profiles.forEach((p: any) => {
      if (p.user?.walletAddress) profileMap.set(p.user.walletAddress.toLowerCase(), p);
      if (p.userId) profileMap.set(p.userId.toLowerCase(), p);
      if (p.username) profileMap.set(p.username.toLowerCase(), p);
    });

    const enriched = listings.map((l: any) => {
      const p = profileMap.get(l.userAddress.toLowerCase());
      let parsedPackages = [];
      try {
        parsedPackages = typeof l.packages === "string" ? JSON.parse(l.packages) : l.packages || [];
      } catch {
        parsedPackages = [];
      }

      return {
        ...l,
        packages: parsedPackages,
        profile: {
          username: p?.username || `user_${l.userAddress.slice(0, 8)}`,
          displayName: p?.displayName || l.fullName,
          avatarUrl: p?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${l.userAddress}`,
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
