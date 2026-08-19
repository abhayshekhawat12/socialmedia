const { PrismaClient } = require("@prisma/client");

const regions = [
  "aws-0-ap-south-1",
  "aws-0-ap-southeast-1",
  "aws-0-us-east-1",
  "aws-0-us-east-2",
  "aws-0-us-west-1",
  "aws-0-us-west-2",
  "aws-0-eu-central-1",
  "aws-0-eu-west-1",
  "aws-0-eu-west-2",
  "aws-0-eu-west-3",
  "aws-0-ap-northeast-1",
  "aws-0-ap-northeast-2",
  "aws-0-sa-east-1",
  "aws-0-ca-central-1",
];

async function checkRegion(region) {
  const url = `postgresql://postgres.pgphohpuwylnnrbwwclu:Abhayshekhawat@${region}.pooler.supabase.com:6543/postgres?pgbouncer=true`;
  const prisma = new PrismaClient({
    datasources: { db: { url } },
    log: [],
  });

  try {
    const count = await prisma.user.count();
    console.log(`\n🎉 FOUND MATCHING POOLER REGION: ${region} (User count: ${count})\n`);
    await prisma.$disconnect();
    return true;
  } catch (err) {
    if (err.message.includes("tenant/user")) {
      // not this region
    } else {
      console.log(`Region ${region} result:`, err.message?.split("\n")[0]);
    }
    await prisma.$disconnect();
    return false;
  }
}

async function main() {
  console.log("Checking Supabase pooler regions for tenant pgphohpuwylnnrbwwclu...");
  for (const r of regions) {
    process.stdout.write(`Testing ${r}... `);
    const found = await checkRegion(r);
    if (found) break;
  }
}

main();
