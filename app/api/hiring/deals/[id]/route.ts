import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deal = await prisma.deal.findUnique({
      where: { id: params.id },
      include: {
        reviews: true,
      },
    });

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const profiles = await prisma.profile.findMany({
      where: {
        user: {
          walletAddress: { in: [deal.creatorAddress.toLowerCase(), deal.clientAddress.toLowerCase()] },
        },
      },
      include: { user: true },
    });

    const profileMap = new Map<string, any>();
    profiles.forEach((p) => {
      if (p.user?.walletAddress) {
        profileMap.set(p.user.walletAddress.toLowerCase(), p);
      }
    });
    const creatorProf = profileMap.get(deal.creatorAddress.toLowerCase());
    const clientProf = profileMap.get(deal.clientAddress.toLowerCase());

    return NextResponse.json({
      success: true,
      deal: {
        ...deal,
        creator: {
          walletAddress: deal.creatorAddress,
          displayName: creatorProf?.displayName || `Creator ${deal.creatorAddress.slice(0, 6)}`,
          username: creatorProf?.username || `user_${deal.creatorAddress.slice(0, 8)}`,
          avatarUrl: creatorProf?.avatarUrl || "",
        },
        client: {
          walletAddress: deal.clientAddress,
          displayName: clientProf?.displayName || `Client ${deal.clientAddress.slice(0, 6)}`,
          username: clientProf?.username || `user_${deal.clientAddress.slice(0, 8)}`,
          avatarUrl: clientProf?.avatarUrl || "",
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch deal" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const {
      userAddress,
      action, // accept_offer | reject_offer | counter_offer | submit_content | complete_deal | cancel
      counterPrice,
      counterDeliverables,
      counterDeadline,
      deliverableUrl,
      deliverableNotes,
    } = body;

    if (!userAddress || !action) {
      return NextResponse.json({ error: "userAddress and action are required" }, { status: 400 });
    }

    const normalizedUser = userAddress.toLowerCase();
    const deal = await prisma.deal.findUnique({
      where: { id: params.id },
    });

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const isCreator = deal.creatorAddress.toLowerCase() === normalizedUser;
    const isClient = deal.clientAddress.toLowerCase() === normalizedUser;

    if (!isCreator && !isClient) {
      return NextResponse.json({ error: "Unauthorized access to this deal" }, { status: 403 });
    }

    // Parse existing timeline log
    let timeline: any[] = [];
    try {
      timeline = JSON.parse(deal.timelineUpdates || "[]");
    } catch {
      timeline = [];
    }

    const updateData: any = {};

    if (action === "accept_offer") {
      updateData.status = "content_pending";
      updateData.termsLocked = true;
      timeline.push({
        action: "Offer Accepted & Terms Locked",
        by: normalizedUser,
        role: isCreator ? "creator" : "client",
        timestamp: new Date().toISOString(),
      });
    } else if (action === "reject_offer" || action === "cancel") {
      updateData.status = "cancelled";
      timeline.push({
        action: "Deal Cancelled",
        by: normalizedUser,
        role: isCreator ? "creator" : "client",
        timestamp: new Date().toISOString(),
      });
    } else if (action === "counter_offer") {
      updateData.status = "negotiation";
      if (counterPrice) updateData.price = Number(counterPrice);
      if (counterDeliverables) updateData.deliverables = counterDeliverables;
      if (counterDeadline) updateData.deadline = counterDeadline;
      updateData.currentOfferBy = isCreator ? "creator" : "client";

      timeline.push({
        action: "Counter Offer Proposed",
        by: normalizedUser,
        role: isCreator ? "creator" : "client",
        price: counterPrice || deal.price,
        deliverables: counterDeliverables || deal.deliverables,
        timestamp: new Date().toISOString(),
      });
    } else if (action === "submit_content") {
      if (!isCreator) {
        return NextResponse.json({ error: "Only the creator can submit deliverables." }, { status: 403 });
      }
      updateData.status = "review";
      if (deliverableUrl) updateData.deliverableUrl = deliverableUrl;
      if (deliverableNotes) updateData.deliverableNotes = deliverableNotes;

      timeline.push({
        action: "Deliverables Submitted for Client Review",
        by: normalizedUser,
        url: deliverableUrl,
        timestamp: new Date().toISOString(),
      });
    } else if (action === "complete_deal") {
      if (!isClient) {
        return NextResponse.json({ error: "Only the client can approve and complete the deal." }, { status: 403 });
      }
      updateData.status = "completed";
      timeline.push({
        action: "Deal Approved & Successfully Completed",
        by: normalizedUser,
        timestamp: new Date().toISOString(),
      });
    }

    updateData.timelineUpdates = JSON.stringify(timeline);

    const updatedDeal = await prisma.deal.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, deal: updatedDeal });
  } catch (error: any) {
    console.error("PATCH /api/hiring/deals/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to update deal" }, { status: 500 });
  }
}
