import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { GalleryForm } from "@/components/admin/gallery-form";
import { MediaItemUploadForm } from "@/components/admin/media-item-upload-form";
import { PortfolioItemRow } from "@/components/admin/portfolio-item-row";
import { DeleteButton } from "@/components/admin/delete-button";
import { updateGallery, deleteGallery, createMediaItem } from "@/lib/actions/portfolio";
import { resolveGalleryCoverSrc } from "@/lib/portfolio-media";
import { PageToolbar, PAGE_BODY } from "@/components/admin/page-toolbar";

export const metadata: Metadata = {
  title: "Galerie — Admin Mikko Visuel",
};

export default async function GalleryDetailPage({
  params,
}: {
  params: Promise<{ pillarId: string; galleryId: string }>;
}) {
  await verifyAdminSession();
  const { pillarId, galleryId } = await params;

  const gallery = await db.portfolioGallery.findUnique({
    where: { id: galleryId },
    include: { items: { orderBy: { sortOrder: "asc" } }, pillar: true },
  });

  if (!gallery || gallery.pillarId !== pillarId) notFound();

  const updateThisGallery = updateGallery.bind(null, gallery.id);
  const deleteThisGallery = deleteGallery.bind(null, gallery.id, pillarId);
  const createItemForThisGallery = createMediaItem.bind(null, gallery.id);

  return (
    <>
      <PageToolbar
        title={gallery.title}
        back={{ href: `/admin/portfolio/${pillarId}`, label: `Retour à ${gallery.pillar.title}` }}
      />
      <div className={PAGE_BODY}>
        <section className="mt-8">
          <h2 className="text-sm font-medium text-ink-muted">Informations</h2>
          <div className="mt-4">
            <GalleryForm
              action={updateThisGallery}
              defaultValues={{
                title: gallery.title,
                textBefore: gallery.textBefore ?? "",
                textAfter: gallery.textAfter ?? "",
              }}
              coverSrc={resolveGalleryCoverSrc(gallery)}
              submitLabel="Enregistrer"
            />
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-sm font-medium text-ink-muted">
            Photos / vidéos ({gallery.items.length})
          </h2>

          {gallery.items.length > 0 && (
            <div className="mt-4 divide-y divide-line rounded-2xl border border-line">
              {gallery.items.map((item, index) => (
                <PortfolioItemRow
                  key={item.id}
                  item={item}
                  galleryId={gallery.id}
                  isFirst={index === 0}
                  isLast={index === gallery.items.length - 1}
                />
              ))}
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-line p-6">
            <MediaItemUploadForm action={createItemForThisGallery} />
          </div>
        </section>

        <section className="mt-12 border-t border-line pt-8">
          <DeleteButton
            action={deleteThisGallery}
            confirmMessage={`Supprimer définitivement la galerie "${gallery.title}" et tous ses éléments ?`}
            label="Supprimer cette galerie"
          />
        </section>
      </div>
    </>
  );
}
