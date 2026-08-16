import type { Metadata } from "next";
import { cache } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Image as ImageIcon } from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { db } from "@/lib/db";
import { resolveGalleryCoverSrc } from "@/lib/portfolio-media";

// Perf (2026-08-16) : `generateMetadata` et le composant de page
// interrogeaient chacun le pilier séparément — deux requêtes pour la même
// donnée sur chaque vue publique. `cache()` déduplique dans le cadre d'une
// même requête (voir aussi src/lib/homepage-data.ts, même pattern).
const getPillarWithGalleries = cache((slug: string) =>
  db.portfolioPillar.findUnique({
    where: { slug },
    include: {
      galleries: {
        orderBy: { sortOrder: "asc" },
        include: { items: { orderBy: { sortOrder: "asc" }, take: 1 } },
      },
    },
  }),
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pillar = await getPillarWithGalleries(slug);
  if (!pillar) return {};
  return {
    title: `${pillar.title} — Mikko Visuel`,
    description: pillar.description,
  };
}

// Page pilier (refonte "galeries" du 2026-08-16) : liste les galeries
// (projets) du pilier comme des cartes façon Adobe Portfolio, chacune
// menant à sa propre page avec texte de présentation + médias. Remplace
// l'ancienne grille plate de photos/vidéos avec filtre Tous/Photos/Vidéos —
// une galerie mélange déjà librement ses propres médias, ce filtre n'avait
// plus vraiment de sens à ce niveau.
export default async function PillarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const pillar = await getPillarWithGalleries(slug);
  if (!pillar) notFound();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Link
              href="/#portfolio"
              className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
            >
              <ArrowLeft size={16} weight="regular" />
              Retour au portfolio
            </Link>

            <h1 className="mt-6 font-display text-3xl font-medium tracking-tight text-ink sm:text-5xl">
              {pillar.title}
            </h1>
            <p className="mt-4 max-w-[55ch] text-base text-ink-muted">{pillar.description}</p>

            {pillar.galleries.length > 0 ? (
              <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {pillar.galleries.map((gallery) => {
                  const cover = resolveGalleryCoverSrc(gallery);
                  return (
                    <Link
                      key={gallery.id}
                      href={`/portfolio/${pillar.slug}/${gallery.id}`}
                      className="group block overflow-hidden rounded-2xl border border-line"
                    >
                      <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden bg-surface-elevated">
                        {cover ? (
                          <Image
                            src={cover}
                            alt={gallery.title}
                            fill
                            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                          />
                        ) : (
                          <ImageIcon size={32} weight="regular" className="text-ink-muted" />
                        )}
                      </div>
                      <div className="p-4">
                        <p className="font-display text-lg font-medium text-ink">{gallery.title}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="mt-10 text-sm text-ink-muted">
                Aucune galerie pour le moment dans ce pilier.
              </p>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
