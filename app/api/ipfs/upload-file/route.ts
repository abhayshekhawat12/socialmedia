import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const pinataJwt = process.env.PINATA_JWT;

    if (!pinataJwt) {
      // Return synthetic IPFS hash for fallback
      const fakeCID = 'Qm' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      return NextResponse.json({ cid: fakeCID, isMock: true });
    }

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
    return NextResponse.json({ cid: data.IpfsHash });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
