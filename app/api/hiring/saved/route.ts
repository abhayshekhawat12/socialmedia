import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, withTimestamps } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get("userAddress")?.toLowerCase();

    if (!userAddress) {
      return NextResponse.json({ error: "User address required" }, { status: 400 });
    }

    const { data: savedData } = await supabaseServer
      .from("SavedCreator")
      .select("*, listing:HiringListing(*)")
      .eq("userAddress", userAddress)
      .order("createdAt", { ascending: false });

    const saved = savedData || [];
    const listingAddresses = saved.map((s: any) => s.listing?.userAddress?.toLowerCase()).filter(Boolean);

    let profiles: any[] = [];
    if (listingAddresses.length > 0) {
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

    const enriched = saved.map((s: any) => {
      const p = profileMap.get(s.listing?.userAddress?.toLowerCase());
      return {
        ...s,
        listing: {
          ...s.listing,
          profile: {
            username: p?.username || `user_${(s.listing?.userAddress || "").slice(0, 8)}`,
            displayName: p?.displayName || s.listing?.fullName,
            avatarUrl: p?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${s.listing?.userAddress}`,
          },
        },
      };
    });

    return NextResponse.json({ success: true, savedCreators: enriched, total: enriched.length });
  } catch (error: any) {
    console.error("GET /api/hiring/saved error:", error);
    return NextResponse.json({ success: true, savedCreators: [], total: 0 });
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
    const { data: existing } = await supabaseServer
      .from("SavedCreator")
      .select("id")
      .eq("userAddress", normalizedAddress)
      .eq("listingId", listingId)
      .maybeSingle();

    if (existing) {
      await supabaseServer
        .from("SavedCreator")
        .delete()
        .eq("id", existing.id);
      return NextResponse.json({ success: true, isSaved: false, message: "Creator removed from saved" });
    } else {
      await supabaseServer
        .from("SavedCreator")
        .insert(
          withTimestamps({
            userAddress: normalizedAddress,
            listingId,
          })
        );
      return NextResponse.json({ success: true, isSaved: true, message: "Creator saved ⭐" });
    }
  } catch (error: any) {
    console.error("POST /api/hiring/saved error:", error);
    return NextResponse.json({ error: error.message || "Failed to toggle save creator" }, { status: 500 });
  }
}
