import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, withTimestamps, withUpdatedTimestamp } from "@/lib/supabaseServer";

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
      const { data: listing } = await supabaseServer
        .from("HiringListing")
        .select("id, userAddress, listingType")
        .eq("userAddress", userAddress)
        .maybeSingle();

      if (!listing) {
        return NextResponse.json({ success: true, requests: [], total: 0 });
      }

      const { data: requests } = await supabaseServer
        .from("HiringRequest")
        .select("*")
        .eq("listingId", listing.id)
        .order("createdAt", { ascending: false });

      const requestList = requests || [];
      const senderAddresses = Array.from(new Set(requestList.map((r: any) => r.senderAddress.toLowerCase())));

      let profiles: any[] = [];
      if (senderAddresses.length > 0) {
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

      const enriched = requestList.map((r: any) => {
        const p = profileMap.get(r.senderAddress.toLowerCase());
        return {
          ...r,
          senderProfile: {
            username: p?.username || `user_${r.senderAddress.slice(0, 8)}`,
            displayName: p?.displayName || r.senderName,
            avatarUrl: p?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${r.senderAddress}`,
          },
        };
      });

      return NextResponse.json({ success: true, requests: enriched, total: enriched.length });
    } else {
      // Sent requests by this user
      const { data: requests } = await supabaseServer
        .from("HiringRequest")
        .select("*, listing:HiringListing(*)")
        .eq("senderAddress", userAddress)
        .order("createdAt", { ascending: false });

      return NextResponse.json({ success: true, requests: requests || [], total: (requests || []).length });
    }
  } catch (error: any) {
    console.error("GET /api/hiring/requests error:", error);
    return NextResponse.json({ success: true, requests: [], total: 0 });
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
    const { data: listing } = await supabaseServer
      .from("HiringListing")
      .select("id, userAddress, listingType")
      .eq("id", listingId)
      .maybeSingle();

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    if (listing.userAddress.toLowerCase() === normalizedSender) {
      return NextResponse.json({ error: "You cannot send a hiring request to your own listing." }, { status: 400 });
    }

    const { data: existing } = await supabaseServer
      .from("HiringRequest")
      .select("id")
      .eq("listingId", listingId)
      .eq("senderAddress", normalizedSender)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "You already have a pending request sent to this creator." },
        { status: 400 }
      );
    }

    const { data: request, error: insertErr } = await supabaseServer
      .from("HiringRequest")
      .insert(
        withTimestamps({
          listingId,
          senderAddress: normalizedSender,
          senderName: senderName.trim(),
          senderEmail: senderEmail.trim(),
          senderPhone: senderPhone.trim(),
          message: message.trim(),
          status: "pending",
        })
      )
      .select()
      .single();

    if (insertErr || !request) {
      throw new Error(insertErr?.message || "Failed to create request");
    }

    // Create notification
    try {
      await supabaseServer.from("Notification").insert(
        withTimestamps({
          recipientAddress: listing.userAddress.toLowerCase(),
          senderAddress: normalizedSender,
          type: "HIRING_REQUEST",
          title: "New Hiring / Promotion Inquiry 💼",
          message: `${senderName.trim()} sent you a ${listing.listingType === "hiring" ? "hiring" : "promotion"} inquiry!`,
          link: "/hiring?tab=deals",
          read: false,
        })
      );
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

    const { data: request } = await supabaseServer
      .from("HiringRequest")
      .select("*, listing:HiringListing(*)")
      .eq("id", requestId)
      .maybeSingle();

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (request.listing?.userAddress?.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized to update this request" }, { status: 403 });
    }

    const { data: updated, error } = await supabaseServer
      .from("HiringRequest")
      .update(withUpdatedTimestamp({ status }))
      .eq("id", requestId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, request: updated });
  } catch (error: any) {
    console.error("PATCH /api/hiring/requests error:", error);
    return NextResponse.json({ error: error.message || "Failed to update request" }, { status: 500 });
  }
}
