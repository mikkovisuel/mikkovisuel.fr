import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { resolveCoverSrc } from "@/lib/portfolio-media";
import { resolveHeroMainSrc, resolveHeroDetailSrc } from "@/lib/homepage-hero";
import { resolveHomepageContent } from "@/lib/homepage-content";
import { HomepageHeroForm } from "@/components/admin/homepage-hero-form";
import { HomepageContentForm } from "@/components/admin/homepage-content-form";

export const metadata: Metadata = {
  title: "Portfolio — Admin Mikko Visuel",
};

export default async function AdminPortfolioPage() {
  await verifyAdminSession();

  const [pillars, hero, content] = await Promise.all([
    db.portfolioPillar.findMany({
      include: { _count: { select: { galleries: true } } },
      orderBy: { sortOrder: "asc" },
    }),
    db.homepageHero.findUnique({ where: { id: "hero" } }),
    db.homepageContent.findUnique({ where: { id: "homepage" } }),
  ]);
  const resolvedContent = resolveHomepageContent(content);

  return (
    <div className="mx-auto max-w-7xl 2xl:max-w-[100rem] px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Portfolio</h1>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-ink-muted">Page d&rsquo;accueil</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Les deux photos affichées sous le bouton « Voir le travail ».
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-6">
          <div className="relative aspect-[4/3] w-48 shrink-0 overflow-hidden rounded-xl border border-line">
            <Image src={resolveHeroMainSrc(hero)} alt="Image principale du Hero" fill sizes="192px" className="object-cover" />
          </div>
          <div className="relative aspect-[3/4] w-32 shrink-0 overflow-hidden rounded-xl border border-line">
            <Image src={resolveHeroDetailSrc(hero)} alt="Image de détail du Hero" fill sizes="128px" className="object-cover" />
          </div>
        </div>
        <div className="mt-6">
          <HomepageHeroForm />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-sm font-medium text-ink-muted">Textes de l&rsquo;accueil</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Le titre principal et le bouton du Hero, ainsi que l&rsquo;intitulé
          de la section portfolio.
        </p>
        <div className="mt-4">
          <HomepageContentForm defaultValues={resolvedContent} />
        </div>
      </section>

      <div className="mt-12 flex items-center justify-between">
        <h2 className="text-sm font-medium text-ink-muted">Piliers</h2>
        <Link
          href="/admin/portfolio/nouveau"
          className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
        >
          <Plus size={16} weight="bold" />
          Nouveau pilier
        </Link>
      </div>

      <div className="mt-4 divide-y divide-line rounded-2xl border border-line">
        {pillars.map((pillar) => {
          const src = resolveCoverSrc(pillar);
          return (
            <Link
              key={pillar.id}
              href={`/admin/portfolio/${pillar.id}`}
              className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-surface-elevated"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-line">
                {src && <Image src={src} alt={pillar.title} fill sizes="56px" className="object-cover" />}
              </div>
              <div>
                <p className="font-medium text-ink">{pillar.title}</p>
                <p className="mt-0.5 text-sm text-ink-muted">
                  {pillar._count.galleries} galerie{pillar._count.galleries > 1 ? "s" : ""}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
