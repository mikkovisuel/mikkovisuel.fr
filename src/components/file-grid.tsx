"use client";

import { useState } from "react";
import {
  DownloadSimple,
  File as FileIcon,
  FilePdf,
  FileVideo,
  FileZip,
  Play,
} from "@phosphor-icons/react/dist/ssr";
import { DeleteButton } from "@/components/admin/delete-button";
import { FileLightbox } from "@/components/file-lightbox";
import { formatFileSize } from "@/lib/files";
import { taskDateFormatterShort } from "@/lib/tasks";

interface GridFile {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: Date;
}

function FileTypeIcon({ mimeType, size }: { mimeType: string; size: number }) {
  if (mimeType === "application/pdf") return <FilePdf size={size} weight="regular" />;
  if (mimeType.startsWith("video/")) return <FileVideo size={size} weight="regular" />;
  if (mimeType === "application/zip") return <FileZip size={size} weight="regular" />;
  return <FileIcon size={size} weight="regular" />;
}

function fileMeta(file: GridFile) {
  return `${formatFileSize(file.sizeBytes)} · ${taskDateFormatterShort.format(new Date(file.uploadedAt))}`;
}

// Composant partagé espace client / admin : vignette pour les images et
// vidéos (aperçu en lightbox au clic), pastille icône + lien pour le reste
// (PDF s'ouvre aussi en lightbox, zip/autres restent en téléchargement
// direct — pas d'aperçu possible). `deleteAction` n'est passé que côté
// admin (le client ne supprime pas les fichiers déposés pour lui).
export function FileGrid({
  files,
  downloadBasePath,
  deleteAction,
}: {
  files: GridFile[];
  downloadBasePath: string;
  deleteAction?: (id: string) => Promise<void>;
}) {
  const [previewFile, setPreviewFile] = useState<GridFile | null>(null);

  if (files.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {files.map((file) => {
          const isImage = file.mimeType.startsWith("image/");
          const isVideo = file.mimeType.startsWith("video/");
          const isPdf = file.mimeType === "application/pdf";
          const href = `${downloadBasePath}/${file.id}`;

          if (isImage || isVideo) {
            return (
              <div key={file.id} className="flex w-28 flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewFile(file)}
                  className="group relative block aspect-square w-full overflow-hidden rounded-xl border border-line bg-surface-elevated"
                >
                  {isImage ? (
                    // Vignette redimensionnée (`?thumb=1`, voir src/lib/
                    // thumbnail.ts) plutôt que l'original en pleine
                    // résolution : une dizaine de photos dans une grille de
                    // 112px n'a pas besoin de charger l'image complète —
                    // c'est ce qui ralentissait la page. Le lightbox
                    // ci-dessous continue d'utiliser `href` (l'original).
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`${href}?thumb=1`}
                      alt={file.fileName}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <>
                      {/* `#t=0.1` makes the browser decode and display that
                          frame as a static poster, without playing — no
                          server-side thumbnail generation needed. */}
                      <video
                        src={`${href}#t=0.1`}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-ink/20 transition-colors group-hover:bg-ink/30">
                        <Play size={22} weight="fill" className="text-white drop-shadow" />
                      </span>
                    </>
                  )}
                </button>
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <p className="truncate text-xs text-ink-muted">{file.fileName}</p>
                    <p className="truncate text-[11px] text-ink-muted/70">{fileMeta(file)}</p>
                  </div>
                  {deleteAction && (
                    <DeleteButton
                      action={deleteAction.bind(null, file.id)}
                      confirmMessage={`Supprimer définitivement "${file.fileName}" ? Le fichier sera effacé du stockage.`}
                      label="×"
                      className="shrink-0 text-ink-muted transition-colors hover:text-danger"
                    />
                  )}
                </div>
              </div>
            );
          }

          return (
            <div
              key={file.id}
              className="flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm text-ink"
            >
              {isPdf ? (
                <button
                  type="button"
                  onClick={() => setPreviewFile(file)}
                  className="flex items-center gap-2 text-left transition-colors hover:text-accent"
                >
                  <FileTypeIcon mimeType={file.mimeType} size={16} />
                  <span className="flex flex-col">
                    <span>{file.fileName}</span>
                    <span className="text-xs text-ink-muted">{fileMeta(file)}</span>
                  </span>
                </button>
              ) : (
                <a href={href} className="flex items-center gap-2 transition-colors hover:text-accent">
                  <FileTypeIcon mimeType={file.mimeType} size={16} />
                  <span className="flex flex-col">
                    <span>{file.fileName}</span>
                    <span className="text-xs text-ink-muted">{fileMeta(file)}</span>
                  </span>
                  <DownloadSimple size={14} weight="regular" />
                </a>
              )}
              {isPdf && (
                <a
                  href={href}
                  download
                  aria-label="Télécharger"
                  className="text-ink-muted transition-colors hover:text-accent"
                >
                  <DownloadSimple size={14} weight="regular" />
                </a>
              )}
              {deleteAction && (
                <DeleteButton
                  action={deleteAction.bind(null, file.id)}
                  confirmMessage={`Supprimer définitivement "${file.fileName}" ? Le fichier sera effacé du stockage.`}
                  label="×"
                  className="text-ink-muted transition-colors hover:text-danger"
                />
              )}
            </div>
          );
        })}
      </div>

      {previewFile && (
        <FileLightbox
          file={{
            fileName: previewFile.fileName,
            mimeType: previewFile.mimeType,
            sizeBytes: previewFile.sizeBytes,
          }}
          href={`${downloadBasePath}/${previewFile.id}`}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </>
  );
}
