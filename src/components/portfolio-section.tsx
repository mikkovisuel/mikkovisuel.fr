import { db } from "@/lib/db";
import { resolveCoverSrc } from "@/lib/portfolio-media";
import { PortfolioGrid } from "./portfolio-grid";

export async function PortfolioSection() {
  const pillars = await db.portfolioPillar.findMany({ orderBy: { sortOrder: "asc" } });

  const resolved = pillars.map((pillar) => ({
    id: pillar.id,
    slug: pillar.slug,
    title: pillar.title,
    description: pillar.description,
    order: pillar.sortOrder,
    cover: resolveCoverSrc(pillar),
  }));

  return (
    <section id="portfolio" className="scroll-mt-16 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <span aria-hidden className="mb-4 block h-1.5 w-10 rounded-full bg-brand-purple" />
        <h2 className="max-w-xl font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          Cinq façons de travailler une soirée
        </h2>
        <p className="mt-4 max-w-[55ch] text-base text-ink-muted">
          Chaque pilier peut être filtré ou étendu depuis le backend, sans
          jamais toucher au code.
        </p>
        <div className="mt-12">
          <PortfolioGrid pillars={resolved} />
        </div>
      </div>
    </section>
  );
}
