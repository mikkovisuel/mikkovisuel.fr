import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { ACTIVE_CLIENTS } from "@/lib/clients";
import { SocialPostForm } from "@/components/admin/social-post-form";
import { createSocialPost } from "@/lib/actions/social-posts";
import { loadSocialLibraries } from "@/lib/social-library";
import { SOCIAL_FORMATS, SOCIAL_NETWORKS, parseParisDateTimeLocal } from "@/lib/social-posts";

export const metadata: Metadata = {
  title: "Nouvelle publication — Admin Mikko Visuel",
};

export default async function NewSocialPostPage({
  searchParams,
}: {
  // Pré-remplissage possible par l'URL — utilisé par le lien des rappels de
  // créneaux récurrents (src/lib/social-post-reminders.ts). Toute valeur
  // inconnue est ignorée plutôt que refusée.
  searchParams: Promise<{ clientId?: string; titre?: string; format?: string; reseaux?: string; date?: string }>;
}) {
  await verifyAdminSession();
  const { clientId, titre, format, reseaux, date } = await searchParams;
  const prefilledNetworks = (reseaux ?? "")
    .split(",")
    .filter((slug) => SOCIAL_NETWORKS.some((network) => network.slug === slug));

  const clients = await db.client.findMany({
    where: ACTIVE_CLIENTS,
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const libraries = await loadSocialLibraries(clients.map((client) => client.id));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/admin/reseaux"
        className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} weight="regular" />
        Retour aux réseaux sociaux
      </Link>
      <h1 className="mt-4 font-display text-2xl font-medium tracking-tight text-ink">Nouvelle publication</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Les visuels s&apos;ajoutent juste après, sur la fiche de la publication.
      </p>
      <div className="mt-8">
        <SocialPostForm
          action={createSocialPost}
          clients={clients}
          defaultValues={{
            clientId: clients.some((client) => client.id === clientId) ? clientId : undefined,
            title: (titre ?? "").slice(0, 160),
            networks: prefilledNetworks.length > 0 ? prefilledNetworks : ["instagram"],
            format: SOCIAL_FORMATS.some((item) => item.slug === format) ? format! : "post",
            caption: "",
            hashtags: "",
            scheduledAt: parseParisDateTimeLocal(date) ? date! : "",
          }}
          libraries={libraries}
          submitLabel="Créer la publication"
        />
      </div>
    </div>
  );
}
