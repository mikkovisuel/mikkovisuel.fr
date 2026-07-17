import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { PillarForm } from "@/components/admin/pillar-form";
import { MediaItemUploadForm } from "@/components/admin/media-item-upload-form";
import { PortfolioItemRow } from "@/components/admin/portfolio-item-row";
import { DeleteButton } from "@/components/admin/delete-button";
import { updatePillar, deletePillar, createMediaItem } from "@/lib/actions/portfolio";

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
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  if (!pillar) notFound();

  const updateThisPillar = updatePillar.bind(null, pillar.id);
  const deleteThisPillar = deletePillar.bind(null, pillar.id);
  const createItemForThisPillar = createMediaItem.bind(null, pillar.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
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

      <section className="mt-12">
        <h2 className="text-sm font-medium text-ink-muted">
          Photos / vidéos ({pillar.items.length})
        </h2>

        {pillar.items.length > 0 && (
          <div className="mt-4 divide-y divide-line rounded-2xl border border-line">
            {pillar.items.map((item, index) => (
              <PortfolioItemRow
                key={item.id}
                item={item}
                pillarId={pillar.id}
                isFirst={index === 0}
                isLast={index === pillar.items.length - 1}
              />
            ))}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-line p-6">
          <MediaItemUploadForm action={createItemForThisPillar} />
        </div>
      </section>

      <section className="mt-12 border-t border-line pt-8">
        <DeleteButton
          action={deleteThisPillar}
          confirmMessage={`Supprimer définitivement le pilier "${pillar.title}" et tous ses éléments ?`}
          label="Supprimer ce pilier"
        />
      </section>
    </div>
  );
}
