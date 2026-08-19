import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("walletAddress")?.toLowerCase();

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    let { data: settings } = await supabaseServer
      .from("UserSettings")
      .select("*")
      .eq("walletAddress", address)
      .maybeSingle();

    if (!settings) {
      const { data: newSettings } = await supabaseServer
        .from("UserSettings")
        .insert({ walletAddress: address })
        .select()
        .single();
      settings = newSettings;
    }

    const { data: blockedAccounts } = await supabaseServer
      .from("BlockedAccount")
      .select("*")
      .eq("blockerAddress", address);

    const { data: sessions } = await supabaseServer
      .from("UserSession")
      .select("*")
      .eq("walletAddress", address)
      .order("lastActive", { ascending: false });

    return NextResponse.json({
      settings: settings || {},
      blockedAccounts: blockedAccounts || [],
      sessions: sessions || [],
    });
  } catch (err: any) {
    console.error("Settings GET error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const address = body.walletAddress?.toLowerCase();

    if (!address) {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
    }

    const { walletAddress, action, targetAddress, blockType, ...settingsData } = body;

    if (action === "block" || action === "unblock") {
      if (!targetAddress) {
        return NextResponse.json({ error: "Target address required" }, { status: 400 });
      }

      if (action === "block") {
        await supabaseServer.from("BlockedAccount").upsert({
          blockerAddress: address,
          blockedAddress: targetAddress.toLowerCase(),
          type: blockType || "block",
        });
      } else {
        await supabaseServer
          .from("BlockedAccount")
          .delete()
          .eq("blockerAddress", address)
          .eq("blockedAddress", targetAddress.toLowerCase());
      }

      const { data: blockedAccounts } = await supabaseServer
        .from("BlockedAccount")
        .select("*")
        .eq("blockerAddress", address);

      return NextResponse.json({ success: true, blockedAccounts: blockedAccounts || [] });
    }

    const { data: updatedSettings } = await supabaseServer
      .from("UserSettings")
      .upsert({
        walletAddress: address,
        ...settingsData,
      })
      .select()
      .single();

    return NextResponse.json({ success: true, settings: updatedSettings });
  } catch (error: any) {
    console.error("Settings PUT error:", error);
    return NextResponse.json({ error: error.message || "Failed to save settings" }, { status: 500 });
  }
}
