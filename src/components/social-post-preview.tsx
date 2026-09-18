import { FileVideo, Images, Heart, ChatCircle, PaperPlaneTilt, BookmarkSimple } from "@phosphor-icons/react/dist/ssr";

// Aperçu "tel qu'il apparaîtra" d'une publication, sur le modèle d'un post
// Instagram (le réseau le plus visuel des quatre gérés, et le plus utilisé
// par la clientèle du site). Partagé entre la fiche admin et l'espace
// client : c'est surtout pour le client qu'il compte, il valide un rendu
// plutôt qu'une légende brute. Volontairement sobre — une imitation trop
// fidèle de l'interface d'Instagram vieillirait mal à chaque refonte de
// l'application.

const CAPTION_PREVIEW_LENGTH = 125; // coupure "… plus" d'Instagram dans le fil

interface PreviewMedia {
  id: string;
  mimeType: string;
}

export function SocialPostPreview({
  clientName,
  caption,
  hashtags,
  media,
}: {
  clientName: string;
  caption: string | null;
  hashtags: string | null;
  media: PreviewMedia[];
}) {
  const cover = media[0];
  const fullText = [caption?.trim(), hashtags?.trim()].filter(Boolean).join("\n\n");
  const truncated = fullText.length > CAPTION_PREVIEW_LENGTH;
  const shownText = truncated ? `${fullText.slice(0, CAPTION_PREVIEW_LENGTH).trimEnd()}…` : fullText;
  const initial = clientName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-surface-elevated">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-ink">
          {initial}
        </span>
        <span className="truncate text-sm font-medium text-ink">{clientName}</span>
      </div>

      <div className="relative aspect-[4/5] w-full bg-surface">
        {cover?.mimeType.startsWith("image/") ? (
          // eslint-disable-next-line @next/next/no-img-element -- fichier servi par une route authentifiée
          <img
            src={`/api/fichiers/reseaux/${cover.id}?thumb=1`}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : cover ? (
          <span className="flex h-full w-full flex-col items-center justify-center gap-2 text-ink-muted">
            <FileVideo size={36} weight="regular" />
            <span className="text-xs">Vidéo</span>
          </span>
        ) : (
          <span className="flex h-full w-full flex-col items-center justify-center gap-2 text-ink-muted">
            <Images size={36} weight="regular" />
            <span className="text-xs">Aucun visuel pour l&apos;instant</span>
          </span>
        )}
        {media.length > 1 && (
          <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
            1/{media.length}
          </span>
        )}
      </div>

      {media.length > 1 && (
        <div className="flex justify-center gap-1 pt-2">
          {media.slice(0, 10).map((item, index) => (
            <span
              key={item.id}
              className={`h-1.5 w-1.5 rounded-full ${index === 0 ? "bg-accent" : "bg-line"}`}
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 px-3 pt-2 text-ink" aria-hidden>
        <Heart size={20} weight="regular" />
        <ChatCircle size={20} weight="regular" />
        <PaperPlaneTilt size={20} weight="regular" />
        <BookmarkSimple size={20} weight="regular" className="ml-auto" />
      </div>

      <p className="whitespace-pre-wrap px-3 pb-3 pt-2 text-sm text-ink">
        {fullText ? (
          <>
            <span className="font-medium">{clientName}</span> {shownText}
            {truncated && <span className="text-ink-muted"> plus</span>}
          </>
        ) : (
          <span className="text-ink-muted">Pas encore de texte.</span>
        )}
      </p>
    </div>
  );
}
