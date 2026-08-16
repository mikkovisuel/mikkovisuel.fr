import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { GalleryForm } from "@/components/admin/gallery-form";
import { createGallery } from "@/lib/actions/portfolio";

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
    <div className="mx-auto max-w-7xl 2xl:max-w-[100rem] px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href={`/admin/portfolio/${pillarId}`}
        className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} weight="regular" />
        Retour à {pillar.title}
      </Link>
      <h1 className="mt-4 font-display text-2xl font-medium tracking-tight text-ink">
        Nouvelle galerie
      </h1>
      <div className="mt-8">
        <GalleryForm action={createGalleryForThisPillar} submitLabel="Créer la galerie" />
      </div>
    </div>
  );
}
