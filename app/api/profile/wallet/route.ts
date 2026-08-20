import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { verifyAuthToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("block_social_jwt")?.value;
    const token = authHeader?.replace("Bearer ", "") || cookieToken;

    let targetUserId: string | null = null;
    let targetIdentifier: string | null = null;

    if (token) {
      const session = verifyAuthToken(token);
      if (session) {
        targetUserId = session.userId;
        targetIdentifier = session.walletAddress || session.userId || session.email || null;
      }
    }

    const body = await req.json();
    const { walletAddress } = body;

    if (!walletAddress || !walletAddress.startsWith("0x")) {
      return NextResponse.json({ error: "A valid EVM wallet address is required." }, { status: 400 });
    }

    const normalizedWallet = walletAddress.toLowerCase().trim();

    // Check if user exists
    let userQuery = supabaseServer.from("User").select("id, walletAddress, email");
    if (targetUserId) {
      userQuery = userQuery.eq("id", targetUserId);
    } else if (targetIdentifier) {
      userQuery = userQuery.or(`id.eq.${targetIdentifier},walletAddress.eq.${targetIdentifier},email.eq.${targetIdentifier}`);
    } else {
      return NextResponse.json({ error: "User authentication required." }, { status: 401 });
    }

    const { data: existingUser } = await userQuery.maybeSingle();

    if (!existingUser) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    // Check if this wallet address is already linked to ANOTHER existing user
    const { data: duplicateWalletUser } = await supabaseServer
      .from("User")
      .select("id")
      .eq("walletAddress", normalizedWallet)
      .maybeSingle();

    if (duplicateWalletUser && duplicateWalletUser.id !== existingUser.id) {
      return NextResponse.json(
        { error: "This wallet is already linked to another account." },
        { status: 409 }
      );
    }

    // Update wallet address on the CURRENT user's existing database record
    const { data: updatedUser, error: updateErr } = await supabaseServer
      .from("User")
      .update({
        walletAddress: normalizedWallet,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", existingUser.id)
      .select("id, walletAddress, email")
      .single();

    if (updateErr) {
      console.error("Failed to associate wallet in DB:", updateErr);
      return NextResponse.json({ error: updateErr.message || "Failed to associate wallet" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: "Wallet successfully connected to account.",
    });
  } catch (error: any) {
    console.error("Wallet association error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("block_social_jwt")?.value;
    const token = authHeader?.replace("Bearer ", "") || cookieToken;

    let targetUserId: string | null = null;
    let targetIdentifier: string | null = null;

    if (token) {
      const session = verifyAuthToken(token);
      if (session) {
        targetUserId = session.userId;
        targetIdentifier = session.walletAddress || session.userId || session.email || null;
      }
    }

    let userQuery = supabaseServer.from("User").select("id, walletAddress");
    if (targetUserId) {
      userQuery = userQuery.eq("id", targetUserId);
    } else if (targetIdentifier) {
      userQuery = userQuery.or(`id.eq.${targetIdentifier},walletAddress.eq.${targetIdentifier}`);
    } else {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { data: existingUser } = await userQuery.maybeSingle();

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Unlink wallet without touching existing posts or account
    const { error: updateErr } = await supabaseServer
      .from("User")
      .update({
        walletAddress: null,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", existingUser.id);

    if (updateErr) {
      console.error("Failed to unlink wallet:", updateErr);
      return NextResponse.json({ error: updateErr.message || "Failed to disconnect wallet" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Wallet disconnected successfully. Account and content remain intact.",
    });
  } catch (error: any) {
    console.error("Wallet disconnect error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
