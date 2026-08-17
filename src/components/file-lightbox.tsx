"use client";

import { useEffect, useState } from "react";
import { DownloadSimple, X } from "@phosphor-icons/react/dist/ssr";

interface LightboxFile {
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
}

// Au-delà, on garde le téléchargement classique (streaming navigateur,
// support Range déjà en place côté API) plutôt que de charger tout le
// fichier en mémoire côté client pour le partager — au-delà de quelques
// dizaines de Mo ce n'est plus vraiment un usage "galerie photo" de toute
// façon, voir DownloadButton ci-dessous.
const MAX_SHARE_SIZE = 30 * 1024 * 1024;

// Bouton "Télécharger" du lightbox (demande du 2026-08-17 : "téléchargerait
// directement dans la galerie des téléphones des clients"). Aucun navigateur
// ne permet à un site d'écrire silencieusement dans la galerie photo d'un
// téléphone — limite de sécurité volontaire, iOS comme Android. Le plus
// proche possible : `navigator.share` avec le fichier déjà en pièce jointe,
// qui ouvre la feuille de partage native avec "Enregistrer l'image"/
// "Enregistrer la vidéo" en option immédiate, au lieu de forcer à aller
// chercher le fichier dans "Fichiers" après un téléchargement classique.
// Repli transparent sur le lien `<a download>` classique si l'API n'existe
// pas (desktop), si le fichier est trop gros, ou si le partage échoue.
function DownloadButton({ href, file }: { href: string; file: LightboxFile }) {
  const [pending, setPending] = useState(false);
  const canTryShare =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    (file.sizeBytes === undefined || file.sizeBytes <= MAX_SHARE_SIZE);

  async function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    event.stopPropagation();
    if (!canTryShare) return; // laisse le lien <a download> agir normalement

    event.preventDefault();
    setPending(true);
    try {
      const response = await fetch(href);
      const blob = await response.blob();
      const shareFile = new File([blob], file.fileName, { type: file.mimeType });
      if (navigator.canShare({ files: [shareFile] })) {
        await navigator.share({ files: [shareFile] });
        return;
      }
    } catch (error) {
      // Annulé par l'utilisateur dans la feuille de partage — pas une
      // erreur, on ne retombe pas sur un téléchargement forcé dans ce cas.
      if (error instanceof Error && error.name === "AbortError") return;
    } finally {
      setPending(false);
    }
    // Partage indisponible pour ce fichier ou échoué (réseau...) : repli
    // sur un téléchargement classique déclenché depuis JS.
    const link = document.createElement("a");
    link.href = href;
    link.download = file.fileName;
    link.click();
  }

  return (
    <a
      href={href}
      download={file.fileName}
      onClick={handleClick}
      aria-disabled={pending}
      className="flex items-center gap-1.5 transition-opacity hover:opacity-80 aria-disabled:pointer-events-none aria-disabled:opacity-60"
    >
      <DownloadSimple size={18} weight="regular" />
      {pending ? "Préparation..." : "Télécharger"}
    </a>
  );
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
          <DownloadButton href={href} file={file} />
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
