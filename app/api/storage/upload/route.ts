import { NextRequest, NextResponse } from "next/server";
import path from "path";
import crypto from "crypto";
import { supabaseServer, withTimestamps } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

// Allowed MIME types
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/mov"];
const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB
const MAX_VIDEO_SIZE = 60 * 1024 * 1024; // 60MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "posts";

    if (!file) {
      return NextResponse.json({ error: "No file provided. Please select a file to upload." }, { status: 400 });
    }

    const mimeType = file.type?.toLowerCase() || "";
    const isImage = ALLOWED_IMAGE_TYPES.includes(mimeType) || mimeType.startsWith("image/");
    const isVideo = ALLOWED_VIDEO_TYPES.includes(mimeType) || mimeType.startsWith("video/");

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: "This file type isn't supported. Please upload a JPG, PNG, WEBP image or MP4, MOV video." },
        { status: 400 }
      );
    }

    // Size check
    if (isImage && file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: "This image is too large (maximum size is 15MB)." }, { status: 400 });
    }
    if (isVideo && file.size > MAX_VIDEO_SIZE) {
      return NextResponse.json({ error: "This video is too large (maximum size is 60MB)." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let ext = path.extname(file.name)?.toLowerCase();
    if (!ext) {
      ext = isVideo ? ".mp4" : ".jpg";
    }

    const randomSuffix = crypto.randomBytes(8).toString("hex");
    const uniqueFileName = `${folder}/${Date.now()}_${randomSuffix}${ext}`;
    const mockCid = `qm_${crypto.createHash("md5").update(buffer).digest("hex")}`;

    // 1. Upload to Supabase Storage bucket 'uploads'
    const { data: uploadData, error: uploadError } = await supabaseServer.storage
      .from("uploads")
      .upload(uniqueFileName, buffer, {
        contentType: mimeType || (isVideo ? "video/mp4" : "image/jpeg"),
        upsert: true,
      });

    if (uploadError || !uploadData) {
      console.error("Supabase Storage upload error:", uploadError);
      throw new Error(`Storage upload failed: ${uploadError?.message || "Could not store file in cloud storage"}`);
    }

    // 2. Get Public URL
    const { data: publicData } = supabaseServer.storage.from("uploads").getPublicUrl(uniqueFileName);
    const mediaUrl = publicData.publicUrl;

    if (!mediaUrl) {
      throw new Error("Failed to generate public URL for uploaded media.");
    }

    // 3. Save media record in database
    try {
      await supabaseServer.from("Media").upsert(
        withTimestamps({
          cid: mockCid,
          url: mediaUrl,
          fileType: isVideo ? "video" : "image",
          fileSize: file.size,
          mimeType: mimeType || (isVideo ? "video/mp4" : "image/jpeg"),
        })
      );
    } catch (dbErr) {
      console.warn("Media record DB notice:", dbErr);
    }

    return NextResponse.json({
      success: true,
      url: mediaUrl,
      cid: mockCid,
      storagePath: uniqueFileName,
      fileName: file.name,
      fileType: isVideo ? "video" : "image",
    });
  } catch (error: any) {
    console.error("Upload API route error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process and upload media." },
      { status: 500 }
    );
  }
}
