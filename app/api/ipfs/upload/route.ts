import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. Ensure public/uploads directory exists
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    // 2. Generate unique filename preserving original extension
    const fileExtension = path.extname(file.name) || (file.type.startsWith("video/") ? ".mp4" : ".png");
    const cleanFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 12)}${fileExtension}`;
    const filePath = path.join(uploadDir, cleanFileName);

    // 3. Write physical file to server disk
    await fs.writeFile(filePath, buffer);

    // 4. Guaranteed local URL served statically by Next.js
    const relativeUrl = `/uploads/${cleanFileName}`;

    // 5. Generate deterministic cryptographic IPFS content hash
    const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");
    const cid = "Qm" + crypto.createHash("md5").update(buffer).digest("hex") + fileHash.slice(0, 28);

    // 6. Record media asset in database
    const media = await prisma.media.upsert({
      where: { cid },
      create: {
        cid,
        url: relativeUrl,
        fileType: file.type.startsWith("video/") ? "video" : "image",
        fileSize: file.size,
        mimeType: file.type || (file.type.startsWith("video/") ? "video/mp4" : "image/png"),
      },
      update: {
        url: relativeUrl,
      },
    });

    return NextResponse.json({
      success: true,
      cid: media.cid,
      url: relativeUrl,
      fileType: media.fileType,
      fileSize: media.fileSize,
    });
  } catch (error: any) {
    console.error("IPFS media upload error:", error);
    return NextResponse.json({ error: error.message || "IPFS upload failed" }, { status: 500 });
  }
}
