"use client";

import { useId, useState } from "react";
import { File as FileIcon, UploadSimple, X } from "@phosphor-icons/react/dist/ssr";
import { formatFileSize } from "@/lib/files";

// Bouton explicite + liste des fichiers choisis (nom, taille, retrait avant
// envoi) à la place du contrôle natif <input type="file"> brut, dont le
// texte "aucun fichier choisi" passe facilement inaperçu. L'input réel reste
// présent (visually-hidden) pour que la soumission de formulaire fonctionne
// normalement ; on resynchronise son FileList via DataTransfer à chaque
// ajout/retrait pour que name= transporte toujours la bonne sélection.
//
// `dropzone` bascule sur une zone de glisser-déposer plus grande (au lieu du
// simple bouton compact) — opt-in, réservé aux endroits où déposer plusieurs
// gros fichiers d'un coup est le cas d'usage principal (livrables), pour ne
// pas changer le rendu des 4 autres formulaires qui partagent ce composant.
export function FilePicker({
  name,
  multiple,
  required,
  accept,
  helperText,
  dropzone,
}: {
  name: string;
  multiple?: boolean;
  required?: boolean;
  accept?: string;
  helperText?: string;
  dropzone?: boolean;
}) {
  const id = useId();
  const [files, setFiles] = useState<File[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  // Motif du repli sur le champ natif, ou `null` quand tout va bien. Deux
  // cas, tous deux silencieux sans ça : le navigateur refuse d'ouvrir le
  // sélecteur, ou il refuse de soumettre un champ requis resté vide qu'il ne
  // peut pas mettre en évidence puisqu'il est masqué.
  const [fallback, setFallback] = useState<null | "picker" | "empty">(null);

  // Signalé le 2026-09-29 : « j'appuie et rien ne se passe ». Le déclencheur
  // était un `<label for>` vers un champ masqué — quand Chrome refuse
  // d'ouvrir le sélecteur (un autre sélecteur resté actif, une extension),
  // le clic ne produit rien et n'émet aucune erreur visible. On ouvre donc
  // nous-mêmes, pour pouvoir constater l'échec et proposer une issue.
  function openPicker() {
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (!input) {
      setFallback("picker");
      return;
    }
    try {
      if (typeof input.showPicker === "function") input.showPicker();
      else input.click();
      setFallback(null);
    } catch {
      setFallback("picker");
    }
  }

  function syncInput(next: File[]) {
    setFiles(next);
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (!input) return;
    const dataTransfer = new DataTransfer();
    next.forEach((file) => dataTransfer.items.add(file));
    input.files = dataTransfer.files;
  }

  function addFiles(selected: File[]) {
    if (selected.length > 0) setFallback(null);
    syncInput(multiple ? [...files, ...selected] : selected);
  }

  return (
    <div>
      <input
        id={id}
        type="file"
        name={name}
        multiple={multiple}
        required={required}
        accept={accept}
        aria-label={multiple ? "Fichiers" : "Fichier"}
        onInvalid={() => setFallback("empty")}
        className={fallback ? "mt-1 block text-sm text-ink" : "sr-only"}
        onChange={(event) => addFiles(Array.from(event.target.files ?? []))}
      />
      {dropzone ? (
        <button
          type="button"
          onClick={openPicker}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDraggingOver(false);
            addFiles(Array.from(event.dataTransfer.files));
          }}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
            isDraggingOver
              ? "border-accent bg-accent/10"
              : "border-line hover:border-accent hover:bg-surface-elevated"
          }`}
        >
          <UploadSimple size={22} weight="regular" className="text-accent" />
          <span className="text-sm text-ink">
            Glissez vos fichiers ici, ou{" "}
            <span className="font-medium underline underline-offset-2">
              {multiple ? "choisissez des fichiers" : "choisissez un fichier"}
            </span>
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-accent"
        >
          <UploadSimple size={15} weight="regular" className="text-accent" />
          {multiple ? "Choisir des fichiers" : "Choisir un fichier"}
        </button>
      )}
      {fallback === "picker" && (
        <p className="mt-1.5 text-xs text-danger">
          Votre navigateur a refusé d&apos;ouvrir la fenêtre de sélection. Utilisez le champ
          ci-dessus, ou rechargez la page et réessayez.
        </p>
      )}
      {fallback === "empty" && (
        <p className="mt-1.5 text-xs text-danger">
          Choisissez d&apos;abord un fichier, avec le champ ci-dessus.
        </p>
      )}
      {helperText && <p className="mt-1.5 text-xs text-ink-muted">{helperText}</p>}
      {files.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${file.lastModified}-${index}`}
              className="flex items-center gap-2 rounded-xl bg-surface-elevated px-3 py-1.5 text-xs"
            >
              <FileIcon size={15} weight="regular" className="shrink-0 text-ink-muted" />
              <span className="min-w-0 flex-1 truncate text-ink">{file.name}</span>
              <span className="shrink-0 text-ink-muted">{formatFileSize(file.size)}</span>
              <button
                type="button"
                onClick={() => syncInput(files.filter((_, i) => i !== index))}
                aria-label={`Retirer ${file.name}`}
                className="shrink-0 text-ink-muted transition-colors hover:text-danger"
              >
                <X size={13} weight="regular" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
