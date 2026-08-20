import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, withCreatedAt } from "@/lib/supabaseServer";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get("userAddress")?.toLowerCase();

    if (!userAddress) {
      return NextResponse.json({ error: "User address is required" }, { status: 400 });
    }

    // Resolve user aliases to catch all notifications
    const { data: userRecord } = await supabaseServer
      .from("User")
      .select("id, walletAddress, email, profile:Profile(username)")
      .or(`id.eq.${userAddress},walletAddress.eq.${userAddress},email.eq.${userAddress}`)
      .maybeSingle();

    const targetAliases = Array.from(
      new Set([
        userAddress,
        userRecord?.id?.toLowerCase(),
        userRecord?.walletAddress?.toLowerCase(),
        userRecord?.email?.toLowerCase(),
      ].filter(Boolean) as string[])
    );

    const { data: notifications, error } = await supabaseServer
      .from("Notification")
      .select("*")
      .in("recipientAddress", targetAliases)
      .order("createdAt", { ascending: false })
      .limit(40);

    if (error) {
      return NextResponse.json({ success: true, notifications: [] });
    }

    const notifList = notifications || [];
    const senderAddresses = Array.from(
      new Set(notifList.map((n) => (n.senderAddress || n.actorAddress || "").toLowerCase()))
    ).filter(Boolean);

    let profiles: any[] = [];
    if (senderAddresses.length > 0) {
      const { data: profileData } = await supabaseServer
        .from("Profile")
        .select("*, user:User(*)");
      profiles = profileData || [];
    }

    const profileMap = new Map<string, any>();
    for (const p of profiles) {
      if (p.user) {
        if (p.user.walletAddress) profileMap.set(p.user.walletAddress.toLowerCase(), p);
        if (p.user.id) profileMap.set(p.user.id.toLowerCase(), p);
      }
      if (p.userId) profileMap.set(p.userId.toLowerCase(), p);
      if (p.username) profileMap.set(p.username.toLowerCase(), p);
    }

    const enriched = notifList.map((n) => {
      const actorKey = (n.senderAddress || n.actorAddress || "").toLowerCase();
      const prof = profileMap.get(actorKey);
      return {
        ...n,
        actorProfile: {
          username: prof?.username || `user_${actorKey.slice(0, 8)}`,
          displayName: prof?.displayName || `User ${actorKey.slice(0, 6)}`,
          avatarUrl: prof?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${actorKey}`,
        },
      };
    });

    return NextResponse.json({ success: true, notifications: enriched });
  } catch (error: any) {
    return NextResponse.json({ success: true, notifications: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { recipientAddress, senderAddress, type, title, message, link } = await req.json();

    if (!recipientAddress || !message) {
      return NextResponse.json({ error: "recipientAddress and message required" }, { status: 400 });
    }

    const { data: notif, error } = await supabaseServer.from("Notification").insert(
      withCreatedAt({
        id: crypto.randomUUID(),
        recipientAddress: recipientAddress.toLowerCase(),
        senderAddress: (senderAddress || "system").toLowerCase(),
        type: type || "INFO",
        title: title || "New Notification",
        message,
        link: link || "/",
        read: false,
      })
    ).select().single();

    if (error) throw error;

    return NextResponse.json({ success: true, notification: notif });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create notification" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { notificationId, userAddress, markAll } = body;

    if (markAll && userAddress) {
      await supabaseServer
        .from("Notification")
        .update({ read: true })
        .eq("recipientAddress", userAddress.toLowerCase());
      return NextResponse.json({ success: true });
    }

    if (notificationId) {
      await supabaseServer
        .from("Notification")
        .update({ read: true })
        .eq("id", notificationId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update notification" }, { status: 500 });
  }
}
