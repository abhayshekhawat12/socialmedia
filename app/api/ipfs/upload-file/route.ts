import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const pinataJwt = process.env.PINATA_JWT;

    if (!pinataJwt) {
      // Fallback: Save file to local public/uploads directory
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await fs.mkdir(uploadDir, { recursive: true });

      const fileExtension = path.extname(file.name) || ".png";
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}${fileExtension}`;
      const filePath = path.join(uploadDir, fileName);

      await fs.writeFile(filePath, buffer);

      const localUrl = `/uploads/${fileName}`;
      const fakeCID = 'Qm' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      return NextResponse.json({ 
        cid: fakeCID, 
        url: localUrl, 
        isMock: true 
      });
    }

    // Direct Pinata upload if key is active
    const pinataFormData = new FormData();
    pinataFormData.append('file', file);

    const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
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
      url: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`
    });
  } catch (error: any) {
    console.error("IPFS File Upload Route Error:", error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
