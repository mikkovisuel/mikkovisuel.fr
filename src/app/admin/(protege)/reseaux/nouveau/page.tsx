import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { ACTIVE_CLIENTS } from "@/lib/clients";
import { SocialPostForm } from "@/components/admin/social-post-form";
import { createSocialPost } from "@/lib/actions/social-posts";

export const metadata: Metadata = {
  title: "Nouvelle publication — Admin Mikko Visuel",
};

export default async function NewSocialPostPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  await verifyAdminSession();
  const { clientId } = await searchParams;

  const clients = await db.client.findMany({
    where: ACTIVE_CLIENTS,
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

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
            title: "",
            networks: ["instagram"],
            format: "post",
            caption: "",
            hashtags: "",
            scheduledAt: "",
          }}
          submitLabel="Créer la publication"
        />
      </div>
    </div>
  );
}
