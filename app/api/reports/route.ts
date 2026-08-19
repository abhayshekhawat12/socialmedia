import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuthToken } from "@/lib/auth";

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

    const { targetType, targetId, reason } = await req.json();

    if (!targetType || !targetId || !reason) {
      return NextResponse.json({ error: "Target type, target ID and report reason are required." }, { status: 400 });
    }

    const userAddress = session.walletAddress.toLowerCase();

    const report = await prisma.report.create({
      data: {
        reporterAddress: userAddress,
        targetType,
        targetId,
        reason: reason.trim()
      }
    });

    return NextResponse.json({ success: true, reportId: report.id, message: "Report filed successfully." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to file report" }, { status: 500 });
  }
}
