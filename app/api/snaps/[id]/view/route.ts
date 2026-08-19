import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/snaps/[id]/view - Mark a snap as opened/viewed
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const snapId = params.id;
    if (!snapId) {
      return NextResponse.json({ error: "snapId is required" }, { status: 400 });
    }

    const snap = await prisma.snap.update({
      where: { id: snapId },
      data: {
        isOpened: true,
        openedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      snap,
    });
  } catch (error: any) {
    console.error("POST /api/snaps/[id]/view error:", error);
    return NextResponse.json({ error: error.message || "Failed to mark snap as viewed" }, { status: 500 });
  }
}
