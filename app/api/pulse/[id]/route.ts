import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pulse = await prisma.pulse.findUnique({
      where: { id: params.id },
      include: {
        audio: true,
        likes: true,
        savedPulses: true,
        comments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!pulse) {
      return NextResponse.json({ error: "Reel not found" }, { status: 404 });
    }

    const authorProfile = await prisma.profile.findFirst({
      where: {
        user: { walletAddress: pulse.authorAddress },
      },
      include: { user: true },
    });

    return NextResponse.json({
      success: true,
      pulse: {
        ...pulse,
        author: {
          walletAddress: pulse.authorAddress,
          username: authorProfile?.username || `user_${pulse.authorAddress.slice(0, 8)}`,
          displayName: authorProfile?.displayName || `Creator ${pulse.authorAddress.slice(0, 6)}`,
          avatarUrl: authorProfile?.avatarUrl || "",
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Reel not found" }, { status: 404 });
  }
}

// DELETE /api/pulse/[id]?userAddress=...
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get("userAddress")?.toLowerCase();
    const pulseId = params.id;

    if (!userAddress || !pulseId) {
      return NextResponse.json({ error: "userAddress and pulseId required" }, { status: 400 });
    }

    const pulse = await prisma.pulse.findUnique({
      where: { id: pulseId },
    });

    if (!pulse) {
      return NextResponse.json({ error: "Reel not found" }, { status: 404 });
    }

    if (pulse.authorAddress.toLowerCase() !== userAddress) {
      return NextResponse.json({ error: "Unauthorized to delete this reel" }, { status: 403 });
    }

    // Try deleting media from disk if it was stored locally
    if (pulse.videoUrl && pulse.videoUrl.startsWith("/uploads/")) {
      try {
        const filePath = path.join(process.cwd(), "public", pulse.videoUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fileErr) {
        console.warn("Could not delete file from disk:", fileErr);
      }
    }

    // Delete pulse record (cascade deletes comments, likes, savedPulses, shares, views)
    await prisma.pulse.delete({
      where: { id: pulseId },
    });

    return NextResponse.json({
      success: true,
      message: "Reel deleted permanently",
      pulseId,
    });
  } catch (error: any) {
    console.error("DELETE /api/pulse/[id] error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete reel" }, { status: 500 });
  }
}
