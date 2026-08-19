import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const address = params.address.toLowerCase();

    // Fetch user and profile
    const { data: user } = await supabaseServer
      .from("User")
      .select("*, profile:Profile(*)")
      .or(`walletAddress.eq.${address},id.eq.${address},email.eq.${address}`)
      .maybeSingle();

    let profile = user ? (Array.isArray(user.profile) ? user.profile[0] : user.profile) : null;

    if (!profile) {
      // Check Profile by username
      const { data: profByUsername } = await supabaseServer
        .from("Profile")
        .select("*, user:User(*)")
        .eq("username", address)
        .maybeSingle();
      if (profByUsername) {
        profile = profByUsername;
      }
    }

    const effectiveAddress = user?.walletAddress || user?.id || address;

    // Fetch Posts
    const { data: posts } = await supabaseServer
      .from("Post")
      .select("*")
      .eq("authorAddress", effectiveAddress)
      .order("createdAt", { ascending: false });

    // Fetch Pulses
    const { data: pulses } = await supabaseServer
      .from("Pulse")
      .select("*")
      .eq("authorAddress", effectiveAddress)
      .order("createdAt", { ascending: false });

    // Fetch Followers count
    const { count: followersCount } = await supabaseServer
      .from("Follow")
      .select("*", { count: "exact", head: true })
      .eq("followingAddress", effectiveAddress);

    // Fetch Following count
    const { count: followingCount } = await supabaseServer
      .from("Follow")
      .select("*", { count: "exact", head: true })
      .eq("followerAddress", effectiveAddress);

    return NextResponse.json({
      success: true,
      profile: {
        address: effectiveAddress,
        username: profile?.username || `user_${effectiveAddress.slice(0, 8)}`,
        displayName: profile?.displayName || `User ${effectiveAddress.slice(0, 6)}`,
        bio: profile?.bio || "Pulse Creator",
        avatarUrl: profile?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${effectiveAddress}`,
        bannerUrl: profile?.bannerUrl || "",
        postsCount: (posts || []).length,
        reelsCount: (pulses || []).length,
        followersCount: followersCount || 0,
        followingCount: followingCount || 0,
      },
      posts: posts || [],
      pulses: pulses || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch profile" }, { status: 500 });
  }
}
