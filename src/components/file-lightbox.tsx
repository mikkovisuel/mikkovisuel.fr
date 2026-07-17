"use client";

import { useEffect } from "react";
import { DownloadSimple, X } from "@phosphor-icons/react/dist/ssr";

interface LightboxFile {
  fileName: string;
  mimeType: string;
}

// Aperçu image/vidéo/PDF en surimpression, pour éviter de quitter la page en
// ouvrant un nouvel onglet — utilisé depuis `FileGrid` (espace client + admin).
export function FileLightbox({
  file,
  href,
  onClose,
}: {
  file: LightboxFile;
  href: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const isImage = file.mimeType.startsWith("image/");
  const isVideo = file.mimeType.startsWith("video/");
  const isPdf = file.mimeType === "application/pdf";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col bg-black/70 p-4"
      onClick={onClose}
    >
      <div className="flex items-center justify-between gap-4 text-sm text-white">
        <span className="truncate">{file.fileName}</span>
        <div className="flex shrink-0 items-center gap-4">
          <a
            href={href}
            download
            onClick={(event) => event.stopPropagation()}
            className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
          >
            <DownloadSimple size={18} weight="regular" />
            Télécharger
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer l'aperçu"
            className="transition-opacity hover:opacity-80"
          >
            <X size={20} weight="regular" />
          </button>
        </div>
      </div>

      <div
        className="flex flex-1 items-center justify-center overflow-hidden pt-4"
        onClick={(event) => event.stopPropagation()}
      >
        {isImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={href}
            alt={file.fileName}
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        )}
        {isVideo && (
          <video
            src={href}
            controls
            autoPlay
            className="max-h-full max-w-full rounded-lg"
          />
        )}
        {isPdf && (
          <iframe
            src={href}
            title={file.fileName}
            className="h-full w-full max-w-4xl rounded-lg bg-white"
          />
        )}
      </div>
    </div>
  );
}
