"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import {
  PaperPlaneTilt,
  UploadSimple,
  File as FileIcon,
  X,
  WarningCircle,
  Eye,
} from "@phosphor-icons/react/dist/ssr";
import { Modal } from "@/components/admin/modal";
import { sendDocumentByEmail, type SendDocumentState } from "@/lib/actions/payments";
import { fillEmailTemplate, renderInvoiceEmailBody } from "@/lib/invoice-email-templates";
import { escapeHtml } from "@/lib/html-escape";
import { formatFileSize } from "@/lib/files";

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const ICON_BUTTON =
  "flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink";

interface CompanyDocumentOption {
  id: string;
  fileName: string;
}

// Aperçu + validation avant chaque envoi (demande du 2026-09-08 : "possibilité
// d'ajouter des pièces jointes... avant chaque envoi, il faut une
// validation : contenu du mail (aperçu) et valider chaque pièce jointe avec
// un aperçu") — remplace l'ancien clic direct sur "Envoyer le document".
// Trois sources de pièces jointes, toutes facultatives en plus du document
// lui-même : documents Commercial/Société existants (ex. RIB), PDF ajoutés
// depuis l'ordinateur (usage unique, jamais enregistrés ailleurs — choix
// confirmé), et le récapitulatif mensuel régénéré à la volée. L'aperçu de
// l'email réutilise exactement les mêmes fonctions que l'envoi réel
// (invoice-email-templates.ts, sans garde `server-only`) pour ne jamais
// diverger de ce qui sera vraiment envoyé.
export function SendDocumentDialog({
  documentId,
  fileName,
  billingEmail,
  clientId,
  emailSubjectTemplate,
  emailBodyTemplate,
  companyDocuments,
}: {
  documentId: string;
  fileName: string;
  billingEmail: string;
  clientId: string;
  emailSubjectTemplate: string;
  emailBodyTemplate: string;
  companyDocuments: CompanyDocumentOption[];
}) {
  const [open, setOpen] = useState(false);
  // `previewUrl` créée une seule fois par fichier (à l'ajout), pas à chaque
  // rendu — `URL.createObjectURL` dans un `.map()` en créerait une nouvelle
  // à chaque re-rendu sans jamais la révoquer.
  const [uploadedFiles, setUploadedFiles] = useState<{ file: File; previewUrl: string }[]>([]);
  const [includeRecap, setIncludeRecap] = useState(false);
  const now = new Date();
  const [recapAnnee, setRecapAnnee] = useState(String(now.getFullYear()));
  const [recapMois, setRecapMois] = useState(String(now.getMonth() + 1));

  const fileInputId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const boundAction = sendDocumentByEmail.bind(null, documentId);
  const [state, formAction, pending] = useActionState<SendDocumentState, FormData>(
    boundAction,
    undefined,
  );
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && state?.success) {
      setOpen(false);
      uploadedFiles.forEach((entry) => URL.revokeObjectURL(entry.previewUrl));
      setUploadedFiles([]);
      setIncludeRecap(false);
      formRef.current?.reset();
    }
    wasPending.current = pending;
    // `uploadedFiles` lu uniquement pour la révocation au succès, pas une
    // dépendance de déclenchement (sinon l'effet tournerait à chaque
    // ajout/retrait).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, state]);

  function syncFileInput(next: { file: File; previewUrl: string }[]) {
    setUploadedFiles(next);
    const input = document.getElementById(fileInputId) as HTMLInputElement | null;
    if (!input) return;
    const dataTransfer = new DataTransfer();
    next.forEach((entry) => dataTransfer.items.add(entry.file));
    input.files = dataTransfer.files;
  }

  function addFiles(selected: File[]) {
    syncFileInput([
      ...uploadedFiles,
      ...selected.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
    ]);
  }

  function removeFile(index: number) {
    const removed = uploadedFiles[index];
    if (removed) URL.revokeObjectURL(removed.previewUrl);
    syncFileInput(uploadedFiles.filter((_, i) => i !== index));
  }

  const currentYear = now.getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const emailSubject = fillEmailTemplate(emailSubjectTemplate, { fichier: fileName });
  const emailHtml = renderInvoiceEmailBody(emailBodyTemplate, { fichier: escapeHtml(fileName) });

  function openRecapPreview() {
    const params = new URLSearchParams({
      clientId,
      annee: recapAnnee,
      mois: recapMois,
      preview: "1",
    });
    window.open(`/api/exports/facturation?${params.toString()}`, "_blank");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Envoyer le document"
        aria-label="Envoyer le document"
        className={ICON_BUTTON}
      >
        <PaperPlaneTilt size={16} weight="regular" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={`Envoyer "${fileName}"`}>
        <form ref={formRef} action={formAction} className="flex flex-col gap-6">
          <p className="text-sm text-ink-muted">
            À : <span className="text-ink">{billingEmail}</span>
          </p>

          {/* Aperçu du mail — mêmes fonctions que l'envoi réel, voir
              invoice-email-templates.ts. */}
          <section className="grid gap-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Contenu du mail
            </h3>
            <div className="rounded-xl border border-line bg-surface-elevated p-4">
              <p className="text-sm font-medium text-ink">{emailSubject}</p>
              <div
                className="mt-2 text-sm text-ink-muted [&_p]:m-0"
                dangerouslySetInnerHTML={{ __html: emailHtml }}
              />
            </div>
          </section>

          {/* Pièces jointes */}
          <section className="grid gap-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Pièces jointes
            </h3>

            <div className="flex items-center gap-2 rounded-xl bg-surface-elevated px-3 py-2 text-sm">
              <FileIcon size={15} weight="regular" className="shrink-0 text-ink-muted" />
              <span className="min-w-0 flex-1 truncate text-ink">{fileName}</span>
              <span className="shrink-0 text-xs text-ink-muted">toujours incluse</span>
            </div>

            {companyDocuments.length > 0 && (
              <div className="grid gap-1.5">
                <p className="text-xs text-ink-muted">Documents Commercial / Société</p>
                {companyDocuments.map((doc) => (
                  <label
                    key={doc.id}
                    className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="companyDocumentIds"
                      value={doc.id}
                      className="accent-accent"
                    />
                    <span className="min-w-0 flex-1 truncate text-ink">{doc.fileName}</span>
                    <a
                      href={`/api/fichiers/documents-societe/${doc.id}?preview=1`}
                      target="_blank"
                      rel="noreferrer"
                      title="Aperçu"
                      aria-label={`Aperçu de ${doc.fileName}`}
                      className="shrink-0 text-ink-muted transition-colors hover:text-accent"
                    >
                      <Eye size={16} weight="regular" />
                    </a>
                  </label>
                ))}
              </div>
            )}

            <div className="grid gap-1.5">
              <p className="text-xs text-ink-muted">Depuis l&apos;ordinateur</p>
              <input
                id={fileInputId}
                type="file"
                name="uploadedFiles"
                multiple
                accept="application/pdf"
                className="sr-only"
                onChange={(event) => addFiles(Array.from(event.target.files ?? []))}
              />
              <label
                htmlFor={fileInputId}
                className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-accent"
              >
                <UploadSimple size={15} weight="regular" className="text-accent" />
                Ajouter un PDF
              </label>
              {uploadedFiles.map(({ file, previewUrl }, index) => (
                <div
                  key={`${file.name}-${file.lastModified}-${index}`}
                  className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm"
                >
                  <FileIcon size={15} weight="regular" className="shrink-0 text-ink-muted" />
                  <span className="min-w-0 flex-1 truncate text-ink">{file.name}</span>
                  <span className="shrink-0 text-xs text-ink-muted">{formatFileSize(file.size)}</span>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Aperçu"
                    aria-label={`Aperçu de ${file.name}`}
                    className="shrink-0 text-ink-muted transition-colors hover:text-accent"
                  >
                    <Eye size={16} weight="regular" />
                  </a>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    aria-label={`Retirer ${file.name}`}
                    className="shrink-0 text-ink-muted transition-colors hover:text-danger"
                  >
                    <X size={14} weight="regular" />
                  </button>
                </div>
              ))}
            </div>

            <div className="grid gap-2">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  name="includeMonthlyRecap"
                  checked={includeRecap}
                  onChange={(event) => setIncludeRecap(event.target.checked)}
                  className="accent-accent"
                />
                Joindre le récapitulatif mensuel
              </label>
              {includeRecap && (
                <div className="flex flex-wrap items-center gap-2 pl-6">
                  <select
                    name="recapAnnee"
                    value={recapAnnee}
                    onChange={(event) => setRecapAnnee(event.target.value)}
                    className="rounded-xl border border-line bg-surface-elevated px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                  <select
                    name="recapMois"
                    value={recapMois}
                    onChange={(event) => setRecapMois(event.target.value)}
                    className="rounded-xl border border-line bg-surface-elevated px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                  >
                    {MONTH_NAMES.map((label, index) => (
                      <option key={label} value={index + 1}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={openRecapPreview}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent"
                  >
                    <Eye size={14} weight="regular" />
                    Aperçu
                  </button>
                </div>
              )}
            </div>
          </section>

          {state?.error && (
            <div className="flex items-center gap-2 text-sm text-danger">
              <WarningCircle size={16} weight="fill" />
              {state.error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-line px-5 py-2.5 text-sm text-ink transition-colors hover:border-accent"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {pending ? "Envoi..." : "Confirmer l'envoi"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
