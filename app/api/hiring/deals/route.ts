import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, withTimestamps, withUpdatedTimestamp } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get("userAddress")?.toLowerCase();
    const status = searchParams.get("status"); // all | active | completed

    if (!userAddress) {
      return NextResponse.json({ error: "User address required" }, { status: 400 });
    }

    let queryBuilder = supabaseServer
      .from("Deal")
      .select("*")
      .or(`creatorAddress.eq.${userAddress},clientAddress.eq.${userAddress}`)
      .order("updatedAt", { ascending: false });

    if (status && status !== "all") {
      if (status === "active") {
        queryBuilder = queryBuilder.in("status", ["request", "negotiation", "accepted", "content_pending", "review"]);
      } else {
        queryBuilder = queryBuilder.eq("status", status);
      }
    }

    const { data: dealsData } = await queryBuilder;
    const deals = dealsData || [];

    // Populate creator and client profiles
    const allAddresses = Array.from(
      new Set(deals.flatMap((d: any) => [d.creatorAddress.toLowerCase(), d.clientAddress.toLowerCase()]))
    );

    let profiles: any[] = [];
    if (allAddresses.length > 0) {
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

    const enriched = deals.map((d: any) => {
      const creatorProf = profileMap.get(d.creatorAddress.toLowerCase());
      const clientProf = profileMap.get(d.clientAddress.toLowerCase());

      return {
        ...d,
        creator: {
          walletAddress: d.creatorAddress,
          displayName: creatorProf?.displayName || `Creator ${d.creatorAddress.slice(0, 6)}`,
          username: creatorProf?.username || `user_${d.creatorAddress.slice(0, 8)}`,
          avatarUrl: creatorProf?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${d.creatorAddress}`,
        },
        client: {
          walletAddress: d.clientAddress,
          displayName: clientProf?.displayName || `Client ${d.clientAddress.slice(0, 6)}`,
          username: clientProf?.username || `user_${d.clientAddress.slice(0, 8)}`,
          avatarUrl: clientProf?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${d.clientAddress}`,
        },
      };
    });

    return NextResponse.json({ success: true, deals: enriched, total: enriched.length });
  } catch (error: any) {
    console.error("GET /api/hiring/deals error:", error);
    return NextResponse.json({ success: true, deals: [], total: 0 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      creatorAddress,
      clientAddress,
      service,
      price,
      deliverables,
      deadline = "Within 7 days",
      description = "",
    } = body;

    if (!creatorAddress || !clientAddress || !service || !price || !deliverables) {
      return NextResponse.json(
        { error: "creatorAddress, clientAddress, service, price, and deliverables are required" },
        { status: 400 }
      );
    }

    const normalizedCreator = creatorAddress.toLowerCase();
    const normalizedClient = clientAddress.toLowerCase();

    if (normalizedCreator === normalizedClient) {
      return NextResponse.json({ error: "Cannot create deal with yourself." }, { status: 400 });
    }

    const initialLog = JSON.stringify([
      {
        action: "Deal Initiated",
        by: normalizedClient,
        price: Number(price),
        service,
        timestamp: new Date().toISOString(),
      },
    ]);

    const { data: deal, error: insertErr } = await supabaseServer
      .from("Deal")
      .insert(
        withTimestamps({
          creatorAddress: normalizedCreator,
          clientAddress: normalizedClient,
          service,
          price: Number(price),
          deliverables,
          deadline,
          description,
          status: "request",
          currentOfferBy: "client",
          timelineUpdates: initialLog,
        })
      )
      .select()
      .single();

    if (insertErr || !deal) {
      throw new Error(insertErr?.message || "Failed to create deal");
    }

    // Notify creator
    try {
      await supabaseServer.from("Notification").insert(
        withTimestamps({
          recipientAddress: normalizedCreator,
          senderAddress: normalizedClient,
          type: "DEAL_REQUEST",
          title: "New Collaboration Deal Offer 🤝",
          message: `You received a ₹${Number(price).toLocaleString()} deal offer for ${service}!`,
          link: `/hiring?tab=deals&dealId=${deal.id}`,
          read: false,
        })
      );
    } catch (notifErr) {
      console.warn("Deal notification failed:", notifErr);
    }

    return NextResponse.json({ success: true, deal });
  } catch (error: any) {
    console.error("POST /api/hiring/deals error:", error);
    return NextResponse.json({ error: error.message || "Failed to create deal" }, { status: 500 });
  }
}
