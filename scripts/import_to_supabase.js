const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

const dateKeys = [
  "createdAt",
  "updatedAt",
  "expiresAt",
  "viewedAt",
  "lastActive",
  "requestedAt",
  "openedAt",
  "lastUser1SnapAt",
  "lastUser2SnapAt",
  "lastStreakIncrementAt",
];

const booleanKeys = [
  "read",
  "allowComments",
  "allowRemix",
  "allowDownload",
  "privateAccount",
  "activityStatus",
  "readReceipts",
  "allowDownloads",
  "twoFactorEnabled",
  "muteAllNotifications",
  "notificationLikes",
  "notificationComments",
  "notificationFollows",
  "notificationMessages",
  "notificationMentions",
  "notificationTags",
  "notificationPulse",
  "notificationLive",
  "notificationDevelopment",
  "notificationCreator",
  "notificationSecurity",
  "notificationPush",
  "autoplay",
  "creatorModeEnabled",
  "reducedMotion",
  "dataSaver",
  "trendingNotifications",
  "aiSuggestions",
  "trendAlerts",
  "opportunityAlerts",
  "isOpenForCollab",
  "isNegotiable",
  "termsLocked",
  "isTrending",
  "isOpened",
  "isCurrent",
];

function parseDates(obj) {
  if (!obj) return obj;
  const clone = { ...obj };
  for (const [key, val] of Object.entries(clone)) {
    if (val === null || val === undefined) continue;
    if (dateKeys.includes(key)) {
      clone[key] = new Date(typeof val === "number" || /^\d+$/.test(val) ? Number(val) : val);
    } else if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      clone[key] = new Date(val);
    } else if (
      typeof val === "number" &&
      (key.startsWith("is") || key.endsWith("Enabled") || booleanKeys.includes(key))
    ) {
      clone[key] = Boolean(val);
    }
  }
  return clone;
}

async function main() {
  const dumpPath = path.join(__dirname, "dev_db_dump.json");
  if (!fs.existsSync(dumpPath)) {
    console.error("dev_db_dump.json not found!");
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(dumpPath, "utf-8"));
  console.log("Starting migration into Supabase database...");

  // 1. User
  if (data.User?.length) {
    console.log(`Importing ${data.User.length} Users...`);
    for (const u of data.User) {
      const parsed = parseDates(u);
      await prisma.user.upsert({
        where: { id: parsed.id },
        update: parsed,
        create: parsed,
      });
    }
  }

  // 2. Profile
  if (data.Profile?.length) {
    console.log(`Importing ${data.Profile.length} Profiles...`);
    for (const p of data.Profile) {
      const parsed = parseDates(p);
      await prisma.profile.upsert({
        where: { id: parsed.id },
        update: parsed,
        create: parsed,
      });
    }
  }

  // 3. UserSettings
  if (data.UserSettings?.length) {
    console.log(`Importing ${data.UserSettings.length} UserSettings...`);
    for (const s of data.UserSettings) {
      const parsed = parseDates(s);
      await prisma.userSettings.upsert({
        where: { id: parsed.id },
        update: parsed,
        create: parsed,
      });
    }
  }

  // 4. UserSession
  if (data.UserSession?.length) {
    console.log(`Importing ${data.UserSession.length} UserSessions...`);
    for (const s of data.UserSession) {
      const parsed = parseDates(s);
      await prisma.userSession.upsert({
        where: { id: parsed.id },
        update: parsed,
        create: parsed,
      });
    }
  }

  // 5. Media
  if (data.Media?.length) {
    console.log(`Importing ${data.Media.length} Media items...`);
    for (const m of data.Media) {
      const parsed = parseDates(m);
      await prisma.media.upsert({
        where: { id: parsed.id },
        update: parsed,
        create: parsed,
      });
    }
  }

  // 6. Audio
  if (data.Audio?.length) {
    console.log(`Importing ${data.Audio.length} Audio tracks...`);
    for (const a of data.Audio) {
      const parsed = parseDates(a);
      await prisma.audio.upsert({
        where: { id: parsed.id },
        update: parsed,
        create: parsed,
      });
    }
  }

  // 7. Pulse
  if (data.Pulse?.length) {
    console.log(`Importing ${data.Pulse.length} Pulses...`);
    for (const p of data.Pulse) {
      const parsed = parseDates(p);
      await prisma.pulse.upsert({
        where: { id: parsed.id },
        update: parsed,
        create: parsed,
      });
    }
  }

  // 8. Post
  if (data.Post?.length) {
    console.log(`Importing ${data.Post.length} Posts...`);
    for (const p of data.Post) {
      const parsed = parseDates(p);
      await prisma.post.upsert({
        where: { id: parsed.id },
        update: parsed,
        create: parsed,
      });
    }
  }

  // 9. Story
  if (data.Story?.length) {
    console.log(`Importing ${data.Story.length} Stories...`);
    for (const s of data.Story) {
      const parsed = parseDates(s);
      await prisma.story.upsert({
        where: { id: parsed.id },
        update: parsed,
        create: parsed,
      });
    }
  }

  // 10. StoryView
  if (data.StoryView?.length) {
    console.log(`Importing ${data.StoryView.length} StoryViews...`);
    for (const sv of data.StoryView) {
      const parsed = parseDates(sv);
      await prisma.storyView.upsert({
        where: { id: parsed.id },
        update: parsed,
        create: parsed,
      });
    }
  }

  // 11. Like
  if (data.Like?.length) {
    console.log(`Importing ${data.Like.length} Likes...`);
    for (const l of data.Like) {
      const parsed = parseDates(l);
      await prisma.like.upsert({
        where: { id: parsed.id },
        update: parsed,
        create: parsed,
      });
    }
  }

  // 12. Notification
  if (data.Notification?.length) {
    console.log(`Importing ${data.Notification.length} Notifications...`);
    for (const n of data.Notification) {
      const parsed = parseDates(n);
      await prisma.notification.upsert({
        where: { id: parsed.id },
        update: parsed,
        create: parsed,
      });
    }
  }

  // 13. OtpVerification
  if (data.OtpVerification?.length) {
    console.log(`Importing ${data.OtpVerification.length} OtpVerifications...`);
    for (const o of data.OtpVerification) {
      const parsed = parseDates(o);
      if (!parsed.identifier) {
        parsed.identifier = parsed.mobileNumber || parsed.email || parsed.id;
      }
      await prisma.otpVerification.upsert({
        where: { id: parsed.id },
        update: parsed,
        create: parsed,
      });
    }
  }

  // 14. Snap
  if (data.Snap?.length) {
    console.log(`Importing ${data.Snap.length} Snaps...`);
    for (const s of data.Snap) {
      const parsed = parseDates(s);
      await prisma.snap.upsert({
        where: { id: parsed.id },
        update: parsed,
        create: parsed,
      });
    }
  }

  // 15. Streak
  if (data.Streak?.length) {
    console.log(`Importing ${data.Streak.length} Streaks...`);
    for (const st of data.Streak) {
      const parsed = parseDates(st);
      await prisma.streak.upsert({
        where: { id: parsed.id },
        update: parsed,
        create: parsed,
      });
    }
  }

  console.log("All data successfully migrated and stored in Supabase tables!");
}

main()
  .catch((e) => {
    console.error("Migration error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
