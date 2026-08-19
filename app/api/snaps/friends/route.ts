import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get("userAddress")?.toLowerCase();

    if (!userAddress) {
      return NextResponse.json({ error: "userAddress is required" }, { status: 400 });
    }

    const [followingRes, followersRes, allProfilesRes] = await Promise.all([
      supabaseServer.from("Follow").select("followingAddress").eq("followerAddress", userAddress),
      supabaseServer.from("Follow").select("followerAddress").eq("followingAddress", userAddress),
      supabaseServer.from("Profile").select("*, user:User(*)").limit(30),
    ]);

    const following = followingRes.data || [];
    const followers = followersRes.data || [];
    const allProfiles = allProfilesRes.data || [];

    const friendAddressSet = new Set<string>();
    following.forEach((f: any) => friendAddressSet.add(f.followingAddress.toLowerCase()));
    followers.forEach((f: any) => friendAddressSet.add(f.followerAddress.toLowerCase()));

    allProfiles.forEach((p: any) => {
      if (p.user?.walletAddress && p.user.walletAddress.toLowerCase() !== userAddress) {
        friendAddressSet.add(p.user.walletAddress.toLowerCase());
      }
      if (p.userId && p.userId.toLowerCase() !== userAddress) {
        friendAddressSet.add(p.userId.toLowerCase());
      }
    });

    friendAddressSet.delete(userAddress);
    const friendAddresses = Array.from(friendAddressSet);

    let profiles: any[] = [];
    if (friendAddresses.length > 0) {
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

    const { data: streaksData } = await supabaseServer
      .from("Streak")
      .select("*")
      .or(`user1Address.eq.${userAddress},user2Address.eq.${userAddress}`);

    const streakMap = new Map();
    (streaksData || []).forEach((st: any) => {
      const partner = st.user1Address.toLowerCase() === userAddress ? st.user2Address.toLowerCase() : st.user1Address.toLowerCase();
      streakMap.set(partner, st);
    });

    const { data: recentSnapsData } = await supabaseServer
      .from("Snap")
      .select("*")
      .or(`senderAddress.eq.${userAddress},receiverAddress.eq.${userAddress}`)
      .order("createdAt", { ascending: false })
      .limit(100);

    const recentSnaps = recentSnapsData || [];
    const now = new Date();
    const oneDayMs = 24 * 60 * 60 * 1000;

    const friendsList = friendAddresses.map((addr) => {
      const prof = profileMap.get(addr);
      const streakRecord = streakMap.get(addr);
      const currentStreak = streakRecord?.currentStreak || 0;

      const sentToFriend = recentSnaps.some(
        (s: any) => s.senderAddress === userAddress && s.receiverAddress === addr && now.getTime() - new Date(s.createdAt).getTime() < oneDayMs
      );

      const receivedFromFriend = recentSnaps.some(
        (s: any) => s.senderAddress === addr && s.receiverAddress === userAddress && now.getTime() - new Date(s.createdAt).getTime() < oneDayMs
      );

      let streakStatus: "active_today" | "pending_my_snap" | "pending_their_snap" | "no_streak" = "no_streak";
      if (sentToFriend && receivedFromFriend) {
        streakStatus = "active_today";
      } else if (!sentToFriend && receivedFromFriend) {
        streakStatus = "pending_my_snap";
      } else if (sentToFriend && !receivedFromFriend) {
        streakStatus = "pending_their_snap";
      }

      const lastSnap = recentSnaps.find(
        (s: any) => (s.senderAddress === userAddress && s.receiverAddress === addr) || (s.senderAddress === addr && s.receiverAddress === userAddress)
      );

      return {
        walletAddress: addr,
        displayName: prof?.displayName || `User ${addr.slice(0, 6)}`,
        username: prof?.username || `user_${addr.slice(0, 8)}`,
        avatarUrl: prof?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${addr}`,
        currentStreak,
        streakStatus,
        lastSnapAt: lastSnap?.createdAt || null,
        isMutualFollow: following.some((f: any) => f.followingAddress?.toLowerCase() === addr) && followers.some((f: any) => f.followerAddress?.toLowerCase() === addr),
      };
    });

    friendsList.sort((a, b) => b.currentStreak - a.currentStreak || a.displayName.localeCompare(b.displayName));

    return NextResponse.json({
      success: true,
      friends: friendsList,
    });
  } catch (error: any) {
    console.error("GET /api/snaps/friends error:", error);
    return NextResponse.json({ success: true, friends: [] });
  }
}
