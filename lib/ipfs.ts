const DEFAULT_GATEWAYS = [
  process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/'
];

/**
 * Resolves an IPFS URI (e.g. ipfs://Qm... or Qm...) to a gateway HTTP URL
 */
export function resolveIPFSUrl(cidOrUrl: string | undefined): string {
  if (!cidOrUrl) return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80';
  if (cidOrUrl.startsWith('data:') || cidOrUrl.startsWith('/') || cidOrUrl.startsWith('http://') || cidOrUrl.startsWith('https://')) {
    return cidOrUrl;
  }
  const cleanCID = cidOrUrl.replace('ipfs://', '');
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(`ipfs_${cleanCID}`);
    if (cached) return cached;
  }
  return `${DEFAULT_GATEWAYS[0]}${cleanCID}`;
}

/**
 * Upload JSON metadata to IPFS via API route
 */
export async function uploadJSONToIPFS(jsonData: any): Promise<string> {
  try {
    const res = await fetch('/api/ipfs/upload-json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jsonData),
    });

    if (!res.ok) {
      throw new Error(`Upload JSON failed with status ${res.status}`);
    }

    const data = await res.json();
    return data.cid;
  } catch (error) {
    console.warn('IPFS API route failed, using local hash fallback:', error);
    // Client fallback CID generator & local storage caching
    const str = JSON.stringify(jsonData);
    const simpleHash = 'Qm' + Array.from(str).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 0).toString(16).padStart(44, 'x');
    if (typeof window !== 'undefined') {
      localStorage.setItem(`ipfs_${simpleHash}`, str);
    }
    return simpleHash;
  }
}

/**
 * Upload Media File to IPFS via API route
 */
export async function uploadFileToIPFS(file: File): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/ipfs/upload-file', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Upload File failed with status ${res.status}`);
    }

    const data = await res.json();
    if (data.url && typeof window !== 'undefined') {
      localStorage.setItem(`ipfs_${data.cid}`, data.url);
    }
    return data.cid;
  } catch (error) {
    console.warn('IPFS API file route failed, using data URL fallback:', error);
    // Convert file to Data URL for instant rendering fallback
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const fakeCID = 'Qm' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        if (typeof window !== 'undefined') {
          localStorage.setItem(`ipfs_${fakeCID}`, dataUrl);
        }
        resolve(fakeCID);
      };
      reader.readAsDataURL(file);
    });
  }
}

/**
 * Fetch and parse JSON content from IPFS CID
 */
export async function fetchIPFSJSON<T>(cidOrUrl: string): Promise<T | null> {
  if (!cidOrUrl) return null;

  // Check localStorage fallback first
  const cleanCID = cidOrUrl.replace('ipfs://', '');
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(`ipfs_${cleanCID}`);
    if (cached) {
      try {
        return JSON.parse(cached) as T;
      } catch (e) {
        // If it was cached as raw string/dataURL
      }
    }
  }

  // Fetch from IPFS Gateway
  const targetUrl = resolveIPFSUrl(cidOrUrl);
  try {
    const res = await fetch(targetUrl);
    if (!res.ok) return null;
    return await res.json() as T;
  } catch (err) {
    console.error(`Failed to fetch IPFS CID ${cidOrUrl}:`, err);
    return null;
  }
}
