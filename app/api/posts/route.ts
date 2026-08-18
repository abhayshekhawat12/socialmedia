import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateContentHash } from "@/lib/contract-helper";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const authorAddress = searchParams.get("authorAddress")?.toLowerCase();
    const filter = searchParams.get("filter"); // all | verified | nfts
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const where: any = {};
    if (authorAddress) where.authorAddress = authorAddress;
    if (filter === "nfts") where.isNft = true;

    const posts = await prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        likes: true,
        comments: {
          take: 5,
          orderBy: { createdAt: "desc" },
        },
        verifications: true,
        nfts: true,
      },
    });

    // Populate profiles for all authors
    const authorAddresses = Array.from(new Set(posts.map((p) => p.authorAddress)));
    const profiles = await prisma.profile.findMany({
      where: {
        user: {
          walletAddress: { in: authorAddresses },
        },
      },
      include: { user: true },
    });

    const profileMap = new Map(profiles.map((p) => [p.user.walletAddress, p]));

    const enrichedPosts = posts.map((post) => ({
      ...post,
      authorProfile: profileMap.get(post.authorAddress) || {
        username: `creator_${post.authorAddress.slice(2, 8)}`,
        displayName: `Creator ${post.authorAddress.slice(0, 6)}`,
        avatarUrl: "",
        web3ProfileId: `web3_id_${post.authorAddress.slice(2, 10)}`,
      },
    }));

    return NextResponse.json({ success: true, posts: enrichedPosts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      authorAddress,
      caption,
      mediaUrl,
      mediaCid,
      mediaType = "image",
      location = "",
      privacy = "public",
      contentHash: providedHash,
      onChainDnaId = 0,
      txHash,
      isNft = false,
      nftTokenId,
      nftTxHash,
    } = body;

    if (!authorAddress || !mediaCid) {
      return NextResponse.json({ error: "Author address and media CID required" }, { status: 400 });
    }

    const normalizedAuthor = authorAddress.toLowerCase();

    // Generate SHA256/Keccak content fingerprint if not provided
    const contentHash = providedHash || generateContentHash(mediaCid, caption || "", normalizedAuthor);

    // Ensure user exists
    let user = await prisma.user.findUnique({
      where: { walletAddress: normalizedAuthor },
      include: { profile: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          walletAddress: normalizedAuthor,
          nonce: `nonce_${Math.random()}`,
          profile: {
            create: {
              username: `creator_${normalizedAuthor.slice(2, 8)}`,
              displayName: `Creator ${normalizedAuthor.slice(0, 6)}`,
            },
          },
        },
        include: { profile: true },
      });
    }

    // Check for duplicate content hash
    const existingPost = await prisma.post.findUnique({
      where: { contentHash },
    });

    if (existingPost) {
      return NextResponse.json(
        { error: "Content fingerprint already registered on blockchain (Proof-of-Creation duplicate prevention)" },
        { status: 409 }
      );
    }

    // Create post
    const post = await prisma.post.create({
      data: {
        authorAddress: normalizedAuthor,
        caption: caption || "",
        mediaUrl: mediaUrl || `https://ipfs.io/ipfs/${mediaCid}`,
        mediaCid,
        mediaType,
        location,
        privacy,
        contentHash,
        onChainDnaId: Number(onChainDnaId),
        isNft: Boolean(isNft),
        nftTokenId: nftTokenId ? Number(nftTokenId) : null,
        nftTxHash: nftTxHash || null,
        verifications: {
          create: {
            contentHash,
            authorAddress: normalizedAuthor,
            txHash: txHash || `0xlocal_${Date.now()}_${contentHash.slice(0, 8)}`,
            onChainDnaId: Number(onChainDnaId),
            verificationStatus: "VERIFIED",
          },
        },
        ...(isNft && nftTokenId
          ? {
              nfts: {
                create: {
                  tokenId: Number(nftTokenId),
                  contractAddress: body.contractAddress || "0xLocalSocialNFTContract",
                  ownerAddress: normalizedAuthor,
                  metadataCid: mediaCid,
                  tokenUri: `ipfs://${mediaCid}`,
                  mintTxHash: nftTxHash || txHash || `0xmint_${Date.now()}`,
                },
              },
            }
          : {}),
      },
      include: {
        verifications: true,
        nfts: true,
      },
    });

    // Parse and update Hashtags
    if (caption) {
      const hashtags = caption.match(/#[a-zA-Z0-9_]+/g);
      if (hashtags) {
        for (const tagRaw of hashtags) {
          const tag = tagRaw.toLowerCase();
          await prisma.hashtag.upsert({
            where: { tag },
            create: { tag, postCount: 1 },
            update: { postCount: { increment: 1 } },
          });
        }
      }
    }

    // Record Blockchain Transaction
    if (txHash) {
      await prisma.blockchainTransaction.create({
        data: {
          txHash,
          fromAddress: normalizedAuthor,
          toAddress: body.contractAddress || "ProofOfCreationContract",
          type: isNft ? "NFT_MINT" : "PROOF_REGISTRATION",
          status: "CONFIRMED",
          payload: JSON.stringify({ postId: post.id, contentHash, mediaCid }),
        },
      });
    }

    return NextResponse.json({
      success: true,
      post: {
        ...post,
        authorProfile: user.profile,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create post" }, { status: 500 });
  }
}
