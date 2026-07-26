import { PrismaClient } from "@prisma/client";

// Singleton Prisma client — prevents too-many-connections in dev hot-reload.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Export BOTH ways so every file's import style works:
export { prisma };
export default prisma;
