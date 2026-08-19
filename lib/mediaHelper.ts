/**
 * Media URL Resolver and IPFS Gateway Fallback
 * Resolves IPFS links, local uploads, and remote URLs with fast gateways and error resilience.
 */

export function resolveMediaUrl(url?: string | null, cid?: string | null): string {
  if (!url && !cid) {
    return "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80";
  }

  const rawUrl = (url || "").trim();

  // If CID provided and no url
  if (!rawUrl && cid) {
    const cleanCid = cid.replace(/^ipfs:\/\//, "").replace(/^qm_/, "");
    return `https://cloudflare-ipfs.com/ipfs/${cleanCid}`;
  }

  // Handle ipfs:// scheme
  if (rawUrl.startsWith("ipfs://")) {
    const cleanCid = rawUrl.replace("ipfs://", "");
    return `https://cloudflare-ipfs.com/ipfs/${cleanCid}`;
  }

  // Handle slow ipfs.io gateway -> convert to cloudflare or pinata gateway
  if (rawUrl.includes("ipfs.io/ipfs/")) {
    const cidPart = rawUrl.split("ipfs.io/ipfs/")[1];
    if (cidPart) {
      return `https://cloudflare-ipfs.com/ipfs/${cidPart}`;
    }
  }

  // Handle local /uploads/...
  if (rawUrl.startsWith("/uploads/")) {
    return rawUrl;
  }

  return rawUrl;
}

export function handleImageFallback(e: React.SyntheticEvent<HTMLImageElement, Event>, fallbackType = "post") {
  const target = e.currentTarget;
  const currentSrc = target.src;

  // If failed on cloudflare-ipfs, try pinata gateway
  if (currentSrc.includes("cloudflare-ipfs.com/ipfs/")) {
    const cid = currentSrc.split("cloudflare-ipfs.com/ipfs/")[1];
    if (cid) {
      target.src = `https://gateway.pinata.cloud/ipfs/${cid}`;
      return;
    }
  }

  // If failed on pinata, try dweb.link
  if (currentSrc.includes("gateway.pinata.cloud/ipfs/")) {
    const cid = currentSrc.split("gateway.pinata.cloud/ipfs/")[1];
    if (cid) {
      target.src = `https://${cid}.ipfs.dweb.link`;
      return;
    }
  }

  // Otherwise, use curated high quality unsplash fallback based on type
  if (fallbackType === "avatar") {
    target.src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80";
  } else {
    target.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80";
  }
}
