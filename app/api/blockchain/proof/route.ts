import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { postId, contentHash, authorWallet, network = "Sepolia Testnet", txHash } = body;

    if (!postId || !contentHash || !authorWallet) {
      return NextResponse.json(
        { error: "postId, contentHash, and authorWallet are required." },
        { status: 400 }
      );
    }

    const normalizedAuthor = authorWallet.toLowerCase().trim();
    const simulatedTx = txHash || `0x${crypto.randomBytes(32).toString("hex")}`;
    const proofMetadata = JSON.stringify({
      verified: true,
      contentHash,
      authorWallet: normalizedAuthor,
      network,
      txHash: simulatedTx,
      timestamp: new Date().toISOString(),
    });

    // Update Post or Pulse record with proof metadata in mediaCid field
    let updated = false;

    // 1. Try updating Post
    const { data: postData } = await supabaseServer
      .from("Post")
      .select("id")
      .eq("id", postId)
      .maybeSingle();

    if (postData) {
      await supabaseServer
        .from("Post")
        .update({
          mediaCid: proofMetadata,
          updatedAt: new Date().toISOString(),
        })
        .eq("id", postId);
      updated = true;
    } else {
      // 2. Try updating Pulse
      const { data: pulseData } = await supabaseServer
        .from("Pulse")
        .select("id")
        .eq("id", postId)
        .maybeSingle();

      if (pulseData) {
        await supabaseServer
          .from("Pulse")
          .update({
            videoCid: proofMetadata,
            updatedAt: new Date().toISOString(),
          })
          .eq("id", postId);
        updated = true;
      }
    }

    return NextResponse.json({
      success: true,
      proof: {
        postId,
        contentHash,
        authorWallet: normalizedAuthor,
        network,
        txHash: simulatedTx,
        timestamp: new Date().toISOString(),
        verified: true,
      },
    });
  } catch (error: any) {
    console.error("Blockchain proof registration error:", error);
    return NextResponse.json({ error: error.message || "Failed to register proof" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("postId");
    const creatorAddress = searchParams.get("creatorAddress")?.toLowerCase().trim();

    // 1. If checking creator count of verified content
    if (creatorAddress) {
      const { data: posts } = await supabaseServer
        .from("Post")
        .select("id, mediaCid, authorAddress");

      const { data: pulses } = await supabaseServer
        .from("Pulse")
        .select("id, videoCid, authorAddress");

      let count = 0;

      const checkProof = (cidStr: string | null, author: string | null) => {
        if (!cidStr) return false;
        try {
          if (cidStr.startsWith("{") && cidStr.includes('"verified":true')) {
            const parsed = JSON.parse(cidStr);
            if (
              parsed.authorWallet?.toLowerCase() === creatorAddress ||
              author?.toLowerCase() === creatorAddress
            ) {
              return true;
            }
          }
        } catch {}
        return false;
      };

      (posts || []).forEach((p) => {
        if (checkProof(p.mediaCid, p.authorAddress)) count++;
      });

      (pulses || []).forEach((p) => {
        if (checkProof(p.videoCid, p.authorAddress)) count++;
      });

      return NextResponse.json({
        success: true,
        creatorAddress,
        registeredCount: count,
        isVerifiedCreator: count > 0,
      });
    }

    // 2. If checking specific post
    if (postId) {
      const { data: post } = await supabaseServer
        .from("Post")
        .select("id, mediaCid, authorAddress, createdAt")
        .eq("id", postId)
        .maybeSingle();

      if (post && post.mediaCid?.startsWith("{")) {
        try {
          const proof = JSON.parse(post.mediaCid);
          return NextResponse.json({ success: true, proof, isVerified: true });
        } catch {}
      }

      const { data: pulse } = await supabaseServer
        .from("Pulse")
        .select("id, videoCid, authorAddress, createdAt")
        .eq("id", postId)
        .maybeSingle();

      if (pulse && pulse.videoCid?.startsWith("{")) {
        try {
          const proof = JSON.parse(pulse.videoCid);
          return NextResponse.json({ success: true, proof, isVerified: true });
        } catch {}
      }

      return NextResponse.json({ success: true, isVerified: false, proof: null });
    }

    return NextResponse.json({ error: "postId or creatorAddress required" }, { status: 400 });
  } catch (error: any) {
    console.error("Proof retrieval error:", error);
    return NextResponse.json({ error: error.message || "Failed to retrieve proof" }, { status: 500 });
  }
}
