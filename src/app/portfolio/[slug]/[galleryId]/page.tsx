import type { Metadata } from "next";
import { cache } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { db } from "@/lib/db";
import { resolveItemSrc } from "@/lib/portfolio-media";
import { PortfolioVideo } from "@/components/portfolio-video";

const getGallery = cache((galleryId: string) =>
  db.portfolioGallery.findUnique({
    where: { id: galleryId },
    include: { pillar: true, items: { orderBy: { sortOrder: "asc" } } },
  }),
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; galleryId: string }>;
}): Promise<Metadata> {
  const { galleryId } = await params;
  const gallery = await getGallery(galleryId);
  if (!gallery) return {};
  return {
    title: `${gallery.title} — ${gallery.pillar.title} — Mikko Visuel`,
    description: gallery.textBefore ?? gallery.pillar.description,
  };
}

// Page galerie (2026-08-16, façon Adobe Portfolio) : texte de présentation
// avant les médias, puis les photos/vidéos empilées à leur propre format,
// puis un texte de conclusion — chacun facultatif et indépendant.
export default async function GalleryPage({
  params,
}: {
  params: Promise<{ slug: string; galleryId: string }>;
}) {
  const { slug, galleryId } = await params;

  const gallery = await getGallery(galleryId);
  if (!gallery || gallery.pillar.slug !== slug) notFound();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <Link
              href={`/portfolio/${slug}`}
              className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
            >
              <ArrowLeft size={16} weight="regular" />
              Retour à {gallery.pillar.title}
            </Link>

            <h1 className="mt-6 font-display text-3xl font-medium tracking-tight text-ink sm:text-5xl">
              {gallery.title}
            </h1>

            {gallery.textBefore && (
              <p className="mt-6 whitespace-pre-line text-base leading-relaxed text-ink-muted">
                {gallery.textBefore}
              </p>
            )}

            {gallery.items.length > 0 && (
              <div className="mt-10 flex flex-col gap-6">
                {gallery.items.map((item) => {
                  const isUploadedVideo =
                    item.mediaType === "video" && item.mimeType?.startsWith("video/");
                  const aspectClass = item.aspectRatio === "9:16" ? "aspect-[9/16]" : "aspect-[3/4]";
                  return (
                    <div
                      key={item.id}
                      className={`relative ${aspectClass} overflow-hidden rounded-2xl border border-line`}
                    >
                      {isUploadedVideo ? (
                        <PortfolioVideo
                          src={resolveItemSrc(item)}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <Image
                          src={resolveItemSrc(item)}
                          alt={item.title}
                          fill
                          sizes="(min-width: 768px) 768px, 100vw"
                          className="object-cover"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {gallery.textAfter && (
              <p className="mt-10 whitespace-pre-line text-base leading-relaxed text-ink-muted">
                {gallery.textAfter}
              </p>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
