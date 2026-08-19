import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get("userAddress")?.toLowerCase();

    const { id: pulseId, commentId } = params;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (userAddress && comment.authorAddress.toLowerCase() !== userAddress) {
      return NextResponse.json({ error: "Unauthorized to delete this comment" }, { status: 403 });
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    // Recalculate true comment count
    const trueCount = await prisma.comment.count({
      where: { pulseId },
    });

    await prisma.pulse.update({
      where: { id: pulseId },
      data: { commentCount: trueCount },
    });

    return NextResponse.json({
      success: true,
      commentCount: trueCount,
    });
  } catch (error: any) {
    console.error("DELETE /api/pulse/[id]/comments/[commentId] error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete comment" }, { status: 500 });
  }
}
