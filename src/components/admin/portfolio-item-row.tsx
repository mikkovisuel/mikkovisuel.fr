import Image from "next/image";
import { ArrowUp, ArrowDown, PlayCircle } from "@phosphor-icons/react/dist/ssr";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteMediaItem, moveMediaItem } from "@/lib/actions/portfolio";
import { resolveItemSrc } from "@/lib/portfolio-media";

interface PortfolioItemRowProps {
  item: {
    id: string;
    title: string;
    mediaType: string;
    externalUrl: string | null;
    storageKey: string | null;
    mimeType: string | null;
  };
  galleryId: string;
  isFirst: boolean;
  isLast: boolean;
}

export function PortfolioItemRow({ item, galleryId, isFirst, isLast }: PortfolioItemRowProps) {
  const src = resolveItemSrc(item);
  const isUploadedVideo = item.mediaType === "video" && item.mimeType?.startsWith("video/");

  return (
    <div className="flex items-center gap-4 px-6 py-4">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-line">
        {src && isUploadedVideo && (
          <video src={src} muted playsInline className="h-full w-full object-cover" />
        )}
        {src && !isUploadedVideo && (
          <Image src={src} alt={item.title} fill sizes="64px" className="object-cover" />
        )}
        {item.mediaType === "video" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <PlayCircle size={20} weight="fill" className="text-white/90" />
          </div>
        )}
      </div>
      <p className="flex-1 text-sm font-medium text-ink">{item.title}</p>
      <div className="flex items-center gap-2">
        <form action={moveMediaItem.bind(null, galleryId, item.id, "up")}>
          <button
            type="submit"
            disabled={isFirst}
            aria-label="Monter"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:opacity-30"
          >
            <ArrowUp size={14} weight="bold" />
          </button>
        </form>
        <form action={moveMediaItem.bind(null, galleryId, item.id, "down")}>
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
          action={deleteMediaItem.bind(null, item.id, galleryId)}
          confirmMessage={`Supprimer "${item.title}" ?`}
        />
      </div>
    </div>
  );
}
