import Link from "next/link";
import Image from "next/image";
import { ArrowUp, ArrowDown, Image as ImageIcon } from "@phosphor-icons/react/dist/ssr";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteGallery, moveGallery } from "@/lib/actions/portfolio";
import { resolveGalleryCoverSrc } from "@/lib/portfolio-media";

interface PortfolioGalleryRowProps {
  gallery: {
    id: string;
    title: string;
    coverStorageKey: string | null;
    items: { id: string; externalUrl: string | null; storageKey: string | null }[];
    _count: { items: number };
  };
  pillarId: string;
  isFirst: boolean;
  isLast: boolean;
}

export function PortfolioGalleryRow({ gallery, pillarId, isFirst, isLast }: PortfolioGalleryRowProps) {
  const src = resolveGalleryCoverSrc(gallery);

  return (
    <div className="flex items-center gap-4 px-6 py-4">
      <Link
        href={`/admin/portfolio/${pillarId}/${gallery.id}`}
        className="flex flex-1 items-center gap-4 min-w-0"
      >
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface-elevated">
          {src ? (
            <Image src={src} alt={gallery.title} fill sizes="64px" className="object-cover" />
          ) : (
            <ImageIcon size={20} weight="regular" className="text-ink-muted" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{gallery.title}</p>
          <p className="mt-0.5 text-sm text-ink-muted">
            {gallery._count.items} élément{gallery._count.items > 1 ? "s" : ""}
          </p>
        </div>
      </Link>
      <div className="flex shrink-0 items-center gap-2">
        <form action={moveGallery.bind(null, pillarId, gallery.id, "up")}>
          <button
            type="submit"
            disabled={isFirst}
            aria-label="Monter"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:opacity-30"
          >
            <ArrowUp size={14} weight="bold" />
          </button>
        </form>
        <form action={moveGallery.bind(null, pillarId, gallery.id, "down")}>
          <button
            type="submit"
            disabled={isLast}
            aria-label="Descendre"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:opacity-30"
          >
            <ArrowDown size={14} weight="bold" />
          </button>
        </form>
        <DeleteButton
          action={deleteGallery.bind(null, gallery.id, pillarId)}
          confirmMessage={`Supprimer définitivement la galerie "${gallery.title}" et tous ses éléments ?`}
        />
      </div>
    </div>
  );
}
