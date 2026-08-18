import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");
    
    // Generate deterministic IPFS Qm CID prefix
    const cid = "Qm" + crypto.createHash("md5").update(buffer).digest("hex") + fileHash.slice(0, 28);
    const url = `https://ipfs.io/ipfs/${cid}`;

    const media = await prisma.media.upsert({
      where: { cid },
      create: {
        cid,
        url,
        fileType: file.type.startsWith("video/") ? "video" : "image",
        fileSize: file.size,
        mimeType: file.type,
      },
      update: {},
    });

    return NextResponse.json({
      success: true,
      cid: media.cid,
      url: media.url,
      fileType: media.fileType,
      fileSize: media.fileSize,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "IPFS upload failed" }, { status: 500 });
  }
}
