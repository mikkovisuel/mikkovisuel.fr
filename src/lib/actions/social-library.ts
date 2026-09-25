"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/dal";
import {
  SocialProfileSchema,
  SocialLibraryItemSchema,
  SocialMonthlyStatsSchema,
  SocialCaptionRequestSchema,
  type SocialLibraryFormState,
} from "@/lib/validation/social-library";
import { suggestCaption, type CaptionSuggestion } from "@/lib/social-caption-ai";

// Réglages "réseaux sociaux" d'un client (livraison 2 du module Community
// management) : ligne éditoriale et ton, bibliothèque de hashtags et de
// modèles, créneaux récurrents, chiffres mensuels du rapport. Tout est
// réservé à l'admin — rien de tout ça n'est visible côté client.

function revalidateClientSettings(clientId: string) {
  revalidatePath(`/admin/reseaux/clients/${clientId}`);
  revalidatePath("/admin/reseaux", "layout");
}

async function clientExists(clientId: string) {
  return Boolean(await db.client.findUnique({ where: { id: clientId }, select: { id: true } }));
}

export async function saveSocialProfile(
  clientId: string,
  _prev: SocialLibraryFormState,
  formData: FormData,
): Promise<SocialLibraryFormState> {
  await verifyAdminSession();
  if (!(await clientExists(clientId))) return { error: "Client introuvable." };

  const parsed = SocialProfileSchema.safeParse({
    editorialLine: formData.get("editorialLine") ?? undefined,
    brandTone: formData.get("brandTone") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const data = {
    editorialLine: parsed.data.editorialLine || null,
    brandTone: parsed.data.brandTone || null,
  };
  await db.socialClientProfile.upsert({ where: { clientId }, create: { clientId, ...data }, update: data });

  revalidateClientSettings(clientId);
  return { saved: true };
}

export async function addSocialLibraryItem(
  clientId: string,
  kind: "hashtags" | "template",
  _prev: SocialLibraryFormState,
  formData: FormData,
): Promise<SocialLibraryFormState> {
  await verifyAdminSession();
  if (!(await clientExists(clientId))) return { error: "Client introuvable." };

  const parsed = SocialLibraryItemSchema.safeParse({
    kind,
    name: formData.get("name"),
    content: formData.get("content"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  await db.socialLibraryItem.create({ data: { clientId, ...parsed.data } });
  revalidateClientSettings(clientId);
  return { saved: true };
}

export async function deleteSocialLibraryItem(itemId: string) {
  await verifyAdminSession();
  const item = await db.socialLibraryItem.findUnique({ where: { id: itemId } });
  if (!item) return;
  await db.socialLibraryItem.delete({ where: { id: itemId } });
  revalidateClientSettings(item.clientId);
}

// Une saisie par client et par mois : enregistrer un mois déjà saisi le
// met à jour plutôt que de créer un doublon (contrainte unique en base).
export async function saveMonthlyStats(
  clientId: string,
  _prev: SocialLibraryFormState,
  formData: FormData,
): Promise<SocialLibraryFormState> {
  await verifyAdminSession();
  if (!(await clientExists(clientId))) return { error: "Client introuvable." };

  const parsed = SocialMonthlyStatsSchema.safeParse({
    year: formData.get("year"),
    month: formData.get("month"),
    followers: formData.get("followers") ?? "",
    reach: formData.get("reach") ?? "",
    interactions: formData.get("interactions") ?? "",
    notes: formData.get("notes") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  const { year, month, ...values } = parsed.data;
  const data = { ...values, notes: values.notes || null };
  await db.socialMonthlyStats.upsert({
    where: { clientId_year_month: { clientId, year, month } },
    create: { clientId, year, month, ...data },
    update: data,
  });

  revalidateClientSettings(clientId);
  return { saved: true };
}

export async function deleteMonthlyStats(statsId: string) {
  await verifyAdminSession();
  const stats = await db.socialMonthlyStats.findUnique({ where: { id: statsId } });
  if (!stats) return;
  await db.socialMonthlyStats.delete({ where: { id: statsId } });
  revalidateClientSettings(stats.clientId);
}

// Rédaction assistée d'une légende (bouton "Proposer avec l'IA" du
// formulaire de publication). Appelée avec l'état courant du formulaire,
// pas encore enregistré ; ne modifie rien en base.
export async function suggestSocialCaption(input: {
  clientId: string;
  title: string;
  format: string;
  networks: string[];
  draft: string;
}): Promise<{ suggestion?: CaptionSuggestion; error?: string }> {
  await verifyAdminSession();
  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "ANTHROPIC_API_KEY n'est pas configurée — rédaction assistée indisponible." };
  }

  const parsed = SocialCaptionRequestSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Demande invalide." };

  const client = await db.client.findUnique({
    where: { id: parsed.data.clientId },
    select: {
      name: true,
      socialProfile: { select: { editorialLine: true, brandTone: true } },
      socialLibrary: { where: { kind: "hashtags" }, select: { name: true, content: true } },
    },
  });
  if (!client) return { error: "Client introuvable." };

  try {
    const suggestion = await suggestCaption({
      clientName: client.name,
      editorialLine: client.socialProfile?.editorialLine ?? null,
      brandTone: client.socialProfile?.brandTone ?? null,
      title: parsed.data.title,
      format: parsed.data.format,
      networks: parsed.data.networks,
      draft: parsed.data.draft,
      hashtagSets: client.socialLibrary,
    });
    return { suggestion };
  } catch (error) {
    return { error: `Proposition IA impossible : ${error instanceof Error ? error.message : "erreur inconnue"}.` };
  }
}

/** Corriger un groupe de hashtags ou un modèle de texte (2026-09-25). */
export async function updateSocialLibraryItem(
  itemId: string,
  _prev: SocialLibraryFormState,
  formData: FormData,
): Promise<SocialLibraryFormState> {
  await verifyAdminSession();
  const item = await db.socialLibraryItem.findUnique({ where: { id: itemId } });
  if (!item) return { error: "Élément introuvable." };

  const parsed = SocialLibraryItemSchema.safeParse({
    kind: item.kind,
    name: formData.get("name"),
    content: formData.get("content"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };

  await db.socialLibraryItem.update({
    where: { id: itemId },
    data: { name: parsed.data.name, content: parsed.data.content },
  });
  revalidateClientSettings(item.clientId);
  return { saved: true };
}
