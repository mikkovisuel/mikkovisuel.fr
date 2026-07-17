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
export function FilePicker({
  name,
  multiple,
  required,
  accept,
  helperText,
}: {
  name: string;
  multiple?: boolean;
  required?: boolean;
  accept?: string;
  helperText?: string;
}) {
  const id = useId();
  const [files, setFiles] = useState<File[]>([]);

  function syncInput(next: File[]) {
    setFiles(next);
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (!input) return;
    const dataTransfer = new DataTransfer();
    next.forEach((file) => dataTransfer.items.add(file));
    input.files = dataTransfer.files;
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
        className="sr-only"
        onChange={(event) => {
          const selected = Array.from(event.target.files ?? []);
          syncInput(multiple ? [...files, ...selected] : selected);
        }}
      />
      <label
        htmlFor={id}
        className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-accent"
      >
        <UploadSimple size={15} weight="regular" className="text-accent" />
        {multiple ? "Choisir des fichiers" : "Choisir un fichier"}
      </label>
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
