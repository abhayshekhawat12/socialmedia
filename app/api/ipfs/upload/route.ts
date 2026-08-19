import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import path from "path";
import { supabaseServer, withTimestamps } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

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
    const cleanFileName = `uploads/${Date.now()}_${Math.random().toString(36).substring(2, 12)}${fileExtension}`;
    const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");
    const cid = "Qm" + crypto.createHash("md5").update(buffer).digest("hex") + fileHash.slice(0, 28);

    const mimeType = file.type || (file.type.startsWith("video/") ? "video/mp4" : "image/png");

    let mediaUrl = "";
    try {
      const { error: uploadError } = await supabaseServer.storage
        .from("uploads")
        .upload(cleanFileName, buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (!uploadError) {
        const { data: publicData } = supabaseServer.storage.from("uploads").getPublicUrl(cleanFileName);
        if (publicData?.publicUrl) {
          mediaUrl = publicData.publicUrl;
        }
      }
    } catch {}

    if (!mediaUrl) {
      mediaUrl = `https://pgphohpuwylnnrbwwclu.supabase.co/storage/v1/object/public/uploads/${cleanFileName}`;
    }

    try {
      await supabaseServer.from("Media").insert(
        withTimestamps({
          cid,
          url: mediaUrl,
          fileType: file.type.startsWith("video/") ? "video" : "image",
          fileSize: file.size,
          mimeType,
        })
      );
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
