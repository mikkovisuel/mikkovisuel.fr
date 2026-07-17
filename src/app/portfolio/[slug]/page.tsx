import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PlayCircle } from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { db } from "@/lib/db";
import { resolveItemSrc } from "@/lib/portfolio-media";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pillar = await db.portfolioPillar.findUnique({ where: { slug } });
  if (!pillar) return {};
  return {
    title: `${pillar.title} — Mikko Visuel`,
    description: pillar.description,
  };
}

const FILTERS = [
  { value: undefined, label: "Tous" },
  { value: "image", label: "Photos" },
  { value: "video", label: "Vidéos" },
] as const;

export default async function PillarPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { slug } = await params;
  const { type } = await searchParams;

  const pillar = await db.portfolioPillar.findUnique({
    where: { slug },
    include: {
      items: {
        where: type === "image" || type === "video" ? { mediaType: type } : undefined,
        orderBy: { sortOrder: "asc" },
      },
    },
  });
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
            <p className="mt-4 max-w-[55ch] text-base text-ink-muted">
              {pillar.description}
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              {FILTERS.map((filter) => {
                const href = filter.value
                  ? `/portfolio/${pillar.slug}?type=${filter.value}`
                  : `/portfolio/${pillar.slug}`;
                const active = (type ?? undefined) === filter.value;
                return (
                  <Link
                    key={filter.label}
                    href={href}
                    className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                      active
                        ? "border-accent bg-accent text-accent-ink"
                        : "border-line text-ink-muted hover:text-ink"
                    }`}
                  >
                    {filter.label}
                  </Link>
                );
              })}
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
              {pillar.items.map((item) => {
                const isUploadedVideo =
                  item.mediaType === "video" && item.mimeType?.startsWith("video/");
                const aspectClass = item.aspectRatio === "9:16" ? "aspect-[9/16]" : "aspect-[3/4]";
                return (
                  <div
                    key={item.id}
                    className={`group relative ${aspectClass} overflow-hidden rounded-2xl border border-line`}
                  >
                    {isUploadedVideo ? (
                      <video
                        src={resolveItemSrc(item)}
                        controls
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <>
                        <Image
                          src={resolveItemSrc(item)}
                          alt={item.title}
                          fill
                          sizes="(min-width: 768px) 33vw, 50vw"
                          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        />
                        {item.mediaType === "video" && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <PlayCircle size={40} weight="fill" className="text-white/90" />
                          </div>
                        )}
                      </>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                      <p className="text-sm text-white">{item.title}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
