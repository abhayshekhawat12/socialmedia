import { NextRequest, NextResponse } from "next/server";
import { POST as handlePostComment } from "../comments/route";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  context: { params: { id: string } }
) {
  return handlePostComment(req, context);
}
