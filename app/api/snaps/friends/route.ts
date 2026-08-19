import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/snaps/friends?userAddress=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get("userAddress")?.toLowerCase();

    if (!userAddress) {
      return NextResponse.json({ error: "userAddress is required" }, { status: 400 });
    }

    // 1. Fetch user's following and followers
    const [following, followers, allProfiles] = await Promise.all([
      prisma.follow.findMany({
        where: { followerAddress: userAddress },
        select: { followingAddress: true },
      }),
      prisma.follow.findMany({
        where: { followingAddress: userAddress },
        select: { followerAddress: true },
      }),
      prisma.profile.findMany({
        take: 30,
        orderBy: { createdAt: "desc" },
        include: { user: true },
      }),
    ]);

    const friendAddressSet = new Set<string>();
    following.forEach((f) => friendAddressSet.add(f.followingAddress.toLowerCase()));
    followers.forEach((f) => friendAddressSet.add(f.followerAddress.toLowerCase()));

    // Fallback: If user has few follows, include active community profiles so they can test Snaps & Streaks right away!
    allProfiles.forEach((p) => {
      if (p.user.walletAddress && p.user.walletAddress.toLowerCase() !== userAddress) {
        friendAddressSet.add(p.user.walletAddress.toLowerCase());
      }
    });

    friendAddressSet.delete(userAddress);
    const friendAddresses = Array.from(friendAddressSet);

    // 2. Fetch profiles for all friends
    const profiles = await prisma.profile.findMany({
      where: { user: { walletAddress: { in: friendAddresses } } },
      include: { user: true },
    });

    const profileMap = new Map();
    profiles.forEach((p) => {
      if (p.user.walletAddress) {
        profileMap.set(p.user.walletAddress.toLowerCase(), p);
      }
    });

    // 3. Fetch Streaks for this user
    const streaks = await prisma.streak.findMany({
      where: {
        OR: [{ user1Address: userAddress }, { user2Address: userAddress }],
      },
    });

    const streakMap = new Map();
    streaks.forEach((st) => {
      const partner = st.user1Address.toLowerCase() === userAddress ? st.user2Address.toLowerCase() : st.user1Address.toLowerCase();
      streakMap.set(partner, st);
    });

    // 4. Fetch recent snaps between user and friends to determine today's status
    const recentSnaps = await prisma.snap.findMany({
      where: {
        OR: [{ senderAddress: userAddress }, { receiverAddress: userAddress }],
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const now = new Date();
    const oneDayMs = 24 * 60 * 60 * 1000;

    const friendsList = friendAddresses.map((addr) => {
      const prof = profileMap.get(addr);
      const streakRecord = streakMap.get(addr);
      const currentStreak = streakRecord?.currentStreak || 0;

      // Snaps sent to this friend in last 24h
      const sentToFriend = recentSnaps.some(
        (s) => s.senderAddress === userAddress && s.receiverAddress === addr && now.getTime() - new Date(s.createdAt).getTime() < oneDayMs
      );

      // Snaps received from this friend in last 24h
      const receivedFromFriend = recentSnaps.some(
        (s) => s.senderAddress === addr && s.receiverAddress === userAddress && now.getTime() - new Date(s.createdAt).getTime() < oneDayMs
      );

      let streakStatus: "active_today" | "pending_my_snap" | "pending_their_snap" | "no_streak" = "no_streak";
      if (sentToFriend && receivedFromFriend) {
        streakStatus = "active_today";
      } else if (!sentToFriend && receivedFromFriend) {
        streakStatus = "pending_my_snap";
      } else if (sentToFriend && !receivedFromFriend) {
        streakStatus = "pending_their_snap";
      }

      // Check if streak is at risk (> 24 hours since last snap)
      const lastSnap = recentSnaps.find(
        (s) => (s.senderAddress === userAddress && s.receiverAddress === addr) || (s.senderAddress === addr && s.receiverAddress === userAddress)
      );

      return {
        walletAddress: addr,
        displayName: prof?.displayName || `User ${addr.slice(0, 6)}`,
        username: prof?.username || `user_${addr.slice(0, 8)}`,
        avatarUrl: prof?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${addr}`,
        currentStreak,
        streakStatus,
        lastSnapAt: lastSnap?.createdAt || null,
        isMutualFollow: following.some((f) => f.followingAddress.toLowerCase() === addr) && followers.some((f) => f.followerAddress.toLowerCase() === addr),
      };
    });

    // Sort friends: active streaks first, then alphabetized
    friendsList.sort((a, b) => b.currentStreak - a.currentStreak || a.displayName.localeCompare(b.displayName));

    return NextResponse.json({
      success: true,
      friends: friendsList,
    });
  } catch (error: any) {
    console.error("GET /api/snaps/friends error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch friends list" }, { status: 500 });
  }
}
