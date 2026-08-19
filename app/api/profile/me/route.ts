import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: session.userId },
          { walletAddress: session.walletAddress },
          { email: session.walletAddress },
        ],
      },
      include: { profile: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user,
      profile: user.profile,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch session user" }, { status: 500 });
  }
}
