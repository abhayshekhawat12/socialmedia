import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const pinataJwt = process.env.PINATA_JWT;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (!pinataJwt) {
      const fileExtension = path.extname(file.name) || ".png";
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 12)}${fileExtension}`;
      const fakeCID = "Qm" + crypto.createHash("md5").update(buffer).digest("hex");

      let localUrl = "";
      try {
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        await fs.mkdir(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, fileName);
        await fs.writeFile(filePath, buffer);
        localUrl = `/uploads/${fileName}`;
      } catch {
        const mime = file.type || "image/png";
        localUrl = `data:${mime};base64,${buffer.toString("base64")}`;
      }

      return NextResponse.json({
        cid: fakeCID,
        url: localUrl,
        isMock: true,
      });
    }

    // Direct Pinata upload if key is active
    const pinataFormData = new FormData();
    pinataFormData.append("file", file);

    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pinataJwt}`,
      },
      body: pinataFormData,
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Pinata file upload error: ${errText}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({
      cid: data.IpfsHash,
      url: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
    });
  } catch (error: any) {
    console.error("IPFS File Upload Route Error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}
