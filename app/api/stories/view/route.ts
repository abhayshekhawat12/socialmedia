import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuthToken } from "@/lib/auth";

// GET: Fetch IDs of stories viewed by the current user
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const session = verifyAuthToken(token);
    if (!session || !session.walletAddress) {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    const userAddress = session.walletAddress.toLowerCase();

    const views = await prisma.storyView.findMany({
      where: { viewerAddress: userAddress }
    });

    const viewedStoryIds = views.map(v => v.storyId);
    return NextResponse.json({ success: true, viewedStoryIds });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch views" }, { status: 500 });
  }
}

// POST: Record a new story view
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const session = verifyAuthToken(token);
    if (!session || !session.walletAddress) {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    const { storyId } = await req.json();
    if (!storyId) {
      return NextResponse.json({ error: "Story ID is required." }, { status: 400 });
    }

    const userAddress = session.walletAddress.toLowerCase();

    // Ensure story exists
    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (!story) {
      return NextResponse.json({ error: "Story not found." }, { status: 404 });
    }

    // Upsert story view to avoid unique constraint violations
    await prisma.storyView.upsert({
      where: {
        storyId_viewerAddress: {
          storyId,
          viewerAddress: userAddress
        }
      },
      create: {
        storyId,
        viewerAddress: userAddress
      },
      update: {} // No update needed if already viewed
    });

    return NextResponse.json({ success: true, message: "Story view tracked." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to track story view" }, { status: 500 });
  }
}
