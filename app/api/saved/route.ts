import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/saved?userAddress=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get("userAddress")?.toLowerCase();

    if (!userAddress) {
      return NextResponse.json({ error: "userAddress is required" }, { status: 400 });
    }

    const [savedPosts, savedPulses] = await Promise.all([
      prisma.savedPost.findMany({
        where: { userAddress },
        orderBy: { createdAt: "desc" },
        include: {
          post: {
            include: {
              likes: true,
              comments: true,
            },
          },
        },
      }),
      prisma.savedPulse.findMany({
        where: { userAddress },
        orderBy: { createdAt: "desc" },
        include: {
          pulse: {
            include: {
              likes: true,
              comments: true,
              audio: true,
            },
          },
        },
      }),
    ]);

    // Fetch author profiles for saved posts & pulses
    const authorAddresses = Array.from(
      new Set([
        ...savedPosts.map((sp) => sp.post.authorAddress.toLowerCase()),
        ...savedPulses.map((sp) => sp.pulse.authorAddress.toLowerCase()),
      ])
    );

    const profiles = await prisma.profile.findMany({
      where: { user: { walletAddress: { in: authorAddresses } } },
      include: { user: true },
    });

    const profileMap = new Map();
    profiles.forEach((p) => {
      if (p.user.walletAddress) {
        profileMap.set(p.user.walletAddress.toLowerCase(), p);
      }
    });

    const posts = savedPosts.map((sp) => {
      const prof = profileMap.get(sp.post.authorAddress.toLowerCase());
      return {
        ...sp.post,
        savedAt: sp.createdAt,
        authorProfile: {
          username: prof?.username || `user_${sp.post.authorAddress.slice(0, 8)}`,
          displayName: prof?.displayName || `User ${sp.post.authorAddress.slice(0, 6)}`,
          avatarUrl: prof?.avatarUrl || "",
        },
      };
    });

    const reels = savedPulses.map((sp) => {
      const prof = profileMap.get(sp.pulse.authorAddress.toLowerCase());
      return {
        ...sp.pulse,
        savedAt: sp.createdAt,
        authorProfile: {
          username: prof?.username || `user_${sp.pulse.authorAddress.slice(0, 8)}`,
          displayName: prof?.displayName || `User ${sp.pulse.authorAddress.slice(0, 6)}`,
          avatarUrl: prof?.avatarUrl || "",
        },
      };
    });

    return NextResponse.json({
      success: true,
      savedPosts: posts,
      savedReels: reels,
      totalSaved: posts.length + reels.length,
    });
  } catch (error: any) {
    console.error("GET /api/saved error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch saved items" }, { status: 500 });
  }
}

// POST /api/saved - Toggle save/unsave for post or pulse
export async function POST(req: NextRequest) {
  try {
    const { userAddress, postId, pulseId } = await req.json();

    if (!userAddress || (!postId && !pulseId)) {
      return NextResponse.json({ error: "userAddress and either postId or pulseId required" }, { status: 400 });
    }

    const normUser = userAddress.toLowerCase();

    if (postId) {
      const existing = await prisma.savedPost.findUnique({
        where: {
          userAddress_postId: {
            userAddress: normUser,
            postId,
          },
        },
      });

      if (existing) {
        await prisma.savedPost.delete({ where: { id: existing.id } });
        return NextResponse.json({ success: true, saved: false, type: "post", postId });
      } else {
        await prisma.savedPost.create({
          data: {
            userAddress: normUser,
            postId,
          },
        });
        return NextResponse.json({ success: true, saved: true, type: "post", postId });
      }
    } else if (pulseId) {
      const existing = await prisma.savedPulse.findUnique({
        where: {
          userAddress_pulseId: {
            userAddress: normUser,
            pulseId,
          },
        },
      });

      if (existing) {
        await prisma.savedPulse.delete({ where: { id: existing.id } });
        await prisma.pulse.update({
          where: { id: pulseId },
          data: { saveCount: { decrement: 1 } },
        });
        return NextResponse.json({ success: true, saved: false, type: "pulse", pulseId });
      } else {
        await prisma.savedPulse.create({
          data: {
            userAddress: normUser,
            pulseId,
          },
        });
        await prisma.pulse.update({
          where: { id: pulseId },
          data: { saveCount: { increment: 1 } },
        });
        return NextResponse.json({ success: true, saved: true, type: "pulse", pulseId });
      }
    }
  } catch (error: any) {
    console.error("POST /api/saved error:", error);
    return NextResponse.json({ error: error.message || "Failed to toggle save" }, { status: 500 });
  }
}
