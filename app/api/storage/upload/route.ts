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
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileExtension = path.extname(file.name) || (file.type.startsWith("video/") ? ".mp4" : ".png");
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 12)}${fileExtension}`;
    const mockCid = `qm_${crypto.createHash("md5").update(buffer).digest("hex")}`;

    let mediaUrl = "";

    // 1. Try local disk upload (works on local Node.js environment)
    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await fs.mkdir(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, fileName);
      await fs.writeFile(filePath, buffer);
      mediaUrl = `/uploads/${fileName}`;
    } catch (fsErr) {
      console.warn("Local filesystem write not available (serverless environment), falling back to Supabase/Memory:", fsErr);

      // 2. Try Supabase Storage bucket 'uploads' if available
      try {
        const { error: uploadError } = await supabase.storage
          .from("uploads")
          .upload(fileName, buffer, {
            contentType: file.type || (file.type.startsWith("video/") ? "video/mp4" : "image/png"),
            upsert: true,
          });

        if (!uploadError) {
          const { data: publicData } = supabase.storage.from("uploads").getPublicUrl(fileName);
          if (publicData?.publicUrl) {
            mediaUrl = publicData.publicUrl;
          }
        }
      } catch (supabaseErr) {
        console.warn("Supabase Storage bucket upload warning:", supabaseErr);
      }

      // 3. Robust Base64 Data URL fallback for immediate guaranteed rendering
      if (!mediaUrl) {
        const mime = file.type || (file.type.startsWith("video/") ? "video/mp4" : "image/png");
        mediaUrl = `data:${mime};base64,${buffer.toString("base64")}`;
      }
    }

    // Save media record to PostgreSQL database
    try {
      await prisma.media.upsert({
        where: { cid: mockCid },
        create: {
          cid: mockCid,
          url: mediaUrl,
          fileType: file.type.startsWith("video/") ? "video" : "image",
          fileSize: file.size,
          mimeType: file.type || "image/png",
        },
        update: { url: mediaUrl },
      });
    } catch (dbErr) {
      console.warn("Prisma media recording warning:", dbErr);
    }

    return NextResponse.json({
      success: true,
      url: mediaUrl,
      cid: mockCid,
      fileName: file.name,
    });
  } catch (error: any) {
    console.error("Storage upload error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload file" }, { status: 500 });
  }
}
