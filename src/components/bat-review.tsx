"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChatCircleDots, Columns, Trash, X } from "@phosphor-icons/react";
import { FileGrid } from "@/components/file-grid";
import { addBatAnnotation, deleteBatAnnotation } from "@/lib/actions/annotations";

// Relecture des BAT (2026-10-22), espace client et admin :
//  - version en cours (V1, V2…) en vignettes, nombre d'annotations ;
//  - clic sur une image : grande vue ; le client y pose des points de
//    correction (« ce texte plus grand ») tant que la tâche est à valider ;
//  - versions précédentes repliées, comparaison côte à côte avec la
//    précédente. PDF et vidéos restent dans la grille habituelle.

export interface BatAnnotation {
  id: string;
  x: number;
  y: number;
  body: string;
  authorName: string;
  mine: boolean;
}

export interface BatFile {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: Date;
  version: number;
  annotations: BatAnnotation[];
}

const SRC = (id: string, thumb = false) => `/api/fichiers/livrables/${id}${thumb ? "?thumb=1" : ""}`;

function Pins({ annotations, active }: { annotations: BatAnnotation[]; active?: number | null }) {
  return (
    <>
      {annotations.map((annotation, index) => (
        <span
          key={annotation.id}
          title={annotation.body}
          style={{ left: `${annotation.x * 100}%`, top: `${annotation.y * 100}%` }}
          className={`absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-[11px] font-semibold shadow ${
            active === index ? "bg-accent text-accent-ink" : "bg-red-600 text-white"
          }`}
        >
          {index + 1}
        </span>
      ))}
    </>
  );
}

function AnnotateView({ file, canAnnotate, onClose }: { file: BatFile; canAnnotate: boolean; onClose: () => void }) {
  const router = useRouter();
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  function place(event: React.MouseEvent<HTMLDivElement>) {
    if (!canAnnotate) return;
    const box = event.currentTarget.getBoundingClientRect();
    setDraft({ x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height });
    setText("");
    setError(null);
  }

  function save() {
    if (!draft) return;
    startTransition(async () => {
      const result = await addBatAnnotation(file.id, { ...draft, body: text });
      if (result.error) return setError(result.error);
      setDraft(null);
      setText("");
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteBatAnnotation(id);
      if (result.error) setError(result.error);
      router.refresh();
    });
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={file.fileName} className="fixed inset-0 z-[100] flex flex-col bg-black/95 p-3 sm:p-6">
      <div className="mb-2 flex items-center gap-3 text-sm text-white">
        <span className="min-w-0 flex-1 truncate">
          {file.fileName} · V{file.version}
          {canAnnotate && <span className="ml-2 text-white/70">Cliquez sur l&apos;image à l&apos;endroit à corriger</span>}
        </span>
        <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-full p-1.5 hover:bg-white/15">
          <X size={20} />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div onClick={place} className={`relative inline-block ${canAnnotate ? "cursor-crosshair" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- fichier servi par une route authentifiée */}
            <img src={SRC(file.id)} alt={file.fileName} className="block max-h-[70vh] max-w-full select-none lg:max-h-[82vh]" draggable={false} />
            <Pins annotations={file.annotations} active={active} />
            {draft && (
              <span
                style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%` }}
                className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-accent shadow"
              />
            )}
          </div>
        </div>
        <aside className="w-full shrink-0 overflow-y-auto rounded-2xl bg-surface p-4 lg:w-80">
          {draft && (
            <div className="mb-4 grid gap-2">
              <textarea
                autoFocus
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Ex. ce texte plus grand, autre couleur…"
                aria-label="Correction souhaitée"
                className="rounded-xl border border-line bg-surface-elevated px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              />
              <div className="flex gap-2">
                <button type="button" onClick={save} disabled={pending || !text.trim()} className="h-9 rounded-full bg-accent px-4 text-sm font-medium text-accent-ink disabled:opacity-50">
                  Ajouter
                </button>
                <button type="button" onClick={() => setDraft(null)} className="h-9 rounded-full border border-line px-4 text-sm text-ink">
                  Annuler
                </button>
              </div>
            </div>
          )}
          {error && <p className="mb-2 text-sm text-danger">{error}</p>}
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Corrections ({file.annotations.length})</p>
          {file.annotations.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">{canAnnotate ? "Aucune pour l'instant." : "Aucune annotation."}</p>
          ) : (
            <ol className="mt-2 grid gap-2">
              {file.annotations.map((annotation, index) => (
                <li
                  key={annotation.id}
                  onMouseEnter={() => setActive(index)}
                  onMouseLeave={() => setActive(null)}
                  className="flex items-start gap-2 text-sm text-ink"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-[10px] font-semibold text-white">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">
                    {annotation.body}
                    <span className="block text-xs text-ink-muted">{annotation.authorName}</span>
                  </span>
                  {canAnnotate && annotation.mine && (
                    <button type="button" onClick={() => remove(annotation.id)} disabled={pending} aria-label="Supprimer cette annotation" className="text-ink-muted hover:text-danger">
                      <Trash size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </div>
  );
}

function CompareView({ current, previous, onClose }: { current: BatFile[]; previous: BatFile[]; onClose: () => void }) {
  const pairs = current.map((file, index) => [previous[index], file] as const);
  return (
    <div role="dialog" aria-modal="true" aria-label="Comparer les versions" className="fixed inset-0 z-[100] overflow-y-auto bg-black/85 p-3 sm:p-6">
      <div className="mb-3 flex items-center text-sm text-white">
        <span className="flex-1">
          V{previous[0]?.version} à gauche, V{current[0]?.version} à droite
        </span>
        <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-full p-1.5 hover:bg-white/15">
          <X size={20} />
        </button>
      </div>
      <div className="grid gap-6">
        {pairs.map(([before, after]) => (
          <div key={after.id} className="grid grid-cols-2 gap-3">
            {[before, after].map((file, side) =>
              file ? (
                <figure key={file.id} className="min-w-0">
                  <div className="relative mx-auto w-fit">
                    {/* eslint-disable-next-line @next/next/no-img-element -- fichier servi par une route authentifiée */}
                    <img src={SRC(file.id)} alt={file.fileName} className="block max-h-[75vh] max-w-full" />
                    <Pins annotations={file.annotations} />
                  </div>
                  <figcaption className="mt-1 truncate text-xs text-white/70">
                    V{file.version} · {file.fileName}
                  </figcaption>
                </figure>
              ) : (
                <div key={side} className="flex items-center justify-center rounded-xl border border-dashed border-white/30 text-xs text-white/60">
                  Pas d&apos;équivalent
                </div>
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Tiles({ files, onOpen }: { files: BatFile[]; onOpen: (file: BatFile) => void }) {
  return (
    <div className="flex flex-wrap gap-3">
      {files.map((file) => (
        <button
          key={file.id}
          type="button"
          onClick={() => onOpen(file)}
          title={`${file.fileName} — ouvrir`}
          className="relative h-40 w-32 overflow-hidden rounded-xl border border-line bg-surface-elevated transition-shadow hover:shadow-md"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- vignette servie par une route authentifiée */}
          <img src={SRC(file.id, true)} alt={file.fileName} loading="lazy" className="h-full w-full object-cover" />
          {file.annotations.length > 0 && (
            <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
              <ChatCircleDots size={12} weight="fill" />
              {file.annotations.length}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function BatReview({
  files,
  canAnnotate,
  deleteAction,
}: {
  files: BatFile[];
  /** Client, tâche « À valider » : peut poser des corrections. */
  canAnnotate: boolean;
  /** Admin : suppression des fichiers (grille habituelle). */
  deleteAction?: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState<BatFile | null>(null);
  const [comparing, setComparing] = useState(false);
  if (files.length === 0) return null;

  const latest = Math.max(...files.map((file) => file.version));
  const current = files.filter((file) => file.version === latest);
  const previousVersions = [...new Set(files.map((file) => file.version))].filter((v) => v < latest).sort((a, b) => b - a);
  const previous = files.filter((file) => file.version === previousVersions[0]);
  const images = (list: BatFile[]) => list.filter((file) => file.mimeType.startsWith("image/"));
  const others = (list: BatFile[]) => list.filter((file) => !file.mimeType.startsWith("image/"));
  // `open` peut viser une ancienne copie après rafraîchissement : on relit la version à jour.
  const openFile = open ? (files.find((file) => file.id === open.id) ?? null) : null;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full bg-select px-2.5 py-0.5 text-xs font-semibold text-ink">V{latest}</span>
        {canAnnotate && images(current).length > 0 && (
          <span className="text-xs text-ink-muted">Cliquez sur une image pour indiquer une correction à l&apos;endroit voulu.</span>
        )}
        {images(previous).length > 0 && images(current).length > 0 && (
          <button
            type="button"
            onClick={() => setComparing(true)}
            className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-xs text-ink transition-colors hover:border-accent"
          >
            <Columns size={14} /> Comparer avec V{previousVersions[0]}
          </button>
        )}
      </div>
      <Tiles files={images(current)} onOpen={setOpen} />
      {others(current).length > 0 && (
        <FileGrid files={others(current)} downloadBasePath="/api/fichiers/livrables" deleteAction={deleteAction} />
      )}
      {deleteAction && images(current).length > 0 && (
        <details className="text-xs text-ink-muted">
          <summary className="cursor-pointer hover:text-ink">Gérer les fichiers de la V{latest}</summary>
          <div className="mt-2">
            <FileGrid files={images(current)} downloadBasePath="/api/fichiers/livrables" deleteAction={deleteAction} />
          </div>
        </details>
      )}
      {previousVersions.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-xs text-ink-muted hover:text-ink">
            Versions précédentes ({previousVersions.map((v) => `V${v}`).join(", ")})
          </summary>
          <div className="mt-3 grid gap-4">
            {previousVersions.map((version) => {
              const list = files.filter((file) => file.version === version);
              return (
                <div key={version} className="grid gap-2">
                  <span className="text-xs font-medium text-ink-muted">V{version}</span>
                  <Tiles files={images(list)} onOpen={setOpen} />
                  {others(list).length > 0 && <FileGrid files={others(list)} downloadBasePath="/api/fichiers/livrables" />}
                </div>
              );
            })}
          </div>
        </details>
      )}
      {openFile && (
        <AnnotateView
          file={openFile}
          canAnnotate={canAnnotate && openFile.version === latest}
          onClose={() => setOpen(null)}
        />
      )}
      {comparing && <CompareView current={images(current)} previous={images(previous)} onClose={() => setComparing(false)} />}
    </div>
  );
}
