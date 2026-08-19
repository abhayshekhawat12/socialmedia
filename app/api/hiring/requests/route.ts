import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get("userAddress")?.toLowerCase();
    const mode = searchParams.get("mode") || "incoming"; // incoming | sent

    if (!userAddress) {
      return NextResponse.json({ error: "User address required" }, { status: 400 });
    }

    if (mode === "incoming") {
      // Find creator's listing first
      const listing = await prisma.hiringListing.findUnique({
        where: { userAddress },
        include: {
          requests: {
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!listing) {
        return NextResponse.json({ success: true, requests: [], total: 0 });
      }

      // Enrich requests with sender profiles
      const senderAddresses = Array.from(new Set(listing.requests.map((r) => r.senderAddress.toLowerCase())));
      const profiles = await prisma.profile.findMany({
        where: { user: { walletAddress: { in: senderAddresses } } },
        include: { user: true },
      });

      const profileMap = new Map<string, any>();
      profiles.forEach((p) => {
        if (p.user?.walletAddress) {
          profileMap.set(p.user.walletAddress.toLowerCase(), p);
        }
      });

      const enriched = listing.requests.map((r) => {
        const p = profileMap.get(r.senderAddress.toLowerCase());
        return {
          ...r,
          senderProfile: {
            username: p?.username || `user_${r.senderAddress.slice(0, 8)}`,
            displayName: p?.displayName || r.senderName,
            avatarUrl: p?.avatarUrl || "",
          },
        };
      });

      return NextResponse.json({ success: true, requests: enriched, total: enriched.length });
    } else {
      // Sent requests by this user
      const requests = await prisma.hiringRequest.findMany({
        where: { senderAddress: userAddress },
        include: { listing: true },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ success: true, requests, total: requests.length });
    }
  } catch (error: any) {
    console.error("GET /api/hiring/requests error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch requests" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      listingId,
      senderAddress,
      senderName,
      senderEmail,
      senderPhone,
      message,
    } = body;

    if (!listingId || !senderAddress || !senderName || !senderEmail || !senderPhone || !message) {
      return NextResponse.json(
        { error: "All fields (Name, Email, Phone, Message) are required" },
        { status: 400 }
      );
    }

    const normalizedSender = senderAddress.toLowerCase();

    // Check if listing exists
    const listing = await prisma.hiringListing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    if (listing.userAddress.toLowerCase() === normalizedSender) {
      return NextResponse.json({ error: "You cannot send a hiring request to your own listing." }, { status: 400 });
    }

    // Check duplicate recent request
    const existing = await prisma.hiringRequest.findFirst({
      where: {
        listingId,
        senderAddress: normalizedSender,
        status: "pending",
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "You already have a pending request sent to this creator." },
        { status: 400 }
      );
    }

    const request = await prisma.hiringRequest.create({
      data: {
        listingId,
        senderAddress: normalizedSender,
        senderName: senderName.trim(),
        senderEmail: senderEmail.trim(),
        senderPhone: senderPhone.trim(),
        message: message.trim(),
        status: "pending",
      },
    });

    // Create a notification for the listing owner
    try {
      await prisma.notification.create({
        data: {
          recipientAddress: listing.userAddress.toLowerCase(),
          senderAddress: normalizedSender,
          type: "HIRING_REQUEST",
          title: "New Hiring / Promotion Inquiry",
          message: `${senderName.trim()} sent you a ${listing.listingType === "hiring" ? "hiring" : "promotion"} inquiry!`,
          link: "/hiring?tab=requests",
        },
      });
    } catch (notifErr) {
      console.warn("Could not create hiring notification:", notifErr);
    }

    return NextResponse.json({ success: true, request });
  } catch (error: any) {
    console.error("POST /api/hiring/requests error:", error);
    return NextResponse.json({ error: error.message || "Failed to send request" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { requestId, status, userAddress } = body; // status: accepted | rejected

    if (!requestId || !status || !userAddress) {
      return NextResponse.json({ error: "requestId, status, and userAddress required" }, { status: 400 });
    }

    const request = await prisma.hiringRequest.findUnique({
      where: { id: requestId },
      include: { listing: true },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (request.listing.userAddress.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized to update this request" }, { status: 403 });
    }

    const updated = await prisma.hiringRequest.update({
      where: { id: requestId },
      data: { status },
    });

    return NextResponse.json({ success: true, request: updated });
  } catch (error: any) {
    console.error("PATCH /api/hiring/requests error:", error);
    return NextResponse.json({ error: error.message || "Failed to update request" }, { status: 500 });
  }
}
