const { PrismaClient } = require("@prisma/client");

const poolerUrl = "postgresql://postgres.pgphohpuwylnnrbwwclu:Abhayshekhawat@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: poolerUrl,
    },
  },
});

async function main() {
  console.log("Testing Supabase Pooler connection on port 6543...");
  const userCount = await prisma.user.count();
  const postCount = await prisma.post.count();
  console.log(`Connection successful! Users: ${userCount}, Posts: ${postCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
