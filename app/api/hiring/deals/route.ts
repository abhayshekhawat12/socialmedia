import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get("userAddress")?.toLowerCase();
    const status = searchParams.get("status"); // all | active | completed

    if (!userAddress) {
      return NextResponse.json({ error: "User address required" }, { status: 400 });
    }

    const where: any = {
      OR: [
        { creatorAddress: userAddress },
        { clientAddress: userAddress },
      ],
    };

    if (status && status !== "all") {
      if (status === "active") {
        where.status = { in: ["request", "negotiation", "accepted", "content_pending", "review"] };
      } else {
        where.status = status;
      }
    }

    const deals = await prisma.deal.findMany({
      where,
      include: {
        reviews: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    // Populate creator and client profiles
    const allAddresses = Array.from(
      new Set(deals.flatMap((d) => [d.creatorAddress.toLowerCase(), d.clientAddress.toLowerCase()]))
    );

    const profiles = await prisma.profile.findMany({
      where: { user: { walletAddress: { in: allAddresses } } },
      include: { user: true },
    });

    const profileMap = new Map<string, any>();
    profiles.forEach((p) => {
      if (p.user?.walletAddress) {
        profileMap.set(p.user.walletAddress.toLowerCase(), p);
      }
    });

    const enriched = deals.map((d) => {
      const creatorProf = profileMap.get(d.creatorAddress.toLowerCase());
      const clientProf = profileMap.get(d.clientAddress.toLowerCase());

      return {
        ...d,
        creator: {
          walletAddress: d.creatorAddress,
          displayName: creatorProf?.displayName || `Creator ${d.creatorAddress.slice(0, 6)}`,
          username: creatorProf?.username || `user_${d.creatorAddress.slice(0, 8)}`,
          avatarUrl: creatorProf?.avatarUrl || "",
        },
        client: {
          walletAddress: d.clientAddress,
          displayName: clientProf?.displayName || `Client ${d.clientAddress.slice(0, 6)}`,
          username: clientProf?.username || `user_${d.clientAddress.slice(0, 8)}`,
          avatarUrl: clientProf?.avatarUrl || "",
        },
      };
    });

    return NextResponse.json({ success: true, deals: enriched, total: enriched.length });
  } catch (error: any) {
    console.error("GET /api/hiring/deals error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch deals" }, { status: 500 });
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

    const deal = await prisma.deal.create({
      data: {
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
      },
    });

    // Notify creator
    try {
      await prisma.notification.create({
        data: {
          recipientAddress: normalizedCreator,
          senderAddress: normalizedClient,
          type: "DEAL_REQUEST",
          title: "New Collaboration Deal Offer",
          message: `You received a ₹${Number(price).toLocaleString()} deal offer for ${service}!`,
          link: `/hiring?tab=deals&dealId=${deal.id}`,
        },
      });
    } catch (notifErr) {
      console.warn("Deal notification failed:", notifErr);
    }

    return NextResponse.json({ success: true, deal });
  } catch (error: any) {
    console.error("POST /api/hiring/deals error:", error);
    return NextResponse.json({ error: error.message || "Failed to create deal" }, { status: 500 });
  }
}
