"use client";

import { useCallback, useState } from "react";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { Modal } from "@/components/admin/modal";
import { DocumentUploadForm } from "@/components/admin/document-upload-form";

// Même parti pris que `NewTaskButton` : le formulaire d'ajout passe en
// modale plutôt qu'en bloc toujours déplié en haut de /admin/documents, où
// il repoussait la liste des documents sous la ligne de flottaison.
export function NewDocumentButton({
  clients,
  types,
}: {
  clients: { id: string; name: string }[];
  types: { id: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink"
      >
        <Plus size={16} weight="bold" />
        Ajouter un document
      </button>

      <Modal open={open} onClose={close} title="Nouveau document">
        <DocumentUploadForm clients={clients} types={types} onSuccess={close} />
      </Modal>
    </>
  );
}
