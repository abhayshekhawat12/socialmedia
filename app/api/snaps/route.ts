import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, withTimestamps, withUpdatedTimestamp } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

function getSortedPair(a: string, b: string): [string, string] {
  return a.toLowerCase() < b.toLowerCase() ? [a.toLowerCase(), b.toLowerCase()] : [b.toLowerCase(), a.toLowerCase()];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get("userAddress")?.toLowerCase();

    if (!userAddress) {
      return NextResponse.json({ error: "userAddress is required" }, { status: 400 });
    }

    // 1. Fetch received snaps
    const { data: receivedSnapsData } = await supabaseServer
      .from("Snap")
      .select("*")
      .eq("receiverAddress", userAddress)
      .order("createdAt", { ascending: false })
      .limit(50);

    // 2. Fetch sent snaps
    const { data: sentSnapsData } = await supabaseServer
      .from("Snap")
      .select("*")
      .eq("senderAddress", userAddress)
      .order("createdAt", { ascending: false })
      .limit(30);

    const receivedSnaps = receivedSnapsData || [];
    const sentSnaps = sentSnapsData || [];

    const contactAddresses = Array.from(
      new Set([
        ...receivedSnaps.map((s: any) => s.senderAddress?.toLowerCase()),
        ...sentSnaps.map((s: any) => s.receiverAddress?.toLowerCase()),
      ])
    ).filter(Boolean);

    let profiles: any[] = [];
    if (contactAddresses.length > 0) {
      const { data: profs } = await supabaseServer
        .from("Profile")
        .select("*, user:User(*)");
      profiles = profs || [];
    }

    const profileMap = new Map();
    profiles.forEach((p: any) => {
      if (p.user?.walletAddress) profileMap.set(p.user.walletAddress.toLowerCase(), p);
      if (p.userId) profileMap.set(p.userId.toLowerCase(), p);
      if (p.username) profileMap.set(p.username.toLowerCase(), p);
    });

    // 4. Fetch streaks
    const { data: streaksData } = await supabaseServer
      .from("Streak")
      .select("*")
      .or(`user1Address.eq.${userAddress},user2Address.eq.${userAddress}`);

    const streakMap = new Map();
    (streaksData || []).forEach((st: any) => {
      const partner = st.user1Address.toLowerCase() === userAddress ? st.user2Address.toLowerCase() : st.user1Address.toLowerCase();
      streakMap.set(partner, st.currentStreak);
    });

    const formattedReceived = receivedSnaps.map((s: any) => {
      const prof = profileMap.get(s.senderAddress?.toLowerCase());
      return {
        id: s.id,
        senderAddress: s.senderAddress,
        mediaUrl: s.mediaUrl,
        mediaType: s.mediaType,
        caption: s.caption,
        duration: s.duration,
        isOpened: s.isOpened,
        openedAt: s.openedAt,
        createdAt: s.createdAt,
        streakCount: streakMap.get(s.senderAddress?.toLowerCase()) || 0,
        sender: {
          displayName: prof?.displayName || `User ${s.senderAddress.slice(0, 6)}`,
          username: prof?.username || `user_${s.senderAddress.slice(0, 8)}`,
          avatarUrl: prof?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${s.senderAddress}`,
        },
      };
    });

    const formattedSent = sentSnaps.map((s: any) => {
      const prof = profileMap.get(s.receiverAddress?.toLowerCase());
      return {
        id: s.id,
        receiverAddress: s.receiverAddress,
        mediaUrl: s.mediaUrl,
        mediaType: s.mediaType,
        caption: s.caption,
        duration: s.duration,
        isOpened: s.isOpened,
        openedAt: s.openedAt,
        createdAt: s.createdAt,
        streakCount: streakMap.get(s.receiverAddress?.toLowerCase()) || 0,
        receiver: {
          displayName: prof?.displayName || `User ${s.receiverAddress.slice(0, 6)}`,
          username: prof?.username || `user_${s.receiverAddress.slice(0, 8)}`,
          avatarUrl: prof?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${s.receiverAddress}`,
        },
      };
    });

    const unreadCount = receivedSnaps.filter((s: any) => !s.isOpened).length;

    return NextResponse.json({
      success: true,
      unreadCount,
      received: formattedReceived,
      sent: formattedSent,
    });
  } catch (error: any) {
    console.error("GET /api/snaps error:", error);
    return NextResponse.json({ success: true, unreadCount: 0, received: [], sent: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { senderAddress, receiverAddresses, mediaUrl, mediaType, caption, duration } = await req.json();

    if (!senderAddress || !mediaUrl || !Array.isArray(receiverAddresses) || receiverAddresses.length === 0) {
      return NextResponse.json({ error: "Missing required snap details" }, { status: 400 });
    }

    const normSender = senderAddress.toLowerCase();
    const createdSnaps = [];
    const updatedStreaks = [];

    const now = new Date();

    for (const rawReceiver of receiverAddresses) {
      const normReceiver = rawReceiver.toLowerCase();
      if (normReceiver === normSender) continue;

      const { data: snap } = await supabaseServer
        .from("Snap")
        .insert(
          withTimestamps({
            senderAddress: normSender,
            receiverAddress: normReceiver,
            mediaUrl,
            mediaType: mediaType || "image",
            caption: caption || null,
            duration: duration || 6,
          })
        )
        .select()
        .single();

      if (snap) createdSnaps.push(snap);

      const [u1, u2] = getSortedPair(normSender, normReceiver);

      const { data: streak } = await supabaseServer
        .from("Streak")
        .select("*")
        .eq("user1Address", u1)
        .eq("user2Address", u2)
        .maybeSingle();

      let currentStreakVal = 1;
      if (!streak) {
        await supabaseServer.from("Streak").insert(
          withTimestamps({
            user1Address: u1,
            user2Address: u2,
            currentStreak: 1,
            lastUser1SnapAt: normSender === u1 ? now.toISOString() : null,
            lastUser2SnapAt: normSender !== u1 ? now.toISOString() : null,
            lastStreakIncrementAt: now.toISOString(),
          })
        );
      } else {
        currentStreakVal = streak.currentStreak || 1;
        await supabaseServer
          .from("Streak")
          .update(
            withUpdatedTimestamp({
              currentStreak: currentStreakVal,
              lastUser1SnapAt: normSender === u1 ? now.toISOString() : streak.lastUser1SnapAt,
              lastUser2SnapAt: normSender !== u1 ? now.toISOString() : streak.lastUser2SnapAt,
            })
          )
          .eq("id", streak.id);
      }

      updatedStreaks.push({
        receiverAddress: normReceiver,
        streakCount: currentStreakVal,
      });

      try {
        await supabaseServer.from("Notification").insert(
          withTimestamps({
            recipientAddress: normReceiver,
            senderAddress: normSender,
            type: "SNAP",
            title: "New Snap Received 👻",
            message: `You received a new Snap! Keep your 👻 ${currentStreakVal} streak alive!`,
            link: "/snap",
            read: false,
          })
        );
      } catch (notifErr) {
        console.warn("Snap notification skipped:", notifErr);
      }
    }

    return NextResponse.json({
      success: true,
      sentCount: createdSnaps.length,
      snaps: createdSnaps,
      streaks: updatedStreaks,
    });
  } catch (error: any) {
    console.error("POST /api/snaps error:", error);
    return NextResponse.json({ error: error.message || "Failed to send snap" }, { status: 500 });
  }
}
