import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Helper to get normalized pair order
function getSortedPair(a: string, b: string): [string, string] {
  return a.toLowerCase() < b.toLowerCase() ? [a.toLowerCase(), b.toLowerCase()] : [b.toLowerCase(), a.toLowerCase()];
}

// GET /api/snaps?userAddress=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get("userAddress")?.toLowerCase();

    if (!userAddress) {
      return NextResponse.json({ error: "userAddress is required" }, { status: 400 });
    }

    // 1. Fetch received snaps (inbox)
    const receivedSnaps = await prisma.snap.findMany({
      where: { receiverAddress: userAddress },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // 2. Fetch sent snaps
    const sentSnaps = await prisma.snap.findMany({
      where: { senderAddress: userAddress },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    // 3. Collect unique addresses for profiles and streaks
    const contactAddresses = Array.from(
      new Set([
        ...receivedSnaps.map((s) => s.senderAddress),
        ...sentSnaps.map((s) => s.receiverAddress),
      ])
    );

    const profiles = await prisma.profile.findMany({
      where: { user: { walletAddress: { in: contactAddresses } } },
      include: { user: true },
    });

    const profileMap = new Map();
    profiles.forEach((p) => {
      if (p.user.walletAddress) {
        profileMap.set(p.user.walletAddress.toLowerCase(), p);
      }
    });

    // 4. Fetch streaks for all pairs involving userAddress
    const streaks = await prisma.streak.findMany({
      where: {
        OR: [{ user1Address: userAddress }, { user2Address: userAddress }],
      },
    });

    const streakMap = new Map();
    streaks.forEach((st) => {
      const partner = st.user1Address.toLowerCase() === userAddress ? st.user2Address.toLowerCase() : st.user1Address.toLowerCase();
      streakMap.set(partner, st.currentStreak);
    });

    const formattedReceived = receivedSnaps.map((s) => {
      const prof = profileMap.get(s.senderAddress.toLowerCase());
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
        streakCount: streakMap.get(s.senderAddress.toLowerCase()) || 0,
        sender: {
          displayName: prof?.displayName || `User ${s.senderAddress.slice(0, 6)}`,
          username: prof?.username || `user_${s.senderAddress.slice(0, 8)}`,
          avatarUrl: prof?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${s.senderAddress}`,
        },
      };
    });

    const formattedSent = sentSnaps.map((s) => {
      const prof = profileMap.get(s.receiverAddress.toLowerCase());
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
        streakCount: streakMap.get(s.receiverAddress.toLowerCase()) || 0,
        receiver: {
          displayName: prof?.displayName || `User ${s.receiverAddress.slice(0, 6)}`,
          username: prof?.username || `user_${s.receiverAddress.slice(0, 8)}`,
          avatarUrl: prof?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${s.receiverAddress}`,
        },
      };
    });

    const unreadCount = receivedSnaps.filter((s) => !s.isOpened).length;

    return NextResponse.json({
      success: true,
      unreadCount,
      received: formattedReceived,
      sent: formattedSent,
    });
  } catch (error: any) {
    console.error("GET /api/snaps error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch snaps" }, { status: 500 });
  }
}

// POST /api/snaps - Send snap to one or multiple friends
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

      // 1. Create Snap record
      const snap = await prisma.snap.create({
        data: {
          senderAddress: normSender,
          receiverAddress: normReceiver,
          mediaUrl,
          mediaType: mediaType || "image",
          caption: caption || null,
          duration: duration || 6,
        },
      });
      createdSnaps.push(snap);

      // 2. Compute / Update Daily 👻 Streak
      const [u1, u2] = getSortedPair(normSender, normReceiver);
      const isSenderU1 = normSender === u1;

      let streak = await prisma.streak.findUnique({
        where: {
          user1Address_user2Address: {
            user1Address: u1,
            user2Address: u2,
          },
        },
      });

      if (!streak) {
        // Initial streak creation
        streak = await prisma.streak.create({
          data: {
            user1Address: u1,
            user2Address: u2,
            currentStreak: 1, // Start 1st streak upon first exchange
            lastUser1SnapAt: isSenderU1 ? now : null,
            lastUser2SnapAt: !isSenderU1 ? now : null,
            lastStreakIncrementAt: now,
          },
        });
      } else {
        // Check timestamps for streak maintenance
        const lastPartnerSnap = isSenderU1 ? streak.lastUser2SnapAt : streak.lastUser1SnapAt;
        const lastMySnap = isSenderU1 ? streak.lastUser1SnapAt : streak.lastUser2SnapAt;
        const lastIncrement = streak.lastStreakIncrementAt;

        let newStreakCount = streak.currentStreak;

        // Check hours since last increment
        const hoursSinceIncrement = lastIncrement ? (now.getTime() - new Date(lastIncrement).getTime()) / (1000 * 60 * 60) : 999;
        
        // If partner also snapped within the last 36 hours and today is a new calendar day/cycle (> 18 hours since increment)
        if (hoursSinceIncrement >= 18 && hoursSinceIncrement <= 48) {
          newStreakCount = streak.currentStreak + 1;
        } else if (hoursSinceIncrement > 48 && streak.currentStreak > 0) {
          // Streak broken
          newStreakCount = 1;
        } else if (streak.currentStreak === 0) {
          newStreakCount = 1;
        }

        streak = await prisma.streak.update({
          where: { id: streak.id },
          data: {
            currentStreak: newStreakCount,
            lastUser1SnapAt: isSenderU1 ? now : streak.lastUser1SnapAt,
            lastUser2SnapAt: !isSenderU1 ? now : streak.lastUser2SnapAt,
            lastStreakIncrementAt: newStreakCount !== streak.currentStreak ? now : streak.lastStreakIncrementAt,
          },
        });
      }

      updatedStreaks.push({
        receiverAddress: normReceiver,
        streakCount: streak.currentStreak,
      });

      // 3. Create notification for receiver
      try {
        await prisma.notification.create({
          data: {
            recipientAddress: normReceiver,
            senderAddress: normSender,
            type: "SNAP",
            title: "New Snap Received 👻",
            message: `You received a new Snap from ${normSender.slice(0, 6)}! Keep your 👻 ${streak.currentStreak} streak alive!`,
            link: "/snap",
          },
        });
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
