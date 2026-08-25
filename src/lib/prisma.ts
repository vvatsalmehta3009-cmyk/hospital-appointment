import { PrismaClient } from "@prisma/client";

const FALLBACK_DB_URL =
  "postgresql://neondb_owner:npg_QU3oArGs4KYy@ep-tiny-salad-awv1gmb6-pooler.c-12.us-east-1.aws.neon.tech/neondb?sslmode=require";

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  FALLBACK_DB_URL;

// Ensure process.env.DATABASE_URL is always populated so Prisma's internal validation never fails
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === "") {
  process.env.DATABASE_URL = dbUrl;
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
