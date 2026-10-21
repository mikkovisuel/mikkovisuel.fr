import "server-only";
import { db } from "@/lib/db";
import { extractEmailAddress } from "@/lib/gmail";

// Onglet Mail (2026-10-21) : relie une adresse e-mail à un client (via ses
// contacts ou son e-mail de facturation) ou à un prospect.
export type MailLink = { type: "client" | "prospect"; id: string; name: string };

export async function linksForAddresses(headers: string[]): Promise<Record<string, MailLink>> {
  const emails = [
    ...new Set(
      headers
        .flatMap((header) => header.split(","))
        .map((part) => extractEmailAddress(part).toLowerCase())
        .filter((email) => email.includes("@")),
    ),
  ];
  if (emails.length === 0) return {};
  const [contacts, clients, prospects] = await Promise.all([
    db.contact.findMany({
      where: { email: { in: emails, mode: "insensitive" } },
      select: { email: true, clientLinks: { select: { client: { select: { id: true, name: true } } }, take: 1 } },
    }),
    db.client.findMany({
      where: { billingEmail: { in: emails, mode: "insensitive" } },
      select: { id: true, name: true, billingEmail: true },
    }),
    db.prospect.findMany({
      where: { email: { in: emails, mode: "insensitive" } },
      select: { id: true, name: true, email: true },
    }),
  ]);
  const links: Record<string, MailLink> = {};
  for (const prospect of prospects) links[prospect.email!.toLowerCase()] = { type: "prospect", id: prospect.id, name: prospect.name };
  for (const client of clients) links[client.billingEmail!.toLowerCase()] = { type: "client", id: client.id, name: client.name };
  for (const contact of contacts) {
    const client = contact.clientLinks[0]?.client;
    if (client) links[contact.email!.toLowerCase()] = { type: "client", id: client.id, name: client.name };
  }
  return links;
}
