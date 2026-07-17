import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";

// Local dev runs on SQLite (`file:` URL). Production is expected to run on
// Postgres (`postgres(ql)://` URL) — swapping DATABASE_URL is enough to pick
// the right adapter here; `prisma/schema.prisma`'s `datasource.provider`
// still needs updating to "postgresql" for `prisma migrate` at that point.
// See /Users/mikko/.claude/plans/smooth-crafting-rose.md.
function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set.");
  }

  if (url.startsWith("file:")) {
    return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
  }

  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  }

  throw new Error(`Unsupported DATABASE_URL scheme: ${url}`);
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
