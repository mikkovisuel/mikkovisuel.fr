import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { db } from "@/lib/db";

// This is the real authorization boundary — proxy.ts only does an optimistic
// cookie-presence redirect. Every Server Action, Route Handler, and
// data-fetching Server Component that touches protected data must call one
// of the verify* functions below (or the get* variants for optional checks).
// See /Users/mikko/.claude/plans/smooth-crafting-rose.md.

export const getAdminSession = cache(async () => {
  const session = await readSession();
  if (!session || session.subjectType !== "ADMIN") return null;
  return db.admin.findUnique({ where: { id: session.subjectId } });
});

export const verifyAdminSession = cache(async () => {
  const admin = await getAdminSession();
  if (!admin) {
    redirect("/admin/connexion");
  }
  return admin;
});

export const getClientSession = cache(async () => {
  const session = await readSession();
  if (!session || session.subjectType !== "CLIENT_USER") return null;
  return db.clientUser.findUnique({
    where: { id: session.subjectId },
    include: { client: true },
  });
});

export const verifyClientSession = cache(async () => {
  const clientUser = await getClientSession();
  if (!clientUser) {
    redirect("/espace-client/connexion");
  }
  return clientUser;
});
