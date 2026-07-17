import "server-only";
import { cookies } from "next/headers";
import { randomBytes, createHash } from "node:crypto";
import { db } from "@/lib/db";

const COOKIE_NAME = "session_token";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export type SubjectType = "ADMIN" | "CLIENT_USER";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// A fresh token is issued on every login (never reused across sessions), and
// resetting a password wipes every existing session for that subject — see
// destroyAllSessionsForSubject, called from the password-reset action.
export async function createSession(subjectType: SubjectType, subjectId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.session.create({
    data: { tokenHash: hashToken(token), subjectType, subjectId, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

async function getSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

export async function readSession() {
  const token = await getSessionToken();
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await db.session.findUnique({ where: { tokenHash } });
  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { tokenHash } }).catch(() => {});
    return null;
  }

  return session;
}

export async function destroySession() {
  const token = await getSessionToken();
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);

  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
}

export async function destroyAllSessionsForSubject(subjectType: SubjectType, subjectId: string) {
  await db.session.deleteMany({ where: { subjectType, subjectId } });
}
