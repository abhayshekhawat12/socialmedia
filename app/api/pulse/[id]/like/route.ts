import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, withTimestamps } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userAddress } = await req.json();

    if (!userAddress) {
      return NextResponse.json({ error: "User address required" }, { status: 400 });
    }

    const normalizedUser = userAddress.toLowerCase();
    const pulseId = params.id;

    const { data: existingLike } = await supabaseServer
      .from("Like")
      .select("id")
      .eq("pulseId", pulseId)
      .eq("userAddress", normalizedUser)
      .maybeSingle();

    const { data: currentPulse } = await supabaseServer
      .from("Pulse")
      .select("likeCount, authorAddress")
      .eq("id", pulseId)
      .maybeSingle();

    if (!currentPulse) {
      return NextResponse.json({ error: "Reel not found" }, { status: 404 });
    }

    if (existingLike) {
      // Unlike
      await supabaseServer.from("Like").delete().eq("id", existingLike.id);
      const newCount = Math.max(0, (currentPulse.likeCount || 1) - 1);
      await supabaseServer.from("Pulse").update({ likeCount: newCount, updatedAt: new Date().toISOString() }).eq("id", pulseId);
      return NextResponse.json({ success: true, liked: false, likeCount: newCount });
    } else {
      // Like
      await supabaseServer.from("Like").insert(
        withTimestamps({
          pulseId,
          userAddress: normalizedUser,
        })
      );
      const newCount = (currentPulse.likeCount || 0) + 1;
      await supabaseServer.from("Pulse").update({ likeCount: newCount, updatedAt: new Date().toISOString() }).eq("id", pulseId);

      if (currentPulse.authorAddress !== normalizedUser) {
        await supabaseServer.from("Notification").insert(
          withTimestamps({
            recipientAddress: currentPulse.authorAddress,
            senderAddress: normalizedUser,
            type: "LIKE",
            title: "New Like on Reel ❤️",
            message: `liked your Reel`,
            link: `/pulse`,
            read: false,
          })
        );
      }

      return NextResponse.json({ success: true, liked: true, likeCount: newCount });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Like action failed" }, { status: 500 });
  }
}
