"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifyAdminSession, verifyClientSession, assertNotDemo } from "@/lib/dal";
import { getStorageAdapter } from "@/lib/storage";
import { sendEmail, getAdminEmails } from "@/lib/email/service";
import { escapeHtml } from "@/lib/html-escape";
import { formatFileSize } from "@/lib/files";
import { contentMatchesDeclaredType } from "@/lib/file-signature";
import { notifiableEmailsFromContacts } from "@/lib/clients";
import {
  ADMIN_SELECTABLE_STATUSES,
  CLIENT_VISIBLE_STATUSES,
  SOCIAL_NETWORKS,
  SOCIAL_POST_STATUS,
  formatSchedule,
  parseParisDateTimeLocal,
  toParisDateTimeLocal,
  type SocialPostStatus,
} from "@/lib/social-posts";
import {
  SocialPostSchema,
  SocialPostRefusalSchema,
  SocialPostPublishSchema,
  SocialTaskRequestSchema,
  SocialPostNoteSchema,
  SocialPostCommentSchema,
  optionalIsoDate,
  type SocialPostFormState,
  type SocialPostRefusalState,
  type SocialPostPublishState,
} from "@/lib/validation/social-post";
import type { FileUploadState } from "@/lib/actions/files";
import { SOCIAL_CATEGORY_LIST_KEY, TASK_STATUS } from "@/lib/dropdown-lists";
import {
  SOCIAL_MEDIA_TYPES,
  MAX_SOCIAL_MEDIA_FROM_TASK,
  TASK_LEAD_DAYS,
  copyTaskDeliverablesToPost,
  createInternalTaskForPost,
} from "@/lib/social-task-link";

// Module Community management — voir la section 4 de CAHIER_DES_CHARGES.md.
// Le cycle et ses règles de visibilité sont dans src/lib/social-posts.ts.

// Mêmes plafonds que les livrables (src/lib/actions/files.ts), pour la même
// raison : ils sont dictés par la mémoire réelle du conteneur (512 Mo), pas
// par une préférence. Un reel de plus de 50 Mo ne passera donc pas en V1.
const MAX_MEDIA_SIZE = 50 * 1024 * 1024;
const MAX_UPLOAD_TOTAL_SIZE = 80 * 1024 * 1024;
const ALLOWED_MEDIA_TYPES = SOCIAL_MEDIA_TYPES;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.mikkovisuel.fr";

function revalidateSocialPaths(postId?: string) {
  revalidatePath("/admin/reseaux");
  if (postId) revalidatePath(`/admin/reseaux/${postId}`);
  revalidatePath("/espace-client/reseaux");
  revalidatePath("/espace-client", "layout");
}

function parseSocialPostForm(formData: FormData) {
  return SocialPostSchema.safeParse({
    title: formData.get("title"),
    networks: formData.getAll("networks"),
    format: formData.get("format"),
    caption: formData.get("caption") ?? undefined,
    hashtags: formData.get("hashtags") ?? undefined,
    scheduledAt: formData.get("scheduledAt") ?? undefined,
  });
}

function scheduleFromForm(raw: string | undefined): { ok: true; value: Date | null } | { ok: false } {
  if (!raw) return { ok: true, value: null };
  const value = parseParisDateTimeLocal(raw);
  return value ? { ok: true, value } : { ok: false };
}

// Variantes de légende par réseau (champs `variant_<réseau>`) : un champ
// vide = le réseau reprend le texte commun. `null` si aucune variante.
function variantsFromForm(formData: FormData): { ok: true; value: Record<string, string> | null } | { ok: false } {
  const variants: Record<string, string> = {};
  for (const network of SOCIAL_NETWORKS) {
    const text = String(formData.get(`variant_${network.slug}`) ?? "").trim();
    if (text.length > 4000) return { ok: false };
    if (text) variants[network.slug] = text;
  }
  return { ok: true, value: Object.keys(variants).length > 0 ? variants : null };
}

// Catégorie choisie dans le formulaire : vide = aucune ; sinon doit
// appartenir à la liste "Catégories de publication" (un id arbitraire
// envoyé à la main est refusé plutôt que relié à n'importe quel élément).
async function categoryFromForm(formData: FormData): Promise<{ ok: true; value: string | null } | { ok: false }> {
  const raw = String(formData.get("categoryId") ?? "");
  if (!raw) return { ok: true, value: null };
  const item = await db.dropdownItem.findFirst({
    where: { id: raw, list: { key: SOCIAL_CATEGORY_LIST_KEY } },
    select: { id: true },
  });
  return item ? { ok: true, value: item.id } : { ok: false };
}

// Échéance proposée pour une création demandée : TASK_LEAD_DAYS jours avant
// la publication, à minuit UTC du jour de Paris (même stockage que les
// échéances saisies dans le formulaire des tâches, `new Date("AAAA-MM-JJ")`).
function defaultTaskDueDate(scheduledAt: Date | null): Date | null {
  if (!scheduledAt) return null;
  const due = new Date(toParisDateTimeLocal(scheduledAt).slice(0, 10));
  due.setUTCDate(due.getUTCDate() - TASK_LEAD_DAYS);
  return due;
}

export async function createSocialPost(
  _prev: SocialPostFormState,
  formData: FormData,
): Promise<SocialPostFormState> {
  const admin = await verifyAdminSession();

  const clientId = String(formData.get("clientId") ?? "");
  const client = clientId ? await db.client.findUnique({ where: { id: clientId } }) : null;
  if (!client) return { error: "Choisissez un client." };

  const parsed = parseSocialPostForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const schedule = scheduleFromForm(parsed.data.scheduledAt);
  if (!schedule.ok) return { error: "Date de publication invalide." };
  const category = await categoryFromForm(formData);
  if (!category.ok) return { error: "Catégorie inconnue." };
  const variants = variantsFromForm(formData);
  if (!variants.ok) return { error: "Texte par réseau trop long (4 000 caractères maximum)." };
  // Case "Demander une création" : le type est vérifié avant de créer quoi
  // que ce soit, pour ne pas laisser une publication sans sa tâche.
  const requestTask = formData.get("requestTask") === "on";
  const taskType = String(formData.get("taskType") ?? "");
  if (requestTask && !taskType) return { error: "Choisissez le type de création à demander." };
  const taskEventDate = optionalIsoDate("Date de l'évènement invalide.").safeParse(
    String(formData.get("taskEventDate") ?? ""),
  );
  if (requestTask && !taskEventDate.success) return { error: "Date de l'évènement invalide." };

  const post = await db.socialPost.create({
    data: {
      clientId,
      title: parsed.data.title,
      networks: parsed.data.networks,
      format: parsed.data.format,
      caption: parsed.data.caption || null,
      hashtags: parsed.data.hashtags || null,
      scheduledAt: schedule.value,
      categoryId: category.value,
      captionVariants: variants.value ?? Prisma.DbNull,
    },
  });

  if (requestTask) {
    const result = await createInternalTaskForPost({
      postId: post.id,
      clientId,
      adminId: admin.id,
      title: `Réseaux — ${post.title}`,
      typeSlug: taskType,
      dueDate: defaultTaskDueDate(post.scheduledAt),
      eventDate: taskEventDate.success && taskEventDate.data ? new Date(taskEventDate.data) : null,
      description: null,
    });
    // Type devenu invalide entre-temps : la publication existe, la demande
    // reste possible depuis sa fiche.
    if ("error" in result) console.error("createSocialPost: tâche non créée", result.error);
    revalidatePath("/admin/taches");
  }

  revalidateSocialPaths();
  redirect(`/admin/reseaux/${post.id}`);
}

export async function updateSocialPost(
  postId: string,
  _prev: SocialPostFormState,
  formData: FormData,
): Promise<SocialPostFormState> {
  await verifyAdminSession();

  const post = await db.socialPost.findUnique({ where: { id: postId } });
  if (!post) return { error: "Publication introuvable." };

  const parsed = parseSocialPostForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const schedule = scheduleFromForm(parsed.data.scheduledAt);
  if (!schedule.ok) return { error: "Date de publication invalide." };
  const category = await categoryFromForm(formData);
  if (!category.ok) return { error: "Catégorie inconnue." };
  const variants = variantsFromForm(formData);
  if (!variants.ok) return { error: "Texte par réseau trop long (4 000 caractères maximum)." };

  const scheduleChanged = (post.scheduledAt?.getTime() ?? null) !== (schedule.value?.getTime() ?? null);

  await db.socialPost.update({
    where: { id: postId },
    data: {
      title: parsed.data.title,
      networks: parsed.data.networks,
      format: parsed.data.format,
      caption: parsed.data.caption || null,
      hashtags: parsed.data.hashtags || null,
      scheduledAt: schedule.value,
      categoryId: category.value,
      captionVariants: variants.value ?? Prisma.DbNull,
      // Nouvelle date = nouveau rappel à envoyer le moment venu.
      ...(scheduleChanged ? { reminderSentAt: null } : {}),
    },
  });

  revalidateSocialPaths(postId);
  return { saved: true };
}

// Seuls les statuts de brouillon interne se choisissent librement — les
// autres transitions ont des effets (emails, dates) et passent par leurs
// actions dédiées ci-dessous. Sert aussi à ramener en brouillon une
// publication marquée "Publiée" par erreur.
export async function setSocialPostDraftStatus(postId: string, status: SocialPostStatus) {
  await verifyAdminSession();
  if (!ADMIN_SELECTABLE_STATUSES.includes(status)) return;

  const post = await db.socialPost.findUnique({ where: { id: postId } });
  if (!post) return;

  await db.socialPost.update({
    where: { id: postId },
    data: {
      status,
      validatedAt: null,
      validatedByName: null,
      publishedAt: null,
      publishedUrl: null,
    },
  });
  revalidateSocialPaths(postId);
}

export async function submitSocialPostForValidation(postId: string) {
  await verifyAdminSession();

  const post = await db.socialPost.findUnique({
    where: { id: postId },
    include: { client: { include: { contacts: { include: { contact: true } } } } },
  });
  if (!post) return;

  await db.socialPost.update({
    where: { id: postId },
    // Nouveau tour de validation : le motif du refus précédent ne concerne
    // plus la version soumise (même logique que setTaskStatus).
    data: { status: SOCIAL_POST_STATUS.A_VALIDER, refusalReason: null, refusedAt: null },
  });

  for (const to of notifiableEmailsFromContacts(post.client.contacts)) {
    await sendEmail({
      trigger: "social_post_to_validate",
      to,
      subject: `Publication à valider — ${post.title}`,
      html: `
        <p>Une publication pour vos réseaux sociaux attend votre validation : "${escapeHtml(post.title)}".</p>
        <p><strong>Publication prévue :</strong> ${escapeHtml(formatSchedule(post.scheduledAt))}</p>
        <p><a href="${SITE_URL}/espace-client/reseaux">Voir et valider la publication dans votre espace client</a></p>
      `,
    });
  }

  revalidateSocialPaths(postId);
}

async function notifyAdminsOfClientDecision(
  post: { id: string; title: string; scheduledAt: Date | null; client: { name: string } },
  decision: { kind: "validated"; by: string } | { kind: "refused"; by: string; reason: string },
) {
  const adminLink = `${SITE_URL}/admin/reseaux/${post.id}`;
  const subject =
    decision.kind === "validated"
      ? `Publication validée — ${post.title} (${post.client.name})`
      : `Publication à modifier — ${post.title} (${post.client.name})`;
  const html =
    decision.kind === "validated"
      ? `
        <p>${escapeHtml(decision.by)} a validé la publication "${escapeHtml(post.title)}" (${escapeHtml(post.client.name)}).</p>
        <p><strong>Publication prévue :</strong> ${escapeHtml(formatSchedule(post.scheduledAt))}</p>
        <p><a href="${adminLink}">Ouvrir la publication</a></p>
      `
      : `
        <p>${escapeHtml(decision.by)} demande une modification sur "${escapeHtml(post.title)}" (${escapeHtml(post.client.name)}) :</p>
        <blockquote>${escapeHtml(decision.reason)}</blockquote>
        <p><a href="${adminLink}">Ouvrir la publication</a></p>
      `;

  for (const to of await getAdminEmails()) {
    await sendEmail({
      trigger: decision.kind === "validated" ? "social_post_validated" : "social_post_refused",
      to,
      subject,
      html,
    });
  }
}

export async function validateSocialPost(postId: string) {
  const clientUser = await verifyClientSession();
  assertNotDemo(clientUser);

  const post = await db.socialPost.findUnique({ where: { id: postId }, include: { client: true } });
  if (!post || post.clientId !== clientUser.clientId) return;
  if (post.status !== SOCIAL_POST_STATUS.A_VALIDER) return;

  await db.socialPost.update({
    where: { id: postId },
    data: {
      status: SOCIAL_POST_STATUS.VALIDE,
      validatedAt: new Date(),
      validatedByName: clientUser.name,
      refusalReason: null,
      refusedAt: null,
      previousCaption: null,
      previousHashtags: null,
    },
  });
  await notifyAdminsOfClientDecision(post, { kind: "validated", by: clientUser.name });

  revalidateSocialPaths(postId);
}

export async function refuseSocialPost(
  postId: string,
  _prev: SocialPostRefusalState,
  formData: FormData,
): Promise<SocialPostRefusalState> {
  const clientUser = await verifyClientSession();
  assertNotDemo(clientUser);

  const parsed = SocialPostRefusalSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Le motif est requis." };
  }

  const post = await db.socialPost.findUnique({ where: { id: postId }, include: { client: true } });
  if (!post || post.clientId !== clientUser.clientId) return { error: "Publication introuvable." };
  if (post.status !== SOCIAL_POST_STATUS.A_VALIDER) {
    return { error: "Cette publication n'est plus en attente de validation." };
  }

  await db.socialPost.update({
    where: { id: postId },
    data: {
      status: SOCIAL_POST_STATUS.A_MODIFIER,
      refusalReason: parsed.data.reason,
      refusedAt: new Date(),
      // Version refusée, pour montrer "avant / après" au renvoi.
      previousCaption: post.caption ?? "",
      previousHashtags: post.hashtags ?? "",
    },
  });
  await notifyAdminsOfClientDecision(post, {
    kind: "refused",
    by: clientUser.name,
    reason: parsed.data.reason,
  });

  revalidateSocialPaths(postId);
  return undefined;
}

// Accord donné hors de l'app (téléphone, WhatsApp...) — même principe que
// validateTaskByAdmin. Pas d'email : c'est l'admin lui-même qui agit.
export async function validateSocialPostByAdmin(postId: string) {
  await verifyAdminSession();

  const post = await db.socialPost.findUnique({ where: { id: postId } });
  if (!post) return;

  await db.socialPost.update({
    where: { id: postId },
    data: {
      status: SOCIAL_POST_STATUS.VALIDE,
      validatedAt: new Date(),
      validatedByName: "Mikko (au nom du client)",
      refusalReason: null,
      refusedAt: null,
      previousCaption: null,
      previousHashtags: null,
    },
  });
  revalidateSocialPaths(postId);
}

export async function markSocialPostPublished(
  postId: string,
  _prev: SocialPostPublishState,
  formData: FormData,
): Promise<SocialPostPublishState> {
  await verifyAdminSession();

  const parsed = SocialPostPublishSchema.safeParse({ publishedUrl: formData.get("publishedUrl") ?? "" });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Lien invalide." };
  }

  const post = await db.socialPost.findUnique({ where: { id: postId } });
  if (!post) return { error: "Publication introuvable." };

  await db.socialPost.update({
    where: { id: postId },
    data: {
      status: SOCIAL_POST_STATUS.PUBLIE,
      publishedAt: new Date(),
      publishedUrl: parsed.data.publishedUrl || null,
    },
  });

  revalidateSocialPaths(postId);
  return undefined;
}

export async function deleteSocialPost(postId: string) {
  await verifyAdminSession();

  const post = await db.socialPost.findUnique({ where: { id: postId }, include: { media: true } });
  if (!post) return;

  // Fichiers d'abord : la suppression en base emporte les lignes média en
  // cascade, on perdrait sinon leurs clés de stockage.
  const storage = getStorageAdapter();
  await Promise.all(post.media.map((media) => storage.delete(media.storageKey).catch(() => {})));
  await db.socialPost.delete({ where: { id: postId } });

  revalidateSocialPaths();
  redirect("/admin/reseaux");
}

class InvalidMediaContentError extends Error {
  constructor(readonly fileName: string) {
    super(`Invalid content for ${fileName}`);
    this.name = "InvalidMediaContentError";
  }
}

export async function uploadSocialPostMedia(
  postId: string,
  _prev: FileUploadState,
  formData: FormData,
): Promise<FileUploadState> {
  await verifyAdminSession();

  const files = formData.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Choisissez au moins un fichier." };

  // Validation sur les métadonnées seules, avant de lire le moindre octet en
  // mémoire — même ordre que uploadDeliverable.
  let totalSize = 0;
  for (const file of files) {
    if (file.size > MAX_MEDIA_SIZE) {
      return { error: `"${file.name}" est trop volumineux (${formatFileSize(MAX_MEDIA_SIZE)} maximum par fichier).` };
    }
    if (!ALLOWED_MEDIA_TYPES.has(file.type)) {
      return { error: `"${file.name}" : format non autorisé (JPG, PNG, WEBP ou MP4).` };
    }
    totalSize += file.size;
  }
  if (totalSize > MAX_UPLOAD_TOTAL_SIZE) {
    return {
      error: `Envoi trop volumineux au total (${formatFileSize(totalSize)}, ${formatFileSize(MAX_UPLOAD_TOTAL_SIZE)} maximum) — envoyez-les en plusieurs fois.`,
    };
  }

  const post = await db.socialPost.findUnique({
    where: { id: postId },
    include: { media: { orderBy: { sortOrder: "desc" }, take: 1 } },
  });
  if (!post) return { error: "Publication introuvable." };

  const storage = getStorageAdapter();
  const startOrder = (post.media[0]?.sortOrder ?? -1) + 1;

  try {
    await Promise.all(
      files.map(async (file, index) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        if (!(await contentMatchesDeclaredType(buffer, file.type))) {
          throw new InvalidMediaContentError(file.name);
        }
        const storageKey = `social-posts/${randomUUID()}`;
        await storage.save(storageKey, buffer);
        await db.socialPostMedia.create({
          data: {
            postId,
            fileName: file.name,
            storageKey,
            mimeType: file.type,
            sizeBytes: file.size,
            storageBackend: storage.backend,
            // L'ordre d'envoi fait foi pour un carrousel.
            sortOrder: startOrder + index,
          },
        });
      }),
    );
  } catch (error) {
    if (error instanceof InvalidMediaContentError) {
      return { error: `"${error.fileName}" : le contenu du fichier ne correspond pas à son type déclaré.` };
    }
    console.error("uploadSocialPostMedia failed", error);
    return {
      error:
        "L'envoi a échoué (fichier trop lourd pour la mémoire du serveur, ou problème de stockage). Réessayez avec moins de fichiers à la fois.",
    };
  }

  revalidateSocialPaths(postId);
  return undefined;
}

export async function deleteSocialPostMedia(mediaId: string) {
  await verifyAdminSession();

  const media = await db.socialPostMedia.findUnique({ where: { id: mediaId } });
  if (!media) return;

  await getStorageAdapter().delete(media.storageKey).catch(() => {});
  await db.socialPostMedia.delete({ where: { id: mediaId } });
  revalidateSocialPaths(media.postId);
}

// Réordonne un visuel d'un cran (ordre d'un carrousel) : échange sa position
// avec son voisin plutôt que de renuméroter toute la liste.
export async function moveSocialPostMedia(mediaId: string, direction: "up" | "down") {
  await verifyAdminSession();

  const media = await db.socialPostMedia.findUnique({ where: { id: mediaId } });
  if (!media) return;

  const neighbour = await db.socialPostMedia.findFirst({
    where: {
      postId: media.postId,
      sortOrder: direction === "up" ? { lt: media.sortOrder } : { gt: media.sortOrder },
    },
    orderBy: { sortOrder: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbour) return;

  await db.$transaction([
    db.socialPostMedia.update({ where: { id: media.id }, data: { sortOrder: neighbour.sortOrder } }),
    db.socialPostMedia.update({ where: { id: neighbour.id }, data: { sortOrder: media.sortOrder } }),
  ]);
  revalidateSocialPaths(media.postId);
}

// "Flyer terminé → publication" (livraison 2) : crée un brouillon pour le
// client de la tâche, avec ses livrables **finaux** images/vidéos copiés.
// Copiés et non référencés : les livrables finaux sont purgés quelques
// jours après l'évènement (src/lib/deliverable-purge.ts), une publication
// qui pointerait dessus perdrait ses visuels. Copie un fichier à la fois
// pour ne jamais avoir plusieurs gros fichiers en mémoire en même temps
// (conteneur de 512 Mo).
export async function createSocialPostFromTask(taskId: string) {
  await verifyAdminSession();

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { deliverables: { where: { kind: "final" }, orderBy: { uploadedAt: "asc" } } },
  });
  if (!task) return;

  const usable = task.deliverables
    .filter((item) => ALLOWED_MEDIA_TYPES.has(item.mimeType))
    .slice(0, MAX_SOCIAL_MEDIA_FROM_TASK);
  const images = usable.filter((item) => item.mimeType.startsWith("image/"));
  const format = usable.length > 1 ? "carrousel" : images.length === 0 && usable.length === 1 ? "reel" : "post";

  const post = await db.socialPost.create({
    data: {
      clientId: task.clientId,
      title: task.title,
      networks: ["instagram"],
      format,
      sourceTaskId: task.id,
      // Livrables copiés ci-dessous : la tâche ne doit pas les recopier si
      // elle repasse "Terminé" plus tard.
      taskMediaImportedAt: new Date(),
    },
  });
  await copyTaskDeliverablesToPost(task.id, post.id);

  revalidateSocialPaths();
  revalidatePath(`/admin/taches/${task.id}`);
  redirect(`/admin/reseaux/${post.id}`);
}

// "Demander une création" depuis la fiche d'une publication existante
// (2026-09-18) : tâche interne, jamais visible du client ; ses livrables
// finaux rejoignent la publication quand elle passe "Terminé".
export async function requestSocialPostTask(
  postId: string,
  _prev: SocialPostFormState,
  formData: FormData,
): Promise<SocialPostFormState> {
  const admin = await verifyAdminSession();
  const post = await db.socialPost.findUnique({
    where: { id: postId },
    include: { sourceTask: { select: { status: { select: { slug: true } } } } },
  });
  if (!post) return { error: "Publication introuvable." };
  // Une seule création en cours par publication : une nouvelle demande
  // n'est possible qu'une fois la précédente terminée (ou supprimée).
  if (post.sourceTask && post.sourceTask.status.slug !== TASK_STATUS.TERMINE) {
    return { error: "Une création est déjà en cours pour cette publication." };
  }

  const parsed = SocialTaskRequestSchema.safeParse({
    title: formData.get("title"),
    taskType: formData.get("taskType"),
    dueDate: formData.get("dueDate") ?? "",
    eventDate: formData.get("eventDate") ?? "",
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const result = await createInternalTaskForPost({
    postId,
    clientId: post.clientId,
    adminId: admin.id,
    title: parsed.data.title,
    typeSlug: parsed.data.taskType,
    dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    eventDate: parsed.data.eventDate ? new Date(parsed.data.eventDate) : null,
    description: parsed.data.description || null,
  });
  if ("error" in result) return { error: result.error };

  revalidateSocialPaths(postId);
  revalidatePath("/admin/taches");
  return { saved: true };
}

// Notes internes d'une publication (2026-09-18) — admin uniquement.
export async function addSocialPostNote(
  postId: string,
  _prev: SocialPostFormState,
  formData: FormData,
): Promise<SocialPostFormState> {
  await verifyAdminSession();
  const parsed = SocialPostNoteSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "La note est vide." };
  const post = await db.socialPost.findUnique({ where: { id: postId }, select: { id: true } });
  if (!post) return { error: "Publication introuvable." };

  await db.socialPostNote.create({ data: { postId, body: parsed.data.body } });
  revalidateSocialPaths(postId);
  return { saved: true };
}

export async function deleteSocialPostNote(noteId: string) {
  await verifyAdminSession();
  const note = await db.socialPostNote.findUnique({ where: { id: noteId } });
  if (!note) return;
  await db.socialPostNote.delete({ where: { id: noteId } });
  revalidateSocialPaths(note.postId);
}

// Glisser-déposer dans le calendrier (2026-09-18) : change le jour en
// gardant l'heure de Paris. Même effet qu'une modification de date dans le
// formulaire (rappel "à publier" remis à zéro).
export async function moveSocialPostToDay(postId: string, day: string): Promise<{ error?: string }> {
  await verifyAdminSession();
  const post = await db.socialPost.findUnique({ where: { id: postId } });
  if (!post) return { error: "Publication introuvable." };
  if (!post.scheduledAt) return { error: "Publication sans date." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { error: "Jour invalide." };

  const time = toParisDateTimeLocal(post.scheduledAt).slice(11);
  const scheduledAt = parseParisDateTimeLocal(`${day}T${time}`);
  if (!scheduledAt) return { error: "Jour invalide." };
  if (scheduledAt.getTime() === post.scheduledAt.getTime()) return {};

  await db.socialPost.update({ where: { id: postId }, data: { scheduledAt, reminderSentAt: null } });
  revalidateSocialPaths(postId);
  return {};
}

// Duplication (2026-09-18) : nouveau brouillon "Idée" avec le même contenu
// (textes, variantes, catégorie, réseaux, format) et des **copies** des
// visuels. Ni les notes, ni l'échange avec le client, ni la tâche liée, ni
// le suivi de validation ne sont repris.
export async function duplicateSocialPost(
  postId: string,
  _prev: SocialPostFormState,
  formData: FormData,
): Promise<SocialPostFormState> {
  await verifyAdminSession();
  const source = await db.socialPost.findUnique({
    where: { id: postId },
    include: { media: { orderBy: { sortOrder: "asc" } } },
  });
  if (!source) return { error: "Publication introuvable." };

  const clientId = String(formData.get("clientId") ?? "");
  const client = clientId ? await db.client.findUnique({ where: { id: clientId }, select: { id: true } }) : null;
  if (!client) return { error: "Choisissez un client." };
  const schedule = scheduleFromForm(String(formData.get("scheduledAt") ?? "") || undefined);
  if (!schedule.ok) return { error: "Date de publication invalide." };

  const copy = await db.socialPost.create({
    data: {
      clientId,
      title: source.title,
      networks: source.networks,
      format: source.format,
      caption: source.caption,
      hashtags: source.hashtags,
      captionVariants: source.captionVariants ?? Prisma.DbNull,
      // La catégorie reste valable d'un client à l'autre (liste commune).
      categoryId: source.categoryId,
      scheduledAt: schedule.value,
    },
  });

  const storage = getStorageAdapter();
  for (const media of source.media) {
    try {
      const storageKey = `social-posts/${randomUUID()}`;
      await storage.save(storageKey, await storage.read(media.storageKey));
      await db.socialPostMedia.create({
        data: {
          postId: copy.id,
          fileName: media.fileName,
          storageKey,
          mimeType: media.mimeType,
          sizeBytes: media.sizeBytes,
          storageBackend: storage.backend,
          sortOrder: media.sortOrder,
        },
      });
    } catch (error) {
      console.error("duplicateSocialPost: copie impossible", media.id, error);
    }
  }

  revalidateSocialPaths();
  redirect(`/admin/reseaux/${copy.id}`);
}

// Échange admin ↔ client sur une publication (2026-09-18). Email à l'autre
// partie à chaque message, comme les commentaires de tâche. Côté client,
// seulement sur une publication qui lui est visible.
export async function addSocialPostCommentByAdmin(
  postId: string,
  _prev: SocialPostFormState,
  formData: FormData,
): Promise<SocialPostFormState> {
  const admin = await verifyAdminSession();
  const parsed = SocialPostCommentSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Le message est vide." };

  const post = await db.socialPost.findUnique({
    where: { id: postId },
    include: { client: { include: { contacts: { include: { contact: true } } } } },
  });
  if (!post) return { error: "Publication introuvable." };
  if (!CLIENT_VISIBLE_STATUSES.includes(post.status as SocialPostStatus)) {
    return { error: "Le client ne voit pas encore cette publication : envoyez-la d'abord en validation." };
  }

  await db.socialPostComment.create({
    data: { postId, authorType: "ADMIN", authorId: admin.id, authorName: "Mikko", body: parsed.data.body },
  });
  for (const to of notifiableEmailsFromContacts(post.client.contacts)) {
    await sendEmail({
      trigger: "social_post_comment",
      to,
      subject: `Nouveau message — ${post.title}`,
      html: `
        <p>Mikko a laissé un message sur la publication "${escapeHtml(post.title)}" :</p>
        <blockquote>${escapeHtml(parsed.data.body)}</blockquote>
        <p><a href="${SITE_URL}/espace-client/reseaux">Répondre depuis votre espace client</a></p>
      `,
    });
  }
  revalidateSocialPaths(postId);
  return { saved: true };
}

export async function addSocialPostCommentByClient(
  postId: string,
  _prev: SocialPostFormState,
  formData: FormData,
): Promise<SocialPostFormState> {
  const clientUser = await verifyClientSession();
  assertNotDemo(clientUser);
  const parsed = SocialPostCommentSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Le message est vide." };

  const post = await db.socialPost.findUnique({ where: { id: postId }, include: { client: true } });
  if (
    !post ||
    post.clientId !== clientUser.clientId ||
    !CLIENT_VISIBLE_STATUSES.includes(post.status as SocialPostStatus)
  ) {
    return { error: "Publication introuvable." };
  }

  await db.socialPostComment.create({
    data: {
      postId,
      authorType: "CLIENT_USER",
      authorId: clientUser.id,
      authorName: clientUser.name,
      body: parsed.data.body,
    },
  });
  for (const to of await getAdminEmails()) {
    await sendEmail({
      trigger: "social_post_comment",
      to,
      subject: `Message de ${clientUser.name} — ${post.title} (${post.client.name})`,
      html: `
        <p>${escapeHtml(clientUser.name)} a laissé un message sur "${escapeHtml(post.title)}" (${escapeHtml(post.client.name)}) :</p>
        <blockquote>${escapeHtml(parsed.data.body)}</blockquote>
        <p><a href="${SITE_URL}/admin/reseaux/${post.id}">Ouvrir la publication</a></p>
      `,
    });
  }
  revalidateSocialPaths(postId);
  return { saved: true };
}

// Lien ajouté après coup à une publication déjà marquée publiée
// (2026-09-18, "rappel du lien publié") : le lien est ici obligatoire, et
// la date de publication d'origine est conservée.
export async function setSocialPostPublishedUrl(
  postId: string,
  _prev: SocialPostPublishState,
  formData: FormData,
): Promise<SocialPostPublishState> {
  await verifyAdminSession();
  const parsed = SocialPostPublishSchema.safeParse({ publishedUrl: formData.get("publishedUrl") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Lien invalide." };
  if (!parsed.data.publishedUrl) return { error: "Collez le lien du post." };

  const post = await db.socialPost.findUnique({ where: { id: postId } });
  if (!post || post.status !== SOCIAL_POST_STATUS.PUBLIE) return { error: "Publication introuvable ou pas encore publiée." };

  await db.socialPost.update({ where: { id: postId }, data: { publishedUrl: parsed.data.publishedUrl } });
  revalidateSocialPaths(postId);
  return undefined;
}
