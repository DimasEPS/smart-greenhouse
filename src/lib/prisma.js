/**
 * Prisma Client Singleton Instance
 *
 * This ensures that only one instance of PrismaClient is created
 * throughout the application lifecycle, preventing connection issues
 * during development (hot reload) and production.
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = global;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
