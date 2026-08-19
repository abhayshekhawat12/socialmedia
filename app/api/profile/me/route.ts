import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { verifyAuthToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("block_social_jwt")?.value;
    const token = authHeader?.replace("Bearer ", "") || cookieToken;

    if (!token) {
      return NextResponse.json({ error: "No session token" }, { status: 401 });
    }

    const session = verifyAuthToken(token);
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    let user: any = null;
    let profile: any = null;

    const { data } = await supabaseServer
      .from("User")
      .select("*, profile:Profile(*)")
      .or(`id.eq.${session.userId},walletAddress.eq.${session.walletAddress || session.userId}`)
      .maybeSingle();

    if (data) {
      user = data;
      profile = Array.isArray(data.profile) ? data.profile[0] : data.profile;
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user,
      profile,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch session user" }, { status: 500 });
  }
}
