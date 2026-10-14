import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { GalleryForm } from "@/components/admin/gallery-form";
import { createGallery } from "@/lib/actions/portfolio";
import { PageToolbar, PAGE_BODY } from "@/components/admin/page-toolbar";

export const metadata: Metadata = {
  title: "Nouvelle galerie — Admin Mikko Visuel",
};

export default async function NewGalleryPage({
  params,
}: {
  params: Promise<{ pillarId: string }>;
}) {
  await verifyAdminSession();
  const { pillarId } = await params;

  const pillar = await db.portfolioPillar.findUnique({ where: { id: pillarId } });
  if (!pillar) notFound();

  const createGalleryForThisPillar = createGallery.bind(null, pillarId);

  return (
    <>
      <PageToolbar title="Nouvelle galerie" back={{ href: `/admin/portfolio/${pillarId}`, label: `Retour à ${pillar.title}` }} />
      <div className={PAGE_BODY}>
        <div className="mt-8">
          <GalleryForm action={createGalleryForThisPillar} submitLabel="Créer la galerie" />
        </div>
      </div>
    </>
  );
}
