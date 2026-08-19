import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = (): PrismaClient => {
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    console.error(
      "[Prisma Error] DATABASE_URL is not set or is empty. Please configure DATABASE_URL and DIRECT_URL in your .env or Vercel environment variables."
    );
  }

  return new PrismaClient({
    datasources: dbUrl
      ? {
          db: {
            url: dbUrl,
          },
        }
      : undefined,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
};

export const getPrismaClient = (): PrismaClient => {
  if (!globalThis.prisma) {
    globalThis.prisma = prismaClientSingleton();
  }
  return globalThis.prisma;
};

// Lazy proxy: ensures PrismaClient is only instantiated at runtime on demand,
// avoiding early initialization errors during Next.js build-time static evaluation.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop: keyof PrismaClient) {
    const client = getPrismaClient();
    const value = client[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

export default prisma;


