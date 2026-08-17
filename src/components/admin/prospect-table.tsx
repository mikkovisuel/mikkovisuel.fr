"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { PencilSimple, InstagramLogo, WhatsappLogo, EnvelopeSimple } from "@phosphor-icons/react";
import { ProspectInlineField } from "@/components/admin/prospect-inline-field";
import { ProspectReminderField } from "@/components/admin/prospect-reminder-field";
import { ProspectStatusSelect } from "@/components/admin/prospect-status-select";
import { bulkSetProspectStatus, bulkDeleteProspects } from "@/lib/actions/prospects";
import { isProspectReminderOverdue } from "@/lib/prospects";
import { buildGmailComposeUrl } from "@/lib/mail-draft";
import type { ProspectStatusSlug } from "@/lib/dropdown-lists";

interface TableProspect {
  id: string;
  name: string;
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
  "Ville",
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
//
// Sélection multi-lignes (2026-08-17, demande explicite "comme les
// tâches") : même pattern que TaskTable (src/components/admin/task-table.tsx)
// — case à cocher par ligne + "tout sélectionner" dans l'en-tête, barre
// d'actions groupées (changer le statut / supprimer) qui n'apparaît que
// si au moins une ligne est sélectionnée. Passage en composant client
// pour porter cet état (déjà partiellement client via les champs éditables
// en place ; seule la coquille du tableau était encore un Server Component).
export function ProspectTable({
  prospects,
  statuses,
}: {
  prospects: TableProspect[];
  statuses: { slug: string; label: string }[];
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatusKey, setBulkStatusKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  if (prospects.length === 0) {
    return <p className="mt-8 text-sm text-ink-muted">Aucun prospect pour le moment.</p>;
  }

  const allSelected = selectedIds.size > 0 && selectedIds.size === prospects.length;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(prospects.map((prospect) => prospect.id)));
  }

  function handleBulkStatus(slug: string) {
    if (!slug) return;
    const ids = [...selectedIds];
    startTransition(async () => {
      await bulkSetProspectStatus(ids, slug as ProspectStatusSlug);
      setSelectedIds(new Set());
      setBulkStatusKey((key) => key + 1);
    });
  }

  function handleBulkDelete() {
    const count = selectedIds.size;
    if (!window.confirm(`Supprimer définitivement ${count} prospect${count > 1 ? "s" : ""} ?`)) return;
    const ids = [...selectedIds];
    startTransition(async () => {
      await bulkDeleteProspects(ids);
      setSelectedIds(new Set());
    });
  }

  return (
    <div className="mt-8">
      {selectedIds.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          <span className="font-medium text-ink">
            {selectedIds.size} prospect{selectedIds.size > 1 ? "s" : ""} sélectionné
            {selectedIds.size > 1 ? "s" : ""}
          </span>
          <select
            key={bulkStatusKey}
            defaultValue=""
            disabled={isPending}
            onChange={(event) => handleBulkStatus(event.target.value)}
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
          >
            <option value="">Changer le statut…</option>
            {statuses.map((option) => (
              <option key={option.slug} value={option.slug}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={isPending}
            onClick={handleBulkDelete}
            className="rounded-full border border-line px-3 py-1.5 text-xs text-ink transition-colors hover:border-danger hover:bg-danger hover:text-white disabled:opacity-60"
          >
            Supprimer
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-ink-muted transition-colors hover:text-ink"
          >
            Annuler la sélection
          </button>
        </div>
      )}
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-line text-left text-[11px] font-medium uppercase tracking-wide text-ink-muted">
              <th className="w-7 py-2 pl-3 font-medium">
                <input
                  type="checkbox"
                  aria-label="Tout sélectionner"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-3.5 w-3.5 accent-accent"
                />
              </th>
              <th className="px-1.5 py-2 font-medium">Nom</th>
              {COLUMNS.map((label) => (
                <th key={label} className="px-1.5 py-2 font-medium">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {prospects.map((prospect) => {
              const reminderOverdue = isProspectReminderOverdue(prospect);
              return (
                <tr key={prospect.id} className={selectedIds.has(prospect.id) ? "bg-accent/5" : undefined}>
                  <td className="py-1 pl-3">
                    <input
                      type="checkbox"
                      aria-label={`Sélectionner ${prospect.name}`}
                      checked={selectedIds.has(prospect.id)}
                      onChange={() => toggleSelect(prospect.id)}
                      className="h-3.5 w-3.5 accent-accent"
                    />
                  </td>
                  <td className="min-w-[9rem] py-1">
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
                  <td className="min-w-[6rem] py-1">
                    <ProspectInlineField
                      prospectId={prospect.id}
                      field="phone"
                      type="tel"
                      defaultValue={prospect.phone ?? ""}
                    />
                  </td>
                  <td className="min-w-[9rem] py-1">
                    <div className="flex items-center gap-0.5">
                      <ProspectInlineField
                        prospectId={prospect.id}
                        field="email"
                        type="email"
                        defaultValue={prospect.email ?? ""}
                      />
                      {prospect.email && (
                        <CellOpenLink
                          href={buildGmailComposeUrl({ to: prospect.email })}
                          label="Envoyer un mail (Gmail)"
                          icon={<EnvelopeSimple size={14} weight="regular" />}
                        />
                      )}
                    </div>
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
    </div>
  );
}
