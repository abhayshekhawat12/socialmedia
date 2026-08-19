import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const currentUserAddress = searchParams.get("currentUserAddress")?.toLowerCase();

    const { data: profiles, error } = await supabaseServer
      .from("Profile")
      .select("*, user:User(*)")
      .limit(15);

    if (error) {
      return NextResponse.json({ success: true, users: [] });
    }

    const filtered = (profiles || [])
      .filter((p) => {
        const addr = p.user?.walletAddress || p.userId || "";
        return !currentUserAddress || addr.toLowerCase() !== currentUserAddress;
      })
      .map((p) => ({
        id: p.userId || p.id,
        walletAddress: p.user?.walletAddress || p.userId || "",
        username: p.username || `user_${(p.userId || "").slice(0, 8)}`,
        displayName: p.displayName || "Pulse Creator",
        avatarUrl: p.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.userId || p.id}`,
        bio: p.bio || "",
        isFollowing: false,
      }));

    return NextResponse.json({ success: true, users: filtered });
  } catch (error: any) {
    return NextResponse.json({ success: true, users: [] });
  }
}
