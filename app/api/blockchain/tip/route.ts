import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, withTimestamps } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { senderAddress, recipientAddress, amountEth, txHash, chainId = 11155111 } = body;

    if (!senderAddress || !recipientAddress || !amountEth || !txHash) {
      return NextResponse.json(
        { error: "senderAddress, recipientAddress, amountEth, and txHash are required." },
        { status: 400 }
      );
    }

    // Optionally create a notification for recipient
    try {
      await supabaseServer.from("Notification").insert(
        withTimestamps({
          recipientAddress: recipientAddress.toLowerCase(),
          senderAddress: senderAddress.toLowerCase(),
          type: "MENTION",
          title: "Creator Reward Received 💎",
          message: `Received ${amountEth} ETH blockchain tip from ${senderAddress.slice(0, 6)}...${senderAddress.slice(-4)}`,
          link: `/profile/${senderAddress.toLowerCase()}`,
        })
      );
    } catch (notifErr) {
      console.warn("Tip notification warning:", notifErr);
    }

    return NextResponse.json({
      success: true,
      tip: {
        senderAddress,
        recipientAddress,
        amountEth,
        txHash,
        chainId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Tip record creation error:", error);
    return NextResponse.json({ error: error.message || "Failed to log tip" }, { status: 500 });
  }
}
