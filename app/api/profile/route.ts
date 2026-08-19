import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuthToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawAddress = searchParams.get("walletAddress") || "";
  const address = rawAddress.toLowerCase().trim();

  if (!address) {
    return NextResponse.json({ error: "Address required" }, { status: 400 });
  }

  let profile = await prisma.profile.findFirst({
    where: {
      OR: [
        { user: { walletAddress: address } },
        { user: { walletAddress: rawAddress } },
        { user: { id: address } },
        { user: { id: rawAddress } },
        { user: { email: address } },
        { user: { googleId: address } },
        { user: { googleId: rawAddress } },
        { username: address },
      ],
    },
    include: {
      user: true,
    },
  });

  // If profile not found, check if this is an authenticated user requesting their profile
  if (!profile) {
    const cookieToken = req.cookies.get("block_social_jwt")?.value;
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "") || cookieToken;

    if (token) {
      const session = verifyAuthToken(token);
      if (session && (session.userId === rawAddress || session.email?.toLowerCase() === address || session.walletAddress === rawAddress)) {
        // Auto-provision user & profile
        try {
          const isEmail = address.includes("@");
          const displayName = session.name || (isEmail ? address.split("@")[0] : `User_${rawAddress.slice(0, 6)}`);
          const baseUsername = `u_${displayName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 12)}`;
          let finalUsername = baseUsername || `user_${Math.floor(1000 + Math.random() * 9000)}`;

          let collision = await prisma.profile.findUnique({ where: { username: finalUsername } });
          while (collision) {
            finalUsername = `${baseUsername}_${Math.floor(100 + Math.random() * 900)}`;
            collision = await prisma.profile.findUnique({ where: { username: finalUsername } });
          }

          const newUser = await prisma.user.upsert({
            where: { id: session.userId || rawAddress },
            update: {
              email: session.email?.toLowerCase() || (isEmail ? address : undefined),
              walletAddress: session.walletAddress || rawAddress,
            },
            create: {
              id: session.userId || rawAddress,
              walletAddress: session.walletAddress || rawAddress,
              email: session.email?.toLowerCase() || (isEmail ? address : undefined),
              profile: {
                create: {
                  username: finalUsername,
                  displayName,
                  avatarUrl: session.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(address)}`,
                  bio: "Pulse Social Member.",
                },
              },
            },
            include: { profile: true },
          });

          if (newUser && newUser.profile) {
            profile = {
              ...newUser.profile,
              user: newUser,
            };
          }
        } catch (autoErr) {
          console.warn("Auto profile provision notice:", autoErr);
        }
      }
    }
  }

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const targetIdentifier = profile.user.walletAddress || profile.user.id;

  const [followersCount, followingCount, postsCount] = await Promise.all([
    prisma.follow.count({ where: { followingAddress: targetIdentifier } }),
    prisma.follow.count({ where: { followerAddress: targetIdentifier } }),
    prisma.post.count({ where: { authorAddress: targetIdentifier } }),
  ]);

  return NextResponse.json(
    {
      profile: {
        ...profile,
        nickname: profile.nickname || "",
      },
      user: profile.user,
      stats: {
        followersCount,
        followingCount,
        postsCount,
      },
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=5, stale-while-revalidate=30",
      },
    }
  );
}

export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cookieToken = req.cookies.get("block_social_jwt")?.value;
    const token = authHeader?.replace("Bearer ", "") || cookieToken;

    let targetUserIdentifier: string | null = null;
    if (token) {
      const session = verifyAuthToken(token);
      if (session) {
        targetUserIdentifier = session.userId || session.walletAddress || null;
      }
    }

    const body = await req.json();
    const { displayName, bio, avatarUrl, bannerUrl, username } = body;
    const walletAddress = body.walletAddress || targetUserIdentifier;

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address or session required" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { walletAddress },
          { id: walletAddress },
          { email: walletAddress.toLowerCase() },
        ],
      },
      include: { profile: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (bio !== undefined) updateData.bio = bio;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (bannerUrl !== undefined) updateData.bannerUrl = bannerUrl;
    if (username !== undefined) {
      // Check username uniqueness
      const existing = await prisma.profile.findUnique({ where: { username } });
      if (existing && existing.userId !== user.id) {
        return NextResponse.json({ error: "Username already taken" }, { status: 400 });
      }
      updateData.username = username;
    }

    const updatedProfile = await prisma.profile.upsert({
      where: { userId: user.id },
      update: updateData,
      create: {
        userId: user.id,
        username: username || `user_${user.id.slice(0, 8)}`,
        displayName: displayName || "Pulse Creator",
        bio: bio || "",
        avatarUrl: avatarUrl || "",
        bannerUrl: bannerUrl || "",
      },
    });

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
    });
  } catch (error: any) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: error.message || "Failed to update profile" }, { status: 500 });
  }
}
