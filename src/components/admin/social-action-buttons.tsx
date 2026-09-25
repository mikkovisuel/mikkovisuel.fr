"use client";

import { useCallback, useState } from "react";
import { Plus, PencilSimple } from "@phosphor-icons/react/dist/ssr";
import { Modal } from "@/components/admin/modal";
import { SocialActionForm } from "@/components/admin/social-action-forms";
import { createSocialAction, updateSocialAction } from "@/lib/actions/social-actions";

// Création et modification d'une action en modale (2026-09-25), même parti
// pris que "Ajouter un document" : le formulaire ne prend pas la place de la
// liste, et le bouton vit à côté de "Nouvelle publication".

export function NewSocialActionButton({ clients, defaultDueAt }: { clients: { id: string; name: string }[]; defaultDueAt: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink"
      >
        <Plus size={16} weight="bold" />
        Nouvelle action
      </button>

      <Modal open={open} onClose={close} title="Nouvelle action">
        <SocialActionForm
          action={createSocialAction}
          clients={clients}
          defaultValues={{ dueAt: defaultDueAt }}
          onSuccess={close}
        />
      </Modal>
    </>
  );
}

export function EditSocialActionButton({
  actionId,
  clients,
  values,
}: {
  actionId: string;
  clients: { id: string; name: string }[];
  values: { title: string; description: string; clientId: string; dueAt: string };
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Modifier ${values.title}`}
        title="Modifier"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:border-accent hover:text-ink"
      >
        <PencilSimple size={14} weight="regular" />
      </button>

      <Modal open={open} onClose={close} title="Modifier l'action">
        <SocialActionForm
          action={updateSocialAction.bind(null, actionId)}
          clients={clients}
          defaultValues={values}
          submitLabel="Enregistrer"
          resetOnSuccess={false}
          onSuccess={close}
        />
      </Modal>
    </>
  );
}
