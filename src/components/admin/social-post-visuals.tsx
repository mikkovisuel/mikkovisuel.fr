"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, FileVideo, Plus, Trash, WarningCircle } from "@phosphor-icons/react";
import { deleteSocialPostMedia, moveSocialPostMedia, uploadSocialPostMedia } from "@/lib/actions/social-posts";

// Visuels d'une publication, en tête de l'éditeur (refonte du 2026-10-21) :
//  - à la création, les fichiers restent dans le navigateur (aperçu, ordre,
//    retrait) et partent avec le formulaire (`media`) ;
//  - sur une publication existante, chaque dépôt est envoyé tout de suite.
// L'ordre fait foi pour un carrousel ; le 1er visuel est la couverture.

export interface VisualItem {
  key: string;
  url: string;
  isImage: boolean;
  name: string;
}

const ACCEPT = "image/png,image/jpeg,image/webp,video/mp4";
const TILE = "relative aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-xl border border-line bg-surface-elevated";
const MINI =
  "flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/75 disabled:opacity-30";

export function SocialPostVisuals({
  inputName,
  postId,
  existing,
  onChange,
}: {
  /** Création : nom du champ de fichiers envoyé avec le formulaire. */
  inputName?: string;
  /** Publication existante : envoi immédiat. */
  postId?: string;
  existing?: { id: string; fileName: string; mimeType: string }[];
  /** Liste affichée (pour l'aperçu et la rédaction par l'IA). */
  onChange?: (items: VisualItem[]) => void;
}) {
  const inputId = useId();
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const hiddenInput = useRef<HTMLInputElement>(null);

  const localUrls = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => localUrls.forEach((url) => URL.revokeObjectURL(url)), [localUrls]);

  const items: VisualItem[] = useMemo(
    () =>
      postId
        ? (existing ?? []).map((media) => ({
            key: media.id,
            url: `/api/fichiers/reseaux/${media.id}`,
            isImage: media.mimeType.startsWith("image/"),
            name: media.fileName,
          }))
        : files.map((file, index) => ({ key: `${file.name}-${index}`, url: localUrls[index], isImage: file.type.startsWith("image/"), name: file.name })),
    [postId, existing, files, localUrls],
  );

  useEffect(() => onChange?.(items), [items, onChange]);

  // Garde le champ caché du formulaire aligné sur la liste (ordre compris).
  function setLocal(next: File[]) {
    setFiles(next);
    if (hiddenInput.current) {
      const transfer = new DataTransfer();
      next.forEach((file) => transfer.items.add(file));
      hiddenInput.current.files = transfer.files;
    }
  }

  function add(selected: File[]) {
    const accepted = selected.filter((file) => ACCEPT.split(",").includes(file.type));
    setError(accepted.length < selected.length ? "Formats acceptés : JPG, PNG, WEBP ou MP4." : null);
    if (accepted.length === 0) return;
    if (!postId) return setLocal([...files, ...accepted]);
    const data = new FormData();
    accepted.forEach((file) => data.append("file", file));
    startTransition(async () => {
      const result = await uploadSocialPostMedia(postId, undefined, data);
      if (result?.error) setError(result.error);
    });
  }

  function move(index: number, delta: -1 | 1) {
    if (postId) {
      const id = items[index].key;
      startTransition(() => moveSocialPostMedia(id, delta < 0 ? "up" : "down"));
      return;
    }
    const next = [...files];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    setLocal(next);
  }

  function remove(index: number) {
    if (postId) {
      const item = items[index];
      if (!window.confirm(`Supprimer « ${item.name} » de cette publication ?`)) return;
      startTransition(() => deleteSocialPostMedia(item.key));
      return;
    }
    setLocal(files.filter((_, i) => i !== index));
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        add(Array.from(event.dataTransfer.files));
      }}
      className={`rounded-2xl border-2 border-dashed p-3 transition-colors ${dragging ? "border-accent bg-accent/10" : "border-line"}`}
    >
      {inputName && <input ref={hiddenInput} type="file" name={inputName} multiple accept={ACCEPT} className="hidden" tabIndex={-1} />}
      <input
        id={inputId}
        type="file"
        multiple
        accept={ACCEPT}
        className="sr-only"
        onChange={(event) => {
          add(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      <ol className="flex gap-2 overflow-x-auto pb-1">
        {items.map((item, index) => (
          <li key={item.key} className={TILE} title={item.name}>
            {item.isImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- fichier local ou route authentifiée
              <img src={postId ? `${item.url}?thumb=1` : item.url} alt={item.name} className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-ink-muted">
                <FileVideo size={26} />
                <span className="text-[10px]">Vidéo</span>
              </span>
            )}
            <span className="absolute left-1 top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-ink">
              {index === 0 ? "Couv." : index + 1}
            </span>
            <span className="absolute inset-x-1 bottom-1 flex justify-between">
              <button type="button" aria-label="Avancer" disabled={pending || index === 0} onClick={() => move(index, -1)} className={MINI}>
                <ArrowLeft size={12} weight="bold" />
              </button>
              <button type="button" aria-label={`Retirer ${item.name}`} disabled={pending} onClick={() => remove(index)} className={MINI}>
                <Trash size={12} />
              </button>
              <button type="button" aria-label="Reculer" disabled={pending || index === items.length - 1} onClick={() => move(index, 1)} className={MINI}>
                <ArrowRight size={12} weight="bold" />
              </button>
            </span>
          </li>
        ))}
        <li className="shrink-0">
          <label
            htmlFor={inputId}
            className="flex aspect-[4/5] w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--color-outline)] text-xs text-ink-muted transition-colors hover:bg-ink/[0.04] hover:text-ink"
          >
            <Plus size={20} />
            {pending ? "Envoi…" : "Ajouter"}
          </label>
        </li>
      </ol>
      <p className="mt-1 text-xs text-ink-muted">
        Glissez vos visuels ici · JPG, PNG, WEBP ou MP4, 50 Mo par fichier · le 1er est la couverture
        {!postId && files.length > 0 ? " · envoyés à la création" : ""}
      </p>
      {error && (
        <p className="mt-1 flex items-center gap-1 text-sm text-danger">
          <WarningCircle size={14} weight="fill" /> {error}
        </p>
      )}
    </div>
  );
}

/** Image réduite en JPEG (base64 sans préfixe) pour la rédaction par l'IA. */
export async function imageToJpegBase64(url: string, max = 1024): Promise<string> {
  const image = new Image();
  image.src = url;
  await image.decode();
  const scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
}
