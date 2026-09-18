"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Trash, FileVideo, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { FilePicker } from "@/components/file-picker";
import {
  uploadSocialPostMedia,
  deleteSocialPostMedia,
  moveSocialPostMedia,
} from "@/lib/actions/social-posts";
import { useFormSubmit } from "@/lib/use-form-submit";

const ICON_BUTTON =
  "flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface-elevated text-ink-muted transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:opacity-40 disabled:hover:border-line disabled:hover:bg-surface-elevated disabled:hover:text-ink-muted";

interface Media {
  id: string;
  fileName: string;
  mimeType: string;
}

// Visuels d'une publication, **dans l'ordre** : pour un carrousel, l'ordre
// est celui dans lequel les images seront publiées, d'où le numéro affiché et
// les flèches — `FileGrid` (livrables) n'a pas cette notion d'ordre.
export function SocialPostMediaManager({ postId, media }: { postId: string; media: Media[] }) {
  const [state, formAction, pending] = useActionState(uploadSocialPostMedia.bind(null, postId), undefined);
  const { onSubmit: formSubmit } = useFormSubmit(formAction, { pending, state });
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);
  const [resetKey, setResetKey] = useState(0);

  // Même remise à zéro après envoi réussi que DeliverableUploadForm.
  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) {
      formRef.current?.reset();
      setResetKey((key) => key + 1);
    }
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <div className="grid gap-4">
      {media.length > 0 && (
        <ol className="flex flex-wrap gap-3">
          {media.map((item, index) => {
            const href = `/api/fichiers/reseaux/${item.id}`;
            const isImage = item.mimeType.startsWith("image/");
            return (
              <li key={item.id} className="relative w-28">
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={item.fileName}
                  className="block aspect-[4/5] overflow-hidden rounded-xl border border-line bg-surface-elevated"
                >
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element -- vignette servie par une route authentifiée, hors du périmètre de next/image
                    <img src={`${href}?thumb=1`} alt={item.fileName} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-ink-muted">
                      <FileVideo size={28} weight="regular" />
                      <span className="text-[10px]">Vidéo</span>
                    </span>
                  )}
                </a>
                <span className="absolute left-1.5 top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-ink">
                  {index + 1}
                </span>
                <div className="mt-1.5 flex items-center justify-center gap-1">
                  <button
                    type="button"
                    aria-label="Avancer"
                    disabled={isPending || index === 0}
                    onClick={() => startTransition(() => moveSocialPostMedia(item.id, "up"))}
                    className={ICON_BUTTON}
                  >
                    <ArrowLeft size={12} weight="bold" />
                  </button>
                  <button
                    type="button"
                    aria-label="Reculer"
                    disabled={isPending || index === media.length - 1}
                    onClick={() => startTransition(() => moveSocialPostMedia(item.id, "down"))}
                    className={ICON_BUTTON}
                  >
                    <ArrowRight size={12} weight="bold" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Supprimer ${item.fileName}`}
                    disabled={isPending}
                    onClick={() => {
                      if (window.confirm(`Supprimer "${item.fileName}" de cette publication ?`)) {
                        startTransition(() => deleteSocialPostMedia(item.id));
                      }
                    }}
                    className={`${ICON_BUTTON} hover:border-danger hover:bg-danger hover:text-white`}
                  >
                    <Trash size={12} weight="regular" />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <form ref={formRef} action={formAction} onSubmit={formSubmit} className="flex flex-col gap-3">
        <FilePicker
          key={resetKey}
          name="file"
          required
          multiple
          dropzone
          accept="image/png,image/jpeg,image/webp,video/mp4"
          helperText="JPG, PNG, WEBP ou MP4 · 50 Mo max par fichier, 80 Mo par envoi · ajoutés à la suite, dans l'ordre choisi"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:opacity-60"
          >
            {pending ? "Envoi..." : "Ajouter des visuels"}
          </button>
          {state?.error && (
            <span className="flex items-center gap-1 text-sm text-danger">
              <WarningCircle size={16} weight="fill" />
              {state.error}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
