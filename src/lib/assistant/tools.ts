import "server-only";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { EXCLUDE_DEMO_CLIENT } from "@/lib/clients";
import { PROSPECT_STATUS, TASK_STATUS, TASK_STATUS_LIST_KEY, DOCUMENT_TYPE, type ProspectStatusSlug, type TaskStatusSlug } from "@/lib/dropdown-lists";
import { formatAmount, isOverdue } from "@/lib/documents";
import { escapeHtml } from "@/lib/html-escape";
import {
  SOCIAL_FORMATS,
  SOCIAL_NETWORKS,
  SOCIAL_POST_STATUS,
  parseParisDateTimeLocal,
  toParisDateTimeLocal,
} from "@/lib/social-posts";
import { createTaskByAdmin, setTaskStatus, updateTaskField } from "@/lib/actions/tasks";
import { createNote, updateNote } from "@/lib/actions/notes";
import { setProspectStatus } from "@/lib/actions/prospects";
import { createSocialAction } from "@/lib/actions/social-actions";
import { sendPaymentReminder, setDocumentPaymentStatus } from "@/lib/actions/payments";

// Outils de l'assistant Claude du back-office (2026-10-21).
//  - « read » : exécutés tout de suite, en lecture seule.
//  - « write » : jamais exécutés par le modèle. Ils deviennent une carte
//    « Confirmer / Annuler » ; seule la confirmation de l'admin les lance, en
//    réutilisant les actions serveur existantes (mêmes contrôles). Le texte de
//    la carte est construit ici à partir de la base, pas recopié du modèle.

export interface AssistantContext {
  admin: { id: string; email: string };
}

type ReadTool = {
  kind: "read";
  description: string;
  schema: z.ZodObject;
  label: (input: never) => string;
  run: (input: never, ctx: AssistantContext) => Promise<unknown>;
};

type WriteTool = {
  kind: "write";
  description: string;
  schema: z.ZodObject;
  /** Carte de confirmation : titre + détails lisibles, ou une erreur si l'entrée ne tient pas. */
  describe: (input: never) => Promise<{ title: string; details: string[] } | { error: string }>;
  /** Exécution après confirmation : phrase de résultat pour l'admin et le modèle. */
  execute: (input: never, ctx: AssistantContext) => Promise<string>;
};

const day = (date: Date | null | undefined) => (date ? date.toISOString().slice(0, 10) : null);
const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format AAAA-MM-JJ");
const isoDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Date et heure attendues au format AAAA-MM-JJTHH:MM (Paris)");
const DATE_FR = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const frDay = (value: string) => DATE_FR.format(new Date(value));

async function clientName(id: string) {
  return (await db.client.findUnique({ where: { id }, select: { name: true } }))?.name ?? null;
}

function revalidateAdmin() {
  revalidatePath("/admin", "layout");
}

const TASK_STATUSES = Object.values(TASK_STATUS) as [TaskStatusSlug, ...TaskStatusSlug[]];
const PROSPECT_STATUSES = Object.values(PROSPECT_STATUS) as [ProspectStatusSlug, ...ProspectStatusSlug[]];
const NETWORKS = SOCIAL_NETWORKS.map((n) => n.slug) as [string, ...string[]];
const FORMATS = SOCIAL_FORMATS.map((f) => f.slug) as [string, ...string[]];

const TOOLS = {
  // --- Lecture -----------------------------------------------------------
  lister_clients: {
    kind: "read",
    description: "Liste les clients (actifs par défaut), avec un filtre facultatif sur le nom.",
    schema: z.object({ recherche: z.string().optional(), inclure_archives: z.boolean().optional() }),
    label: () => "clients",
    run: async ({ recherche, inclure_archives }: { recherche?: string; inclure_archives?: boolean }) =>
      db.client.findMany({
        where: {
          ...EXCLUDE_DEMO_CLIENT,
          ...(inclure_archives ? {} : { archivedAt: null }),
          ...(recherche ? { name: { contains: recherche, mode: "insensitive" } } : {}),
        },
        select: { id: true, name: true, billingEmail: true, archivedAt: true },
        orderBy: { name: "asc" },
        take: 60,
      }),
  },
  voir_client: {
    kind: "read",
    description: "Fiche d'un client : coordonnées, contacts, notes internes, tâches en cours, factures impayées.",
    schema: z.object({ client_id: z.string() }),
    label: () => "fiche client",
    run: async ({ client_id }: { client_id: string }) => {
      const client = await db.client.findUnique({
        where: { id: client_id },
        include: {
          contacts: { include: { contact: { select: { name: true, email: true, phone: true, role: true } } } },
          tasks: {
            where: { archivedAt: null, status: { slug: { not: TASK_STATUS.TERMINE } } },
            select: { id: true, title: true, dueDate: true, status: { select: { label: true } } },
            take: 30,
          },
          documents: {
            where: { paymentStatus: "unpaid" },
            select: { id: true, fileName: true, amountCents: true, currency: true, dueDate: true },
          },
        },
      });
      if (!client) return { erreur: "Client introuvable." };
      return {
        id: client.id,
        nom: client.name,
        email_facturation: client.billingEmail,
        notes: client.notes,
        archive: Boolean(client.archivedAt),
        contacts: client.contacts.map((c) => c.contact),
        taches_en_cours: client.tasks.map((t) => ({ id: t.id, titre: t.title, statut: t.status.label, echeance: day(t.dueDate) })),
        factures_impayees: client.documents.map((d) => ({
          id: d.id,
          fichier: d.fileName,
          montant: formatAmount(d.amountCents, d.currency),
          echeance: day(d.dueDate),
        })),
      };
    },
  },
  lister_taches: {
    kind: "read",
    description: "Liste les tâches non archivées. Filtres facultatifs : client, statut, seulement les miennes, seulement en retard.",
    schema: z.object({
      client_id: z.string().optional(),
      statut: z.enum(TASK_STATUSES).optional(),
      seulement_les_miennes: z.boolean().optional(),
      seulement_en_retard: z.boolean().optional(),
    }),
    label: () => "tâches",
    run: async (
      input: { client_id?: string; statut?: TaskStatusSlug; seulement_les_miennes?: boolean; seulement_en_retard?: boolean },
      ctx: AssistantContext,
    ) => {
      const tasks = await db.task.findMany({
        where: {
          archivedAt: null,
          client: EXCLUDE_DEMO_CLIENT,
          ...(input.client_id ? { clientId: input.client_id } : {}),
          ...(input.statut ? { status: { slug: input.statut } } : {}),
          ...(input.seulement_les_miennes ? { assignedAdminId: ctx.admin.id } : {}),
          ...(input.seulement_en_retard
            ? { dueDate: { lt: new Date() }, status: { slug: { not: TASK_STATUS.TERMINE } } }
            : {}),
        },
        select: {
          id: true,
          title: true,
          dueDate: true,
          eventDate: true,
          status: { select: { slug: true, label: true } },
          client: { select: { name: true } },
          assignedAdmin: { select: { email: true } },
        },
        orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }],
        take: 60,
      });
      return tasks.map((t) => ({
        id: t.id,
        titre: t.title,
        client: t.client.name,
        statut: t.status.slug,
        echeance: day(t.dueDate),
        evenement: day(t.eventDate),
        attribuee_a: t.assignedAdmin?.email ?? null,
      }));
    },
  },
  voir_tache: {
    kind: "read",
    description: "Détail d'une tâche : description, dates, statut, derniers commentaires.",
    schema: z.object({ tache_id: z.string() }),
    label: () => "détail d'une tâche",
    run: async ({ tache_id }: { tache_id: string }) => {
      const task = await db.task.findUnique({
        where: { id: tache_id },
        include: {
          status: true,
          client: { select: { id: true, name: true } },
          comments: { orderBy: { createdAt: "desc" }, take: 10, select: { body: true, authorType: true, createdAt: true } },
        },
      });
      if (!task) return { erreur: "Tâche introuvable." };
      return {
        id: task.id,
        titre: task.title,
        description: task.description,
        client: task.client,
        statut: task.status.slug,
        echeance: day(task.dueDate),
        evenement: day(task.eventDate),
        derniers_commentaires: task.comments,
      };
    },
  },
  lister_factures: {
    kind: "read",
    description: "Liste les factures (impayées par défaut), avec montant, échéance et retard.",
    schema: z.object({
      statut: z.enum(["impayees", "payees", "toutes"]).optional(),
      client_id: z.string().optional(),
      seulement_en_retard: z.boolean().optional(),
    }),
    label: () => "factures",
    run: async ({ statut = "impayees", client_id, seulement_en_retard }: { statut?: string; client_id?: string; seulement_en_retard?: boolean }) => {
      const documents = await db.document.findMany({
        where: {
          client: EXCLUDE_DEMO_CLIENT,
          type: { slug: DOCUMENT_TYPE.FACTURE },
          ...(statut === "impayees" ? { paymentStatus: "unpaid" } : statut === "payees" ? { paymentStatus: "paid" } : {}),
          ...(client_id ? { clientId: client_id } : {}),
        },
        select: {
          id: true,
          fileName: true,
          amountCents: true,
          currency: true,
          paymentStatus: true,
          dueDate: true,
          paidAt: true,
          lastReminderAt: true,
          client: { select: { name: true } },
        },
        orderBy: { uploadedAt: "desc" },
        take: 60,
      });
      return documents
        .filter((d) => !seulement_en_retard || isOverdue(d))
        .map((d) => ({
          id: d.id,
          fichier: d.fileName,
          client: d.client.name,
          montant: formatAmount(d.amountCents, d.currency),
          statut: d.paymentStatus,
          echeance: day(d.dueDate),
          en_retard: isOverdue(d),
          payee_le: day(d.paidAt),
          derniere_relance: day(d.lastReminderAt),
        }));
    },
  },
  lister_prospects: {
    kind: "read",
    description: "Liste les prospects, filtre facultatif sur le nom / la ville et sur le statut.",
    schema: z.object({ recherche: z.string().optional(), statut: z.enum(PROSPECT_STATUSES).optional() }),
    label: () => "prospects",
    run: async ({ recherche, statut }: { recherche?: string; statut?: ProspectStatusSlug }) => {
      const prospects = await db.prospect.findMany({
        where: {
          ...(statut ? { status: { slug: statut } } : {}),
          ...(recherche
            ? {
                OR: [
                  { name: { contains: recherche, mode: "insensitive" } },
                  { city: { contains: recherche, mode: "insensitive" } },
                  { company: { contains: recherche, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          name: true,
          company: true,
          city: true,
          email: true,
          phone: true,
          nextReminderAt: true,
          status: { select: { slug: true } },
        },
        orderBy: { name: "asc" },
        take: 60,
      });
      return prospects.map((p) => ({ ...p, status: p.status.slug, nextReminderAt: day(p.nextReminderAt) }));
    },
  },
  chercher_notes: {
    kind: "read",
    description: "Cherche dans les notes internes (titre et texte). Renvoie le titre et le début du texte.",
    schema: z.object({ recherche: z.string() }),
    label: () => "notes",
    run: async ({ recherche }: { recherche: string }) => {
      const notes = await db.note.findMany({
        where: {
          OR: [
            { title: { contains: recherche, mode: "insensitive" } },
            { content: { contains: recherche, mode: "insensitive" } },
          ],
        },
        select: { id: true, title: true, content: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 20,
      });
      return notes.map((n) => ({
        id: n.id,
        titre: n.title,
        extrait: n.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 600),
        modifiee: day(n.updatedAt),
      }));
    },
  },
  lister_reseaux: {
    kind: "read",
    description: "Publications et actions réseaux sociaux sur une période (par défaut : les 14 prochains jours).",
    schema: z.object({ client_id: z.string().optional(), du: isoDay.optional(), au: isoDay.optional() }),
    label: () => "réseaux sociaux",
    run: async ({ client_id, du, au }: { client_id?: string; du?: string; au?: string }) => {
      const from = du ? new Date(du) : new Date();
      const to = au ? new Date(`${au}T23:59:59Z`) : new Date(Date.now() + 14 * 86_400_000);
      const [posts, actions] = await Promise.all([
        db.socialPost.findMany({
          where: { scheduledAt: { gte: from, lte: to }, ...(client_id ? { clientId: client_id } : {}) },
          select: { id: true, title: true, status: true, networks: true, scheduledAt: true, client: { select: { name: true } } },
          orderBy: { scheduledAt: "asc" },
          take: 60,
        }),
        db.socialAction.findMany({
          where: { dueAt: { gte: from, lte: to }, ...(client_id ? { clientId: client_id } : {}) },
          select: { id: true, title: true, dueAt: true, doneAt: true, client: { select: { name: true } } },
          orderBy: { dueAt: "asc" },
          take: 60,
        }),
      ]);
      return {
        publications: posts.map((p) => ({ ...p, scheduledAt: toParisDateTimeLocal(p.scheduledAt), client: p.client.name })),
        actions: actions.map((a) => ({
          id: a.id,
          titre: a.title,
          quand: toParisDateTimeLocal(a.dueAt),
          faite: Boolean(a.doneAt),
          client: a.client?.name ?? "interne",
        })),
      };
    },
  },

  // --- Actions (confirmation obligatoire) -------------------------------
  creer_tache: {
    kind: "write",
    description: "Propose de créer une tâche pour un client (attribuée à l'admin connecté).",
    schema: z.object({
      client_id: z.string(),
      titre: z.string().min(1).max(200),
      description: z.string().max(4000).optional(),
      echeance: isoDay.optional(),
      date_evenement: isoDay.optional(),
    }),
    describe: async (input: { client_id: string; titre: string; description?: string; echeance?: string; date_evenement?: string }) => {
      const name = await clientName(input.client_id);
      if (!name) return { error: "Client introuvable." };
      return {
        title: "Créer une tâche",
        details: [
          `« ${input.titre} »`,
          `Client : ${name}`,
          ...(input.echeance ? [`Échéance : ${frDay(input.echeance)}`] : []),
          ...(input.date_evenement ? [`Évènement : ${frDay(input.date_evenement)}`] : []),
          ...(input.description ? [input.description] : []),
        ],
      };
    },
    execute: async (input: { client_id: string; titre: string; description?: string; echeance?: string; date_evenement?: string }, ctx: AssistantContext) => {
      const form = new FormData();
      form.set("title", input.titre);
      form.set("description", input.description ?? "");
      form.set("eventDate", input.date_evenement ?? "");
      const result = await createTaskByAdmin(input.client_id, undefined, form);
      if (result?.error) throw new Error(result.error);
      // La création ne renvoie pas l'id : on reprend la tâche qu'on vient de créer.
      const task = await db.task.findFirst({
        where: { clientId: input.client_id, title: input.titre, createdById: ctx.admin.id },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (task && input.echeance) await updateTaskField(task.id, "dueDate", input.echeance);
      return task ? `Tâche créée : /admin/taches/${task.id}` : "Tâche créée.";
    },
  },
  modifier_tache: {
    kind: "write",
    description: "Propose de changer le statut, l'échéance ou la personne attribuée d'une tâche.",
    schema: z.object({
      tache_id: z.string(),
      statut: z.enum(TASK_STATUSES).optional(),
      echeance: isoDay.optional(),
      attribuee_a_admin_id: z.string().optional(),
    }),
    describe: async (input: { tache_id: string; statut?: TaskStatusSlug; echeance?: string; attribuee_a_admin_id?: string }) => {
      const task = await db.task.findUnique({ where: { id: input.tache_id }, select: { title: true, client: { select: { name: true } } } });
      if (!task) return { error: "Tâche introuvable." };
      const details = [`« ${task.title} » (${task.client.name})`];
      if (input.statut) {
        const status = await db.dropdownItem.findFirst({ where: { slug: input.statut, list: { key: TASK_STATUS_LIST_KEY } }, select: { label: true } });
        details.push(`Statut → ${status?.label ?? input.statut}`);
      }
      if (input.echeance) details.push(`Échéance → ${frDay(input.echeance)}`);
      if (input.attribuee_a_admin_id) {
        const admin = await db.admin.findUnique({ where: { id: input.attribuee_a_admin_id }, select: { email: true } });
        if (!admin) return { error: "Admin introuvable." };
        details.push(`Attribuée à → ${admin.email}`);
      }
      if (details.length === 1) return { error: "Aucun changement demandé." };
      return { title: "Modifier une tâche", details };
    },
    execute: async (input: { tache_id: string; statut?: TaskStatusSlug; echeance?: string; attribuee_a_admin_id?: string }) => {
      if (input.statut) await setTaskStatus(input.tache_id, input.statut);
      if (input.echeance) {
        const result = await updateTaskField(input.tache_id, "dueDate", input.echeance);
        if (result.error) throw new Error(result.error);
      }
      if (input.attribuee_a_admin_id) {
        const result = await updateTaskField(input.tache_id, "assignedAdminId", input.attribuee_a_admin_id);
        if (result.error) throw new Error(result.error);
      }
      return `Tâche modifiée : /admin/taches/${input.tache_id}`;
    },
  },
  creer_note: {
    kind: "write",
    description: "Propose de créer une note interne, rattachée si besoin à un client ou à un prospect.",
    schema: z.object({
      titre: z.string().min(1).max(200),
      texte: z.string().max(20000),
      client_id: z.string().optional(),
      prospect_id: z.string().optional(),
    }),
    describe: async (input: { titre: string; texte: string; client_id?: string; prospect_id?: string }) => {
      const details = [`« ${input.titre} »`];
      if (input.client_id) {
        const name = await clientName(input.client_id);
        if (!name) return { error: "Client introuvable." };
        details.push(`Client : ${name}`);
      } else if (input.prospect_id) {
        const prospect = await db.prospect.findUnique({ where: { id: input.prospect_id }, select: { name: true } });
        if (!prospect) return { error: "Prospect introuvable." };
        details.push(`Prospect : ${prospect.name}`);
      }
      details.push(input.texte.length > 300 ? `${input.texte.slice(0, 300)}…` : input.texte);
      return { title: "Créer une note", details };
    },
    execute: async (input: { titre: string; texte: string; client_id?: string; prospect_id?: string }) => {
      const note = await createNote({ clientId: input.client_id ?? null, prospectId: input.client_id ? null : (input.prospect_id ?? null) });
      const html = input.texte
        .split(/\n{2,}/)
        .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
        .join("");
      await updateNote(note.id, { title: input.titre, content: html });
      return "Note créée (rubrique Notes).";
    },
  },
  modifier_prospect: {
    kind: "write",
    description: "Propose de changer le statut d'un prospect et/ou sa date de relance.",
    schema: z.object({ prospect_id: z.string(), statut: z.enum(PROSPECT_STATUSES).optional(), date_relance: isoDay.optional() }),
    describe: async (input: { prospect_id: string; statut?: ProspectStatusSlug; date_relance?: string }) => {
      const prospect = await db.prospect.findUnique({ where: { id: input.prospect_id }, select: { name: true } });
      if (!prospect) return { error: "Prospect introuvable." };
      const details = [prospect.name];
      if (input.statut) details.push(`Statut → ${input.statut}`);
      if (input.date_relance) details.push(`Relance → ${frDay(input.date_relance)}`);
      if (details.length === 1) return { error: "Aucun changement demandé." };
      return { title: "Modifier un prospect", details };
    },
    execute: async (input: { prospect_id: string; statut?: ProspectStatusSlug; date_relance?: string }) => {
      if (input.statut) await setProspectStatus(input.prospect_id, input.statut);
      if (input.date_relance) {
        await db.prospect.update({
          where: { id: input.prospect_id },
          data: { nextReminderAt: new Date(input.date_relance), reminderSentAt: null },
        });
        revalidateAdmin();
      }
      return `Prospect modifié : /admin/prospection/${input.prospect_id}`;
    },
  },
  creer_action_reseaux: {
    kind: "write",
    description: "Propose de créer une action réseaux sociaux à cocher (client facultatif).",
    schema: z.object({
      titre: z.string().min(1).max(160),
      quand: isoDateTime,
      client_id: z.string().optional(),
      description: z.string().max(4000).optional(),
    }),
    describe: async (input: { titre: string; quand: string; client_id?: string; description?: string }) => {
      const name = input.client_id ? await clientName(input.client_id) : "interne";
      if (!name) return { error: "Client introuvable." };
      return {
        title: "Créer une action réseaux",
        details: [`« ${input.titre} »`, `Quand : ${input.quand.replace("T", " à ")}`, `Client : ${name}`],
      };
    },
    execute: async (input: { titre: string; quand: string; client_id?: string; description?: string }) => {
      const form = new FormData();
      form.set("title", input.titre);
      form.set("dueAt", input.quand);
      form.set("clientId", input.client_id ?? "");
      form.set("description", input.description ?? "");
      const result = await createSocialAction(undefined, form);
      if (result?.error) throw new Error(result.error);
      return "Action réseaux créée (Réseaux › À faire).";
    },
  },
  creer_brouillon_publication: {
    kind: "write",
    description: "Propose de créer un brouillon de publication réseaux (statut Idée) pour un client.",
    schema: z.object({
      client_id: z.string(),
      titre: z.string().min(1).max(160),
      reseaux: z.array(z.enum(NETWORKS)).min(1),
      format: z.enum(FORMATS),
      legende: z.string().max(4000).optional(),
      date_publication: isoDateTime.optional(),
    }),
    describe: async (input: { client_id: string; titre: string; reseaux: string[]; format: string; legende?: string; date_publication?: string }) => {
      const name = await clientName(input.client_id);
      if (!name) return { error: "Client introuvable." };
      return {
        title: "Créer un brouillon de publication",
        details: [
          `« ${input.titre} » — ${name}`,
          `${input.reseaux.join(", ")} · ${input.format}`,
          ...(input.date_publication ? [`Prévue : ${input.date_publication.replace("T", " à ")}`] : []),
          ...(input.legende ? [input.legende.length > 300 ? `${input.legende.slice(0, 300)}…` : input.legende] : []),
        ],
      };
    },
    execute: async (
      input: { client_id: string; titre: string; reseaux: string[]; format: string; legende?: string; date_publication?: string },
      ctx: AssistantContext,
    ) => {
      // Créé directement (l'action du formulaire redirige vers la fiche).
      const post = await db.socialPost.create({
        data: {
          clientId: input.client_id,
          title: input.titre,
          networks: input.reseaux,
          format: input.format,
          caption: input.legende || null,
          scheduledAt: parseParisDateTimeLocal(input.date_publication),
          status: SOCIAL_POST_STATUS.IDEE,
          assignedAdminId: ctx.admin.id,
        },
      });
      revalidatePath("/admin/reseaux");
      return `Brouillon créé : /admin/reseaux/${post.id}`;
    },
  },
  marquer_facture_payee: {
    kind: "write",
    description: "Propose de marquer une facture comme payée (paiement reçu hors ligne).",
    schema: z.object({ facture_id: z.string() }),
    describe: async ({ facture_id }: { facture_id: string }) => {
      const doc = await db.document.findUnique({
        where: { id: facture_id },
        select: { fileName: true, amountCents: true, currency: true, paymentStatus: true, client: { select: { name: true } } },
      });
      if (!doc || doc.amountCents === null) return { error: "Facture introuvable ou sans montant." };
      if (doc.paymentStatus === "paid") return { error: "Cette facture est déjà payée." };
      return {
        title: "Marquer une facture payée",
        details: [`${doc.fileName} — ${doc.client.name}`, `Montant : ${formatAmount(doc.amountCents, doc.currency)}`],
      };
    },
    execute: async ({ facture_id }: { facture_id: string }) => {
      await setDocumentPaymentStatus(facture_id, "paid");
      return "Facture marquée payée (Administratif).";
    },
  },
  envoyer_relance_paiement: {
    kind: "write",
    description: "Propose d'envoyer au client l'e-mail de relance d'une facture impayée (modèle des Réglages).",
    schema: z.object({ facture_id: z.string() }),
    describe: async ({ facture_id }: { facture_id: string }) => {
      const doc = await db.document.findUnique({
        where: { id: facture_id },
        select: { fileName: true, amountCents: true, currency: true, paymentStatus: true, client: { select: { name: true } } },
      });
      if (!doc) return { error: "Facture introuvable." };
      if (doc.paymentStatus !== "unpaid") return { error: "Cette facture n'est pas impayée." };
      return {
        title: "Envoyer une relance de paiement (e-mail au client)",
        details: [`${doc.fileName} — ${doc.client.name}`, `Montant : ${formatAmount(doc.amountCents, doc.currency) ?? "—"}`],
      };
    },
    execute: async ({ facture_id }: { facture_id: string }) => {
      await sendPaymentReminder(facture_id);
      return "Relance envoyée au client.";
    },
  },
} satisfies Record<string, ReadTool | WriteTool>;

export type AssistantToolName = keyof typeof TOOLS;

/** Titre court d'une action, pour l'historique (la carte détaillée n'est pas gardée). */
export const ACTION_TITLES: Record<string, string> = {
  creer_tache: "Créer une tâche",
  modifier_tache: "Modifier une tâche",
  creer_note: "Créer une note",
  modifier_prospect: "Modifier un prospect",
  creer_action_reseaux: "Créer une action réseaux",
  creer_brouillon_publication: "Créer un brouillon de publication",
  marquer_facture_payee: "Marquer une facture payée",
  envoyer_relance_paiement: "Envoyer une relance de paiement",
};

export function getTool(name: string): ReadTool | WriteTool | null {
  return (TOOLS as Record<string, ReadTool | WriteTool>)[name] ?? null;
}

/** Définitions envoyées à l'API (ordre fixe pour garder le cache). */
export const ASSISTANT_TOOLS: Anthropic.Beta.BetaTool[] = Object.entries(TOOLS).map(([name, tool]) => {
  const { $schema: _ignored, ...schema } = z.toJSONSchema(tool.schema) as Record<string, unknown>;
  return {
    name,
    description: tool.kind === "write" ? `${tool.description} L'admin doit confirmer : rien n'est fait avant.` : tool.description,
    input_schema: schema as Anthropic.Beta.BetaTool.InputSchema,
  };
});

/** Libellé d'une lecture affiché dans le fil (« A lu : factures »). */
export function readLabel(name: string, input: unknown) {
  const tool = getTool(name);
  return tool?.kind === "read" ? tool.label(input as never) : name;
}
