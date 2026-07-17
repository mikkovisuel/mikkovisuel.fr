import { db } from "@/lib/db";
import { resolveHeroMainSrc, resolveHeroDetailSrc } from "@/lib/homepage-hero";
import { HeroVisual } from "./hero-visual";

export async function Hero() {
  const hero = await db.homepageHero.findUnique({ where: { id: "hero" } });
  const mainSrc = resolveHeroMainSrc(hero);
  const detailSrc = resolveHeroDetailSrc(hero);

  return (
    <section className="relative overflow-hidden pt-16 pb-20 sm:pt-20 sm:pb-28 lg:pt-24 lg:pb-32">
      <div className="mx-auto grid max-w-7xl gap-16 px-4 sm:px-6 lg:grid-cols-12 lg:items-center lg:gap-8 lg:px-8">
        <div className="lg:col-span-5">
          <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Une direction artistique qui donne de l&apos;allure à vos événements.
          </h1>
          <p className="mt-6 max-w-[42ch] text-base leading-relaxed text-ink-muted">
            Flyers, motion design, photo et vidéo pour les clubs et les
            marques qui veulent sortir du lot.
          </p>
          <div className="mt-8">
            <a
              href="#portfolio"
              className="inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
            >
              Voir le travail
            </a>
          </div>
        </div>
        <div className="lg:col-span-7">
          <HeroVisual mainSrc={mainSrc} detailSrc={detailSrc} />
        </div>
      </div>
    </section>
  );
}
