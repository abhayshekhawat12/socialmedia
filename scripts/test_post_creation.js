const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

async function main() {
  console.log("Testing post creation logic in Supabase...");

  const testAuthor = "0x9daed17c62e009f40368d16765b2f7ac6f2f176b";
  const caption = "Test post creation with Supabase integration! #Aura #SocialNetwork";
  const mediaUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500";

  // Ensure user exists
  let user = await prisma.user.findUnique({
    where: { walletAddress: testAuthor },
    include: { profile: true },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        walletAddress: testAuthor,
        profile: {
          create: {
            username: `user_${testAuthor.slice(0, 8)}`,
            displayName: `User ${testAuthor.slice(0, 6)}`,
          },
        },
      },
      include: { profile: true },
    });
  }

  // Create post
  const post = await prisma.post.create({
    data: {
      authorAddress: testAuthor,
      caption,
      mediaUrl,
      mediaType: "image",
      location: "Jaipur, India",
      privacy: "public",
    },
  });

  console.log("Post successfully created in Supabase DB:", post.id);

  // Clean up test post
  await prisma.post.delete({ where: { id: post.id } });
  console.log("Test post cleaned up successfully!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
