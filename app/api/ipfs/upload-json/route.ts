import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const jsonBody = await req.json();
    const pinataJwt = process.env.PINATA_JWT;

    if (!pinataJwt) {
      // If PINATA_JWT is not set, simulate server response with calculated hash
      const str = JSON.stringify(jsonBody);
      const hash = 'Qm' + Array.from(str).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 0).toString(16).padStart(44, '0');
      return NextResponse.json({ cid: hash, isMock: true });
    }

    const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pinataJwt}`,
      },
      body: JSON.stringify({
        pinataContent: jsonBody,
        pinataOptions: {
          cidVersion: 0,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Pinata error: ${errText}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ cid: data.IpfsHash });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
