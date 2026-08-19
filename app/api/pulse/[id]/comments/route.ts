import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pulseId = params.id;
    const comments = await prisma.comment.findMany({
      where: { pulseId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const authorAddresses = Array.from(new Set(comments.map((c) => c.authorAddress.toLowerCase())));
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

    const formatted = comments.map((c) => {
      const prof = profileMap.get(c.authorAddress.toLowerCase());
      return {
        id: c.id,
        authorAddress: c.authorAddress,
        content: c.content,
        createdAt: c.createdAt,
        authorProfile: {
          username: prof?.username || `user_${c.authorAddress.slice(0, 8)}`,
          displayName: prof?.displayName || `User ${c.authorAddress.slice(0, 6)}`,
          avatarUrl: prof?.avatarUrl || "",
        },
      };
    });

    return NextResponse.json({ success: true, comments: formatted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch comments" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { authorAddress, content } = await req.json();

    if (!authorAddress || !content) {
      return NextResponse.json({ error: "Author address and content required" }, { status: 400 });
    }

    const normalizedAuthor = authorAddress.toLowerCase();
    const pulseId = params.id;

    const comment = await prisma.comment.create({
      data: {
        pulseId,
        authorAddress: normalizedAuthor,
        content,
      },
    });

    const pulse = await prisma.pulse.update({
      where: { id: pulseId },
      data: { commentCount: { increment: 1 } },
    });

    // Send notification to pulse author
    if (pulse.authorAddress !== normalizedAuthor) {
      await prisma.notification.create({
        data: {
          recipientAddress: pulse.authorAddress,
          senderAddress: normalizedAuthor,
          type: "COMMENT",
          title: "New Comment on Reel",
          message: `User ${normalizedAuthor.slice(0, 6)}... commented on your Reel`,
          link: `/pulse`,
        },
      });
    }

    const authorProfile = await prisma.profile.findFirst({
      where: { user: { walletAddress: normalizedAuthor } },
    });

    return NextResponse.json({
      success: true,
      comment: {
        ...comment,
        authorProfile: authorProfile || {
          username: `user_${normalizedAuthor.slice(0, 8)}`,
          displayName: `User ${normalizedAuthor.slice(0, 6)}`,
          avatarUrl: "",
        },
      },
      commentCount: pulse.commentCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Comment creation failed" }, { status: 500 });
  }
}
