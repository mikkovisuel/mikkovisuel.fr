import Link from "next/link";
import { PencilSimple, InstagramLogo, WhatsappLogo } from "@phosphor-icons/react/dist/ssr";
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
  "WhatsApp",
  "Activité",
  "Relance",
  "Statut",
];

// Petite icône de réseau cliquable affichée à côté d'une cellule URL
// (Instagram/WhatsApp) quand elle est renseignée — la cellule reste éditable
// en texte libre, l'icône évite juste un copier-coller pour l'ouvrir. Logo
// du réseau plutôt qu'une flèche générique, pour reconnaître le lien d'un
// coup d'œil sans lire la colonne.
function CellOpenLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  const url = /^https?:\/\//.test(href) ? href : `https://${href}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      aria-label={label}
      className="shrink-0 rounded p-1 text-ink-muted transition-colors hover:text-ink"
    >
      {icon}
    </a>
  );
}

// Vue Liste de la prospection, façon tableur : chaque coordonnée s'édite
// directement dans la cellule (ProspectInlineField/ProspectReminderField,
// même pattern que PaymentRecordDateField pour les Finances) au lieu de
// renvoyer vers la fiche pour un simple changement de téléphone ou d'email.
// La pastille de statut reste le même ProspectStatusSelect que le Kanban.
// La fiche complète (notes, email, historique, suppression) reste à un clic
// via le crayon à côté du nom (demande du 2026-08-17 : avant en fin de
// ligne, en icône flèche générique — déplacé en tête, à côté du nom, et
// remplacé par un crayon, plus lisible comme action "éditer").
//
// Colonnes et espacements resserrés le 2026-08-17 (demande explicite :
// "que tout soit bien à l'écran") : `instagram`/`instagramUrl` partagent
// désormais une seule colonne (pseudo au-dessus, lien en dessous) au lieu
// de deux, et chaque colonne a une largeur minimale réduite au strict
// nécessaire plutôt qu'un `min-w-[1440px]` fixe sur la table entière —
// tient maintenant dans le conteneur `max-w-7xl` de la page sur un écran
// de bureau standard, le défilement horizontal (`overflow-x-auto`) restant
// le filet de sécurité pour les écrans plus étroits.
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
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-line text-left text-[11px] font-medium uppercase tracking-wide text-ink-muted">
            {COLUMNS.map((label) => (
              <th key={label} className="px-1.5 py-2 font-medium first:pl-4">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {prospects.map((prospect) => {
            const reminderOverdue = isProspectReminderOverdue(prospect);
            return (
              <tr key={prospect.id}>
                <td className="min-w-[9rem] py-1 pl-3">
                  <div className="flex items-center gap-1">
                    <ProspectInlineField prospectId={prospect.id} field="name" defaultValue={prospect.name} />
                    {prospect.source === "recherche_ia" && (
                      <span
                        title="Trouvé par la recherche IA"
                        className="shrink-0 rounded-full border border-line px-1.5 py-0.5 text-[10px] text-ink-muted"
                      >
                        IA
                      </span>
                    )}
                    <Link
                      href={`/admin/prospection/${prospect.id}`}
                      aria-label={`Ouvrir la fiche de ${prospect.name}`}
                      title="Ouvrir la fiche"
                      className="inline-flex shrink-0 items-center justify-center rounded-lg p-1 text-ink-muted transition-colors hover:text-ink"
                    >
                      <PencilSimple size={13} weight="regular" />
                    </Link>
                  </div>
                  {prospect.convertedClient && (
                    <Link
                      href={`/admin/clients/${prospect.convertedClient.id}`}
                      className="ml-2 inline-block text-[10px] font-medium text-accent hover:underline"
                    >
                      Fiche client →
                    </Link>
                  )}
                </td>
                <td className="min-w-[5.5rem] py-1">
                  <ProspectInlineField prospectId={prospect.id} field="city" defaultValue={prospect.city ?? ""} />
                </td>
                <td className="min-w-[6.5rem] py-1">
                  <ProspectInlineField
                    prospectId={prospect.id}
                    field="company"
                    defaultValue={prospect.company ?? ""}
                  />
                </td>
                <td className="min-w-[6rem] py-1">
                  <ProspectInlineField
                    prospectId={prospect.id}
                    field="phone"
                    type="tel"
                    defaultValue={prospect.phone ?? ""}
                  />
                </td>
                <td className="min-w-[8rem] py-1">
                  <ProspectInlineField
                    prospectId={prospect.id}
                    field="email"
                    type="email"
                    defaultValue={prospect.email ?? ""}
                  />
                </td>
                <td className="min-w-[7.5rem] py-1">
                  <ProspectInlineField
                    prospectId={prospect.id}
                    field="instagram"
                    placeholder="Pseudo"
                    defaultValue={prospect.instagram ?? ""}
                  />
                  <div className="flex items-center gap-0.5">
                    <ProspectInlineField
                      prospectId={prospect.id}
                      field="instagramUrl"
                      placeholder="Lien"
                      dense
                      defaultValue={prospect.instagramUrl ?? ""}
                    />
                    {prospect.instagramUrl && (
                      <CellOpenLink
                        href={prospect.instagramUrl}
                        label="Ouvrir le profil Instagram"
                        icon={<InstagramLogo size={14} weight="regular" />}
                      />
                    )}
                  </div>
                </td>
                <td className="min-w-[7.5rem] py-1">
                  <div className="flex items-center gap-0.5">
                    <ProspectInlineField
                      prospectId={prospect.id}
                      field="whatsappUrl"
                      defaultValue={prospect.whatsappUrl ?? ""}
                    />
                    {prospect.whatsappUrl && (
                      <CellOpenLink
                        href={prospect.whatsappUrl}
                        label="Ouvrir la conversation WhatsApp"
                        icon={<WhatsappLogo size={14} weight="regular" />}
                      />
                    )}
                  </div>
                </td>
                <td className="min-w-[6.5rem] py-1">
                  <ProspectInlineField
                    prospectId={prospect.id}
                    field="activityLevel"
                    defaultValue={prospect.activityLevel ?? ""}
                  />
                </td>
                <td className="min-w-[7rem] py-1">
                  <ProspectReminderField
                    prospectId={prospect.id}
                    date={prospect.nextReminderAt ? prospect.nextReminderAt.toISOString().slice(0, 10) : ""}
                  />
                  {reminderOverdue && <p className="mt-0.5 text-[10px] font-medium text-danger">En retard</p>}
                </td>
                <td className="py-1 pr-3">
                  <ProspectStatusSelect
                    prospectId={prospect.id}
                    currentSlug={prospect.status.slug}
                    currentColor={prospect.status.color}
                    statuses={statuses}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
