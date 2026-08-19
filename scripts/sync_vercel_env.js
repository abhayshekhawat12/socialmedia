const { execSync } = require("child_process");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

const envConfig = dotenv.parse(fs.readFileSync(path.join(__dirname, "../.env")));

const keysToSync = [
  "DATABASE_URL",
  "DIRECT_URL",
  "JWT_SECRET",
  "NEXT_PUBLIC_PINATA_GATEWAY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
];

const targets = ["production", "preview", "development"];

console.log("Syncing environment variables to Vercel...");

for (const key of keysToSync) {
  const value = envConfig[key];
  if (!value) {
    console.log(`Skipping ${key} (empty or not set)`);
    continue;
  }

  for (const target of targets) {
    try {
      try {
        execSync(`npx vercel env rm ${key} ${target} --yes`, { stdio: "ignore" });
      } catch {}

      const cmd = `npx vercel env add ${key} ${target} --value "${value.replace(/"/g, '\\"')}" --yes`;
      execSync(cmd, { stdio: "ignore" });
    } catch (err) {
      console.error(`Failed to add ${key} for ${target}:`, err.message);
    }
  }
  console.log(`✓ Added ${key} to Vercel (production, preview, development)`);
}

console.log("Redeploying to production so new environment variables take effect...");
execSync("npx vercel --prod --yes", { stdio: "inherit" });
console.log("Vercel deployment finished successfully!");
