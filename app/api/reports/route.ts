import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, withTimestamps } from "@/lib/supabaseServer";
import { verifyAuthToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { targetType, targetId, reason, userAddress: rawUser } = body;

    let userAddress = rawUser?.toLowerCase();

    if (!userAddress) {
      const authHeader = req.headers.get("authorization");
      const token = authHeader?.replace("Bearer ", "");
      if (token) {
        const session = verifyAuthToken(token);
        if (session?.walletAddress) {
          userAddress = session.walletAddress.toLowerCase();
        }
      }
    }

    if (!userAddress) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!targetType || !targetId || !reason) {
      return NextResponse.json({ error: "Target type, target ID and report reason are required." }, { status: 400 });
    }

    const { data: report, error } = await supabaseServer
      .from("Report")
      .insert(
        withTimestamps({
          reporterAddress: userAddress,
          targetType,
          targetId,
          reason: reason.trim(),
        })
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, reportId: report.id, message: "Report filed successfully." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to file report" }, { status: 500 });
  }
}
