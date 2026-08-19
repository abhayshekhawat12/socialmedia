import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: pulse, error } = await supabaseServer
      .from("Pulse")
      .select(`
        *,
        audio:Audio(*),
        likes:Like(userAddress),
        savedPulses:SavedPulse(userAddress),
        comments:PulseComment(id, authorAddress, content, createdAt)
      `)
      .eq("id", params.id)
      .maybeSingle();

    if (error || !pulse) {
      return NextResponse.json({ error: "Reel not found" }, { status: 404 });
    }

    const authorKey = (pulse.authorAddress || "").toLowerCase();
    const { data: prof } = await supabaseServer
      .from("Profile")
      .select("*, user:User(*)")
      .or(`userId.eq.${authorKey},username.eq.${authorKey}`)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      pulse: {
        ...pulse,
        author: {
          walletAddress: pulse.authorAddress,
          username: prof?.username || `user_${authorKey.slice(0, 8)}`,
          displayName: prof?.displayName || `Creator ${authorKey.slice(0, 6)}`,
          avatarUrl: prof?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${authorKey}`,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Reel not found" }, { status: 404 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get("userAddress")?.toLowerCase();
    const pulseId = params.id;

    if (!userAddress || !pulseId) {
      return NextResponse.json({ error: "userAddress and pulseId required" }, { status: 400 });
    }

    const { data: pulse } = await supabaseServer
      .from("Pulse")
      .select("*")
      .eq("id", pulseId)
      .maybeSingle();

    if (!pulse) {
      return NextResponse.json({ error: "Reel not found" }, { status: 404 });
    }

    if (pulse.authorAddress.toLowerCase() !== userAddress) {
      return NextResponse.json({ error: "Unauthorized to delete this reel" }, { status: 403 });
    }

    await supabaseServer.from("Pulse").delete().eq("id", pulseId);

    return NextResponse.json({
      success: true,
      message: "Reel deleted permanently",
      pulseId,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete reel" }, { status: 500 });
  }
}
