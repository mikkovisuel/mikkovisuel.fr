import { describe, expect, it } from "vitest";
import { contentMatchesDeclaredType } from "@/lib/file-signature";
import { canLogIn, contactAccessState, notifiableEmails } from "@/lib/clients";
import { isDeliverablesLocked, isWorkLocked } from "@/lib/payment-locks";
import { isOverdue, formatAmount } from "@/lib/documents";
import { dueAutoReminder } from "@/lib/invoice-auto-reminders";
import { accentInkFor, parseAdminPreferences, visibleColumns } from "@/lib/admin-preferences";
import { denyUnauthorizedCron } from "@/lib/cron-auth";
import { escapeHtml } from "@/lib/html-escape";

const DAY = 24 * 60 * 60 * 1000;

describe("connexion à l'espace client", () => {
  it("exige accès ouvert, e-mail et mot de passe", () => {
    expect(canLogIn({ email: "a@b.fr", passwordHash: "h", portalAccessEnabled: true })).toBe(true);
    expect(canLogIn({ email: "a@b.fr", passwordHash: "h", portalAccessEnabled: false })).toBe(false);
    expect(canLogIn({ email: "a@b.fr", passwordHash: null, portalAccessEnabled: true })).toBe(false);
    expect(canLogIn({ email: null, passwordHash: "h", portalAccessEnabled: true })).toBe(false);
  });
  it("distingue les trois états d'accès (invitation en attente comprise)", () => {
    expect(contactAccessState({ passwordHash: null, portalAccessEnabled: false })).toBe("none");
    expect(contactAccessState({ passwordHash: null, portalAccessEnabled: true })).toBe("pending");
    expect(contactAccessState({ passwordHash: "h", portalAccessEnabled: true })).toBe("active");
  });
  it("n'écrit qu'aux contacts qui acceptent les e-mails", () => {
    expect(
      notifiableEmails([
        { email: "oui@b.fr", emailNotificationsEnabled: true },
        { email: "non@b.fr", emailNotificationsEnabled: false },
        { email: null, emailNotificationsEnabled: true },
      ]),
    ).toEqual(["oui@b.fr"]);
  });
});

describe("import de fichier", () => {
  it("accepte un vrai PDF", async () => {
    expect(await contentMatchesDeclaredType(Buffer.from("%PDF-1.7\n%%EOF"), "application/pdf")).toBe(true);
  });
  it("refuse un faux PDF (fichier renommé)", async () => {
    expect(await contentMatchesDeclaredType(Buffer.from("MZ\x90\x00 pas un pdf"), "application/pdf")).toBe(false);
  });
  it("refuse un PNG déclaré en PDF", async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    expect(await contentMatchesDeclaredType(png, "application/pdf")).toBe(false);
  });
});

describe("paiement et verrous", () => {
  it("verrouille les livrables tant que le paiement n'est pas confirmé (règle du client)", () => {
    const client = { requirePaymentForDeliverables: true };
    expect(isDeliverablesLocked({ deliverablesLockOverride: null, deliverablesPaymentConfirmedAt: null }, client)).toBe(true);
    expect(isDeliverablesLocked({ deliverablesLockOverride: null, deliverablesPaymentConfirmedAt: new Date() }, client)).toBe(false);
    expect(isDeliverablesLocked({ deliverablesLockOverride: "unlocked", deliverablesPaymentConfirmedAt: null }, client)).toBe(false);
  });
  it("l'exception par évènement prime sur la règle du client", () => {
    expect(isWorkLocked({ workLockOverride: "locked", workPaymentConfirmedAt: null }, { requirePaymentBeforeWork: false })).toBe(true);
    expect(isWorkLocked({ workLockOverride: null, workPaymentConfirmedAt: null }, { requirePaymentBeforeWork: false })).toBe(false);
  });
  it("une facture n'est en retard que si elle est impayée et échue", () => {
    const past = new Date(Date.now() - DAY);
    expect(isOverdue({ dueDate: past, paymentStatus: "unpaid" })).toBe(true);
    expect(isOverdue({ dueDate: past, paymentStatus: "paid" })).toBe(false);
    expect(isOverdue({ dueDate: null, paymentStatus: "unpaid" })).toBe(false);
  });
  it("formate les montants en euros", () => {
    expect(formatAmount(68000, "EUR")?.replace(/\s/g, " ")).toMatch(/680,00/);
  });
});

describe("relance automatique des factures", () => {
  const now = new Date("2026-10-20T07:00:00Z");
  const due = (days: number) => new Date(now.getTime() - days * DAY);
  it("1re relance à partir de J+7", () => {
    expect(dueAutoReminder({ dueDate: due(6), autoReminderCount: 0, lastReminderAt: null }, now)).toBeNull();
    expect(dueAutoReminder({ dueDate: due(7), autoReminderCount: 0, lastReminderAt: null }, now)).toBe(7);
  });
  it("2e relance à partir de J+15, jamais une 3e", () => {
    expect(dueAutoReminder({ dueDate: due(14), autoReminderCount: 1, lastReminderAt: due(7) }, now)).toBeNull();
    expect(dueAutoReminder({ dueDate: due(15), autoReminderCount: 1, lastReminderAt: due(8) }, now)).toBe(15);
    expect(dueAutoReminder({ dueDate: due(60), autoReminderCount: 2, lastReminderAt: due(30) }, now)).toBeNull();
  });
  it("jamais deux relances à moins de 7 jours d'écart", () => {
    expect(dueAutoReminder({ dueDate: due(40), autoReminderCount: 1, lastReminderAt: due(2) }, now)).toBeNull();
  });
  it("pas d'échéance, pas de relance", () => {
    expect(dueAutoReminder({ dueDate: null, autoReminderCount: 0, lastReminderAt: null }, now)).toBeNull();
  });
});

describe("tâches planifiées", () => {
  it("refusent un appel sans le secret", () => {
    process.env.CRON_SECRET = "secret-de-test";
    expect(denyUnauthorizedCron(new Request("http://x/api/cron/a"))?.status).toBe(401);
    expect(denyUnauthorizedCron(new Request("http://x", { headers: { authorization: "Bearer faux" } }))?.status).toBe(401);
    expect(denyUnauthorizedCron(new Request("http://x", { headers: { authorization: "Bearer secret-de-test" } }))).toBeNull();
  });
  it("sont fermées si le secret n'est pas configuré", () => {
    delete process.env.CRON_SECRET;
    expect(denyUnauthorizedCron(new Request("http://x"))?.status).toBe(503);
  });
});

describe("affichage et contenu", () => {
  it("un profil d'affichage abîmé retombe sur les valeurs par défaut", () => {
    const prefs = parseAdminPreferences({ density: 42, accent: "red; url(x)", columns: { taches: { order: "x", hidden: 3 } } });
    expect(prefs.density).toBe("compact");
    expect(prefs.accent).toBeNull();
    expect(visibleColumns(prefs, "taches")).toContain("client");
  });
  it("texte lisible sur la couleur d'accent", () => {
    expect(accentInkFor("#dded2e")).toBe("#1f1f1f");
    expect(accentInkFor("#1f1f1f")).toBe("#ffffff");
  });
  it("échappe le HTML des e-mails", () => {
    expect(escapeHtml('<script>"x"</script>')).not.toContain("<script>");
  });
});
