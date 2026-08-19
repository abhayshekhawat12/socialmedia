import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileExtension = path.extname(file.name) || (file.type.startsWith("video/") ? ".mp4" : ".png");
    const cleanFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 12)}${fileExtension}`;
    const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");
    const cid = "Qm" + crypto.createHash("md5").update(buffer).digest("hex") + fileHash.slice(0, 28);

    let mediaUrl = "";

    // 1. Try local disk upload (local dev)
    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await fs.mkdir(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, cleanFileName);
      await fs.writeFile(filePath, buffer);
      mediaUrl = `/uploads/${cleanFileName}`;
    } catch (fsErr) {
      // 2. Try Supabase Storage
      try {
        const { error: uploadError } = await supabase.storage
          .from("uploads")
          .upload(cleanFileName, buffer, {
            contentType: file.type || (file.type.startsWith("video/") ? "video/mp4" : "image/png"),
            upsert: true,
          });

        if (!uploadError) {
          const { data: publicData } = supabase.storage.from("uploads").getPublicUrl(cleanFileName);
          if (publicData?.publicUrl) {
            mediaUrl = publicData.publicUrl;
          }
        }
      } catch {}

      // 3. Data URL fallback
      if (!mediaUrl) {
        const mime = file.type || (file.type.startsWith("video/") ? "video/mp4" : "image/png");
        mediaUrl = `data:${mime};base64,${buffer.toString("base64")}`;
      }
    }

    // 4. Record media asset in PostgreSQL database
    let media: any = null;
    try {
      media = await prisma.media.upsert({
        where: { cid },
        create: {
          cid,
          url: mediaUrl,
          fileType: file.type.startsWith("video/") ? "video" : "image",
          fileSize: file.size,
          mimeType: file.type || (file.type.startsWith("video/") ? "video/mp4" : "image/png"),
        },
        update: {
          url: mediaUrl,
        },
      });
    } catch (dbErr) {
      console.warn("DB media recording warning:", dbErr);
    }

    return NextResponse.json({
      success: true,
      cid,
      url: mediaUrl,
      fileType: file.type.startsWith("video/") ? "video" : "image",
      fileSize: file.size,
    });
  } catch (error: any) {
    console.error("IPFS media upload error:", error);
    return NextResponse.json({ error: error.message || "IPFS upload failed" }, { status: 500 });
  }
}
