const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

async function main() {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      likes: { select: { userAddress: true } },
      savedPosts: { select: { userAddress: true } },
      comments: {
        take: 6,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          authorAddress: true,
          content: true,
          createdAt: true,
        },
      },
    },
  });
  console.log(`Fetched ${posts.length} posts`);

  const authorAddresses = Array.from(new Set(posts.map((p) => p.authorAddress).filter(Boolean)));
  console.log("Author addresses:", authorAddresses);

  const profiles = authorAddresses.length > 0
    ? await prisma.profile.findMany({
        where: {
          user: {
            walletAddress: { in: authorAddresses },
          },
        },
        select: {
          username: true,
          displayName: true,
          avatarUrl: true,
          user: { select: { walletAddress: true } },
        },
      })
    : [];
  console.log("Profiles found:", profiles.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
