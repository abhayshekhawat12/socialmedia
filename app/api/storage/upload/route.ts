import { NextRequest, NextResponse } from "next/server";
import path from "path";
import crypto from "crypto";
import { supabaseServer, withTimestamps } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

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

    // 1. Try Supabase Storage bucket 'uploads'
    try {
      const { error: uploadError } = await supabaseServer.storage
        .from("uploads")
        .upload(fileName, buffer, {
          contentType: file.type || (file.type.startsWith("video/") ? "video/mp4" : "image/png"),
          upsert: true,
        });

      if (!uploadError) {
        const { data: publicData } = supabaseServer.storage.from("uploads").getPublicUrl(fileName);
        if (publicData?.publicUrl) {
          mediaUrl = publicData.publicUrl;
        }
      }
    } catch (storageErr) {
      console.warn("Supabase Storage bucket notice:", storageErr);
    }

    // 2. Base64 Data URL fallback for guaranteed display
    if (!mediaUrl) {
      const mime = file.type || (file.type.startsWith("video/") ? "video/mp4" : "image/png");
      mediaUrl = `data:${mime};base64,${buffer.toString("base64")}`;
    }

    // 3. Save media record to Supabase table
    try {
      await supabaseServer.from("Media").upsert(
        withTimestamps({
          cid: mockCid,
          url: mediaUrl,
          fileType: file.type.startsWith("video/") ? "video" : "image",
          fileSize: file.size,
          mimeType: file.type || "image/png",
        })
      );
    } catch (dbErr) {
      console.warn("Media record notice:", dbErr);
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
