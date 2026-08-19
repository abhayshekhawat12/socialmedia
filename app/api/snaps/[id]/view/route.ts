import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, withUpdatedTimestamp } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const snapId = params.id;
    if (!snapId) {
      return NextResponse.json({ error: "snapId is required" }, { status: 400 });
    }

    const { data: snap, error } = await supabaseServer
      .from("Snap")
      .update(
        withUpdatedTimestamp({
          isOpened: true,
          openedAt: new Date().toISOString(),
        })
      )
      .eq("id", snapId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      snap,
    });
  } catch (error: any) {
    console.error("POST /api/snaps/[id]/view error:", error);
    return NextResponse.json({ error: error.message || "Failed to mark snap as viewed" }, { status: 500 });
  }
}
