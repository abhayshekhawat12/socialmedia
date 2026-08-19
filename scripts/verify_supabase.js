const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log("Verifying live data in Supabase database:");
  const counts = {
    users: await prisma.user.count(),
    profiles: await prisma.profile.count(),
    posts: await prisma.post.count(),
    pulses: await prisma.pulse.count(),
    stories: await prisma.story.count(),
    likes: await prisma.like.count(),
    audio: await prisma.audio.count(),
    media: await prisma.media.count(),
    userSettings: await prisma.userSettings.count(),
    userSessions: await prisma.userSession.count(),
    snaps: await prisma.snap.count(),
    streaks: await prisma.streak.count(),
    notifications: await prisma.notification.count(),
    otpVerifications: await prisma.otpVerification.count(),
    storyViews: await prisma.storyView.count(),
  };
  console.table(counts);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
