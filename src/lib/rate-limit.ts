import "server-only";
import { db } from "@/lib/db";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 8;

export async function recordLoginAttempt(identifier: string, succeeded: boolean) {
  await db.loginAttempt.create({ data: { identifier: identifier.toLowerCase(), succeeded } });
}

export async function isRateLimited(identifier: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const count = await db.loginAttempt.count({
    where: { identifier: identifier.toLowerCase(), succeeded: false, createdAt: { gte: since } },
  });
  return count >= MAX_FAILED_ATTEMPTS;
}
