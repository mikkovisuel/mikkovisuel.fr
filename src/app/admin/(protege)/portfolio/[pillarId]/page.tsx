import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { PillarForm } from "@/components/admin/pillar-form";
import { PortfolioGalleryRow } from "@/components/admin/portfolio-gallery-row";
import { DeleteButton } from "@/components/admin/delete-button";
import { updatePillar, deletePillar } from "@/lib/actions/portfolio";

export const metadata: Metadata = {
  title: "Pilier — Admin Mikko Visuel",
};

export default async function PillarDetailPage({
  params,
}: {
  params: Promise<{ pillarId: string }>;
}) {
  await verifyAdminSession();
  const { pillarId } = await params;

  const pillar = await db.portfolioPillar.findUnique({
    where: { id: pillarId },
    include: {
      galleries: {
        orderBy: { sortOrder: "asc" },
        include: {
          items: { orderBy: { sortOrder: "asc" }, take: 1 },
          _count: { select: { items: true } },
        },
      },
    },
  });

  if (!pillar) notFound();

  const updateThisPillar = updatePillar.bind(null, pillar.id);
  const deleteThisPillar = deletePillar.bind(null, pillar.id);

  return (
    <div className="mx-auto max-w-7xl 2xl:max-w-[100rem] px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/admin/portfolio"
        className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} weight="regular" />
        Retour au portfolio
      </Link>

      <h1 className="mt-4 font-display text-2xl font-medium tracking-tight text-ink">
        {pillar.title}
      </h1>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-ink-muted">Informations</h2>
        <div className="mt-4">
          <PillarForm
            action={updateThisPillar}
            defaultValues={{ title: pillar.title, description: pillar.description }}
            submitLabel="Enregistrer"
            coverRequired={false}
          />
        </div>
      </section>

      {/* Galeries (demande du 2026-08-16) : chaque galerie est un projet
          présenté façon Adobe Portfolio (texte avant/après ses médias), sur
          sa propre page — voir /admin/portfolio/[pillarId]/[galleryId]. */}
      <section className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink-muted">
            Galeries ({pillar.galleries.length})
          </h2>
          <Link
            href={`/admin/portfolio/${pillar.id}/nouveau`}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
          >
            <Plus size={16} weight="bold" />
            Nouvelle galerie
          </Link>
        </div>

        {pillar.galleries.length > 0 ? (
          <div className="mt-4 divide-y divide-line rounded-2xl border border-line">
            {pillar.galleries.map((gallery, index) => (
              <PortfolioGalleryRow
                key={gallery.id}
                gallery={gallery}
                pillarId={pillar.id}
                isFirst={index === 0}
                isLast={index === pillar.galleries.length - 1}
              />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink-muted">
            Aucune galerie pour le moment. Créez-en une pour commencer à ajouter des photos et
            vidéos.
          </p>
        )}
      </section>

      <section className="mt-12 border-t border-line pt-8">
        <DeleteButton
          action={deleteThisPillar}
          confirmMessage={`Supprimer définitivement le pilier "${pillar.title}" et toutes ses galeries ?`}
          label="Supprimer ce pilier"
        />
      </section>
    </div>
  );
}
