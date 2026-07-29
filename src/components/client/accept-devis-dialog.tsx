"use client";

import { useActionState, useRef, useState } from "react";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { acceptDevis } from "@/lib/actions/document-signature";
import { SignatureCanvas, type SignatureCanvasHandle } from "@/components/client/signature-canvas";

export function AcceptDevisDialog({ documentId, fileName }: { documentId: string; fileName: string }) {
  const [open, setOpen] = useState(false);
  const signatureRef = useRef<SignatureCanvasHandle>(null);
  const [signatureError, setSignatureError] = useState<string | null>(null);
  // Contrôlé (pas juste `name=`) : un essai de soumission sans signature
  // renvoie l'action sans jamais atteindre le serveur (voir `action`
  // ci-dessous), et React réinitialise les champs non contrôlés d'un
  // `<form action={...}>` après chaque cycle — un champ non contrôlé
  // perdrait donc le nom déjà tapé par le client à ce moment-là.
  const [acceptedByName, setAcceptedByName] = useState("");

  const action = async (_state: Awaited<ReturnType<typeof acceptDevis>>, formData: FormData) => {
    const dataUrl = signatureRef.current?.toDataUrl();
    if (!dataUrl) {
      setSignatureError("Veuillez dessiner votre signature.");
      return undefined;
    }
    setSignatureError(null);
    formData.set("signatureDataUrl", dataUrl);
    return acceptDevis(documentId, undefined, formData);
  };

  const [state, formAction, pending] = useActionState(action, undefined);

  if (state?.success) {
    return <span className="text-xs text-ink-muted">Devis accepté, merci.</span>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
      >
        Accepter et signer
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="mt-3 flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-line bg-surface-elevated p-4"
    >
      <p className="text-sm text-ink">
        Accepter le devis <strong>{fileName}</strong>
      </p>
      <div className="flex flex-col gap-2">
        <label htmlFor="acceptedByName" className="text-xs font-medium text-ink">
          Nom complet
        </label>
        <input
          id="acceptedByName"
          name="acceptedByName"
          type="text"
          required
          value={acceptedByName}
          onChange={(event) => setAcceptedByName(event.target.value)}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-ink">Signature</span>
        <SignatureCanvas ref={signatureRef} />
      </div>
      {(signatureError || state?.error) && (
        <div className="flex items-center gap-1.5 text-xs text-danger">
          <WarningCircle size={14} weight="fill" />
          {signatureError ?? state?.error}
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? "..." : "Confirmer l'acceptation"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-ink-muted transition-colors hover:text-ink"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
