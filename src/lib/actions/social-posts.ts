"use server";

import { randomUUID } from "node:crypto";
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
  SOCIAL_POST_STATUS,
  formatSchedule,
  parseParisDateTimeLocal,
  type SocialPostStatus,
} from "@/lib/social-posts";
import {
  SocialPostSchema,
  SocialPostRefusalSchema,
  SocialPostPublishSchema,
  type SocialPostFormState,
  type SocialPostRefusalState,
  type SocialPostPublishState,
} from "@/lib/validation/social-post";
import type { FileUploadState } from "@/lib/actions/files";

// Module Community management — voir la section 4 de CAHIER_DES_CHARGES.md.
// Le cycle et ses règles de visibilité sont dans src/lib/social-posts.ts.

// Mêmes plafonds que les livrables (src/lib/actions/files.ts), pour la même
// raison : ils sont dictés par la mémoire réelle du conteneur (512 Mo), pas
// par une préférence. Un reel de plus de 50 Mo ne passera donc pas en V1.
const MAX_MEDIA_SIZE = 50 * 1024 * 1024;
const MAX_UPLOAD_TOTAL_SIZE = 80 * 1024 * 1024;
const ALLOWED_MEDIA_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "video/mp4"]);

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

export async function createSocialPost(
  _prev: SocialPostFormState,
  formData: FormData,
): Promise<SocialPostFormState> {
  await verifyAdminSession();

  const clientId = String(formData.get("clientId") ?? "");
  const client = clientId ? await db.client.findUnique({ where: { id: clientId } }) : null;
  if (!client) return { error: "Choisissez un client." };

  const parsed = parseSocialPostForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const schedule = scheduleFromForm(parsed.data.scheduledAt);
  if (!schedule.ok) return { error: "Date de publication invalide." };

  const post = await db.socialPost.create({
    data: {
      clientId,
      title: parsed.data.title,
      networks: parsed.data.networks,
      format: parsed.data.format,
      caption: parsed.data.caption || null,
      hashtags: parsed.data.hashtags || null,
      scheduledAt: schedule.value,
    },
  });

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

// Nombre maximum de visuels repris d'une tâche : la limite d'un carrousel
// Instagram la plus répandue. Au-delà, l'admin ajoute le reste à la main.
const MAX_MEDIA_FROM_TASK = 10;

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

  const usable = task.deliverables.filter((item) => ALLOWED_MEDIA_TYPES.has(item.mimeType)).slice(0, MAX_MEDIA_FROM_TASK);
  const images = usable.filter((item) => item.mimeType.startsWith("image/"));
  const format = usable.length > 1 ? "carrousel" : images.length === 0 && usable.length === 1 ? "reel" : "post";

  const post = await db.socialPost.create({
    data: {
      clientId: task.clientId,
      title: task.title,
      networks: ["instagram"],
      format,
      sourceTaskId: task.id,
    },
  });

  const storage = getStorageAdapter();
  for (const [index, deliverable] of usable.entries()) {
    try {
      const buffer = await storage.read(deliverable.storageKey);
      const storageKey = `social-posts/${randomUUID()}`;
      await storage.save(storageKey, buffer);
      await db.socialPostMedia.create({
        data: {
          postId: post.id,
          fileName: deliverable.fileName,
          storageKey,
          mimeType: deliverable.mimeType,
          sizeBytes: deliverable.sizeBytes,
          storageBackend: storage.backend,
          sortOrder: index,
        },
      });
    } catch (error) {
      // Un livrable illisible (déjà purgé, stockage indisponible) ne doit pas
      // empêcher de créer la publication : les autres visuels sont repris, le
      // manquant s'ajoute à la main.
      console.error("createSocialPostFromTask: copie impossible", deliverable.id, error);
    }
  }

  revalidateSocialPaths();
  revalidatePath(`/admin/taches/${task.id}`);
  redirect(`/admin/reseaux/${post.id}`);
}
