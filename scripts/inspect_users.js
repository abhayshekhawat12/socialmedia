const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ include: { profile: true } });
  console.log("Total Users in DB:", users.length);
  users.forEach(u => console.log("User:", u.id, u.email, u.walletAddress, u.googleId, "Profile:", u.profile?.username, u.profile?.displayName));
}

main().catch(console.error).finally(() => prisma.$disconnect());
