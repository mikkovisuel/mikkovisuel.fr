import Link from "next/link";
import { FilePdf } from "@phosphor-icons/react/dist/ssr";

interface BinDocument {
  id: string;
  fileName: string;
  client?: { name: string };
}

// Vue "Bacs" (demande du 2026-07-31) : un panier par type de document,
// juste le nom du fichier — pensée pour une vision d'ensemble rapide,
// contrairement à `DocumentRow` (une ligne détaillée par document, montant/
// statut/actions inclus) qui reste la vue par défaut. Le nom seul ouvre le
// téléchargement direct ; les actions (payer, relancer, supprimer...)
// restent réservées à la vue détaillée pour ne pas dupliquer les mêmes
// contrôles dans deux endroits.
export function DocumentBinView({
  groups,
}: {
  groups: { label: string; documents: BinDocument[] }[];
}) {
  return (
    <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => (
        <div key={group.label} className="rounded-2xl border border-line p-4">
          <h3 className="flex items-center justify-between text-sm font-medium text-ink">
            {group.label}
            <span className="text-xs font-normal text-ink-muted">{group.documents.length}</span>
          </h3>
          <ul className="mt-3 flex flex-col gap-1">
            {group.documents.length === 0 && (
              <li className="text-sm text-ink-muted">Aucun document.</li>
            )}
            {group.documents.map((doc) => (
              <li key={doc.id}>
                <Link
                  href={`/api/fichiers/documents/${doc.id}`}
                  title={doc.fileName}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink transition-colors hover:bg-surface-elevated"
                >
                  <FilePdf size={16} weight="regular" className="shrink-0 text-ink-muted" />
                  <span className="truncate">{doc.fileName}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
