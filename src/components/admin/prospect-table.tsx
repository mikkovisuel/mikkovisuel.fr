import Link from "next/link";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { ProspectInlineField } from "@/components/admin/prospect-inline-field";
import { ProspectReminderField } from "@/components/admin/prospect-reminder-field";
import { ProspectStatusSelect } from "@/components/admin/prospect-status-select";
import { isProspectReminderOverdue } from "@/lib/prospects";

interface TableProspect {
  id: string;
  name: string;
  company: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  instagramUrl: string | null;
  whatsappUrl: string | null;
  activityLevel: string | null;
  nextReminderAt: Date | null;
  source: string;
  status: { slug: string; color: string };
  convertedClient: { id: string; name: string } | null;
}

const COLUMNS = [
  "Nom",
  "Ville",
  "Entreprise",
  "Téléphone",
  "Email",
  "Instagram",
  "Lien Instagram",
  "Lien WhatsApp",
  "Activité",
  "Relance",
  "Statut",
];

// Petit lien d'ouverture affiché à côté d'une cellule URL (Instagram/
// WhatsApp) quand elle est renseignée — la cellule reste éditable en texte
// libre, ce lien évite juste un copier-coller pour l'ouvrir.
function CellOpenLink({ href }: { href: string }) {
  const url = /^https?:\/\//.test(href) ? href : `https://${href}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title="Ouvrir le lien"
      className="shrink-0 rounded p-1 text-ink-muted transition-colors hover:text-ink"
    >
      <ArrowSquareOut size={13} weight="regular" />
    </a>
  );
}

// Vue Liste de la prospection, façon tableur : chaque coordonnée s'édite
// directement dans la cellule (ProspectInlineField/ProspectReminderField,
// même pattern que PaymentRecordDateField pour les Finances) au lieu de
// renvoyer vers la fiche pour un simple changement de téléphone ou d'email.
// La pastille de statut reste le même ProspectStatusSelect que le Kanban.
// La fiche complète (notes, email, historique, suppression) reste à un clic
// via l'icône d'ouverture en fin de ligne.
export function ProspectTable({
  prospects,
  statuses,
}: {
  prospects: TableProspect[];
  statuses: { slug: string; label: string }[];
}) {
  if (prospects.length === 0) {
    return <p className="mt-8 text-sm text-ink-muted">Aucun prospect pour le moment.</p>;
  }

  return (
    <div className="mt-8 overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-[1440px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
            {COLUMNS.map((label) => (
              <th key={label} className="px-2 py-3 font-medium first:pl-6">
                {label}
              </th>
            ))}
            <th className="w-10 py-3 pr-6">
              <span className="sr-only">Ouvrir la fiche</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {prospects.map((prospect) => {
            const reminderOverdue = isProspectReminderOverdue(prospect);
            return (
              <tr key={prospect.id}>
                <td className="min-w-[11rem] py-1.5 pl-4">
                  <div className="flex items-center gap-1.5">
                    <ProspectInlineField prospectId={prospect.id} field="name" defaultValue={prospect.name} />
                    {prospect.source === "recherche_ia" && (
                      <span
                        title="Trouvé par la recherche IA"
                        className="shrink-0 rounded-full border border-line px-1.5 py-0.5 text-[10px] text-ink-muted"
                      >
                        IA
                      </span>
                    )}
                  </div>
                  {prospect.convertedClient && (
                    <Link
                      href={`/admin/clients/${prospect.convertedClient.id}`}
                      className="ml-2 inline-block text-xs font-medium text-accent hover:underline"
                    >
                      Fiche client →
                    </Link>
                  )}
                </td>
                <td className="min-w-[8rem] py-1.5">
                  <ProspectInlineField prospectId={prospect.id} field="city" defaultValue={prospect.city ?? ""} />
                </td>
                <td className="min-w-[9rem] py-1.5">
                  <ProspectInlineField
                    prospectId={prospect.id}
                    field="company"
                    defaultValue={prospect.company ?? ""}
                  />
                </td>
                <td className="min-w-[8rem] py-1.5">
                  <ProspectInlineField
                    prospectId={prospect.id}
                    field="phone"
                    type="tel"
                    defaultValue={prospect.phone ?? ""}
                  />
                </td>
                <td className="min-w-[11rem] py-1.5">
                  <ProspectInlineField
                    prospectId={prospect.id}
                    field="email"
                    type="email"
                    defaultValue={prospect.email ?? ""}
                  />
                </td>
                <td className="min-w-[9rem] py-1.5">
                  <ProspectInlineField
                    prospectId={prospect.id}
                    field="instagram"
                    defaultValue={prospect.instagram ?? ""}
                  />
                </td>
                <td className="min-w-[10rem] py-1.5">
                  <div className="flex items-center gap-0.5">
                    <ProspectInlineField
                      prospectId={prospect.id}
                      field="instagramUrl"
                      defaultValue={prospect.instagramUrl ?? ""}
                    />
                    {prospect.instagramUrl && <CellOpenLink href={prospect.instagramUrl} />}
                  </div>
                </td>
                <td className="min-w-[10rem] py-1.5">
                  <div className="flex items-center gap-0.5">
                    <ProspectInlineField
                      prospectId={prospect.id}
                      field="whatsappUrl"
                      defaultValue={prospect.whatsappUrl ?? ""}
                    />
                    {prospect.whatsappUrl && <CellOpenLink href={prospect.whatsappUrl} />}
                  </div>
                </td>
                <td className="min-w-[9rem] py-1.5">
                  <ProspectInlineField
                    prospectId={prospect.id}
                    field="activityLevel"
                    defaultValue={prospect.activityLevel ?? ""}
                  />
                </td>
                <td className="min-w-[9rem] py-1.5">
                  <ProspectReminderField
                    prospectId={prospect.id}
                    date={prospect.nextReminderAt ? prospect.nextReminderAt.toISOString().slice(0, 10) : ""}
                  />
                  {reminderOverdue && <p className="mt-1 text-[10px] font-medium text-danger">En retard</p>}
                </td>
                <td className="py-1.5">
                  <ProspectStatusSelect
                    prospectId={prospect.id}
                    currentSlug={prospect.status.slug}
                    currentColor={prospect.status.color}
                    statuses={statuses}
                  />
                </td>
                <td className="py-1.5 pr-4 text-right">
                  <Link
                    href={`/admin/prospection/${prospect.id}`}
                    aria-label={`Ouvrir la fiche de ${prospect.name}`}
                    title="Ouvrir la fiche"
                    className="inline-flex items-center justify-center rounded-lg p-1.5 text-ink-muted transition-colors hover:text-ink"
                  >
                    <ArrowSquareOut size={16} weight="regular" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
