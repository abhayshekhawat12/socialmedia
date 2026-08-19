import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure uploads directory exists inside public
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    // Generate unique file name
    const fileExtension = path.extname(file.name) || ".png";
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);

    // Save to filesystem
    await fs.writeFile(filePath, buffer);

    const relativeUrl = `/uploads/${fileName}`;
    const mockCid = `qm_ipfs_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;

    return NextResponse.json({
      success: true,
      url: relativeUrl,
      cid: mockCid,
      fileName: file.name
    });
  } catch (error: any) {
    console.error("Storage upload error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload file" }, { status: 500 });
  }
}
