"use client";

import { useCallback, useState } from "react";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { Modal } from "@/components/admin/modal";
import { ContactForm } from "@/components/admin/contact-form";
import type { ContactFormState } from "@/lib/validation/client";

// Le formulaire de création vit dans une modale plutôt qu'en bas de la liste
// (demande du client le 2026-07-30) : la fiche client affiche beaucoup de
// sections, et un formulaire complet toujours déplié entre les contacts et
// les tâches allongeait la page pour un geste occasionnel.
export function NewContactButton({
  action,
  clients,
  existingContacts,
}: {
  action: (state: ContactFormState, formData: FormData) => Promise<ContactFormState>;
  /** Fourni uniquement depuis l'onglet Contacts (annuaire global) — voir
   * `ContactForm`. */
  clients?: { id: string; name: string }[];
  /** Contacts déjà existants pouvant être affectés à ce client (ceux pas
   * déjà rattachés) — voir `ContactForm`. */
  existingContacts: { id: string; name: string; email: string | null }[];
}) {
  const [open, setOpen] = useState(false);
  // Stable : `ContactForm` a `onSuccess` dans ses dépendances d'effet, une
  // fonction recréée à chaque rendu relancerait l'effet en boucle.
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink"
      >
        <Plus size={16} weight="bold" />
        {clients ? "Créer un contact" : "Nouveau contact"}
      </button>

      <Modal open={open} onClose={close} title={clients ? "Créer un contact" : "Nouveau contact"}>
        <ContactForm
          action={action}
          clients={clients}
          existingContacts={existingContacts}
          onSuccess={close}
        />
      </Modal>
    </>
  );
}
