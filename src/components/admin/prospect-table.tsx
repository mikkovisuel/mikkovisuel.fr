"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { EnvelopeSimple, Globe, InstagramLogo, Phone, WhatsappLogo } from "@phosphor-icons/react";
import { ProspectStatusSelect } from "@/components/admin/prospect-status-select";
import { bulkSetProspectStatus, bulkDeleteProspects } from "@/lib/actions/prospects";
import { isProspectReminderOverdue } from "@/lib/prospects";
import { buildGmailComposeUrl } from "@/lib/mail-draft";
import type { ProspectStatusSlug } from "@/lib/dropdown-lists";

// Liste des prospects, refonte « carte + liste façon Google Maps »
// (2026-10-20) : en lecture, une ligne par prospect — nom (avec ville et
// entreprise), activité, contact en icônes cliquables (e-mail, appel,
// Instagram, WhatsApp, site), relance, statut modifiable d'un clic. Le reste
// se modifie dans la fiche du prospect (clic sur le nom) ; la saisie directe
// dans les cellules a été retirée (choix du client). Sélection multiple
// conservée (changer le statut, supprimer).

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
  website: string | null;
  activityLevel: string | null;
  nextReminderAt: Date | null;
  source: string;
  status: { slug: string; color: string };
  convertedClient: { id: string; name: string } | null;
}

// Colonnes facultatives (« Mon affichage ») ; le nom est toujours affiché.
const COLUMN_LABELS: Record<string, string> = {
  activite: "Activité",
  contact: "Contact",
  relance: "Relance",
  statut: "Statut",
};
const DEFAULT_COLUMNS = Object.keys(COLUMN_LABELS);

const DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

function reminderLabel(date: Date | null) {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "aujourd'hui";
  if (diff === -1) return "hier";
  if (diff === 1) return "demain";
  return DATE.format(date);
}

function instagramHref(prospect: TableProspect) {
  if (prospect.instagramUrl) return prospect.instagramUrl;
  const handle = prospect.instagram?.replace(/^@/, "").trim();
  return handle ? `https://www.instagram.com/${handle}` : null;
}

const ICON = "flex h-7 w-7 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink/[0.08] hover:text-ink";

function ContactIcons({ prospect }: { prospect: TableProspect }) {
  const instagram = instagramHref(prospect);
  const website = prospect.website ? (/^https?:\/\//.test(prospect.website) ? prospect.website : `https://${prospect.website}`) : null;
  return (
    <span className="flex items-center">
      {prospect.email && (
        <a href={buildGmailComposeUrl({ to: prospect.email })} target="_blank" rel="noopener noreferrer" title={`E-mail : ${prospect.email}`} aria-label={`Écrire à ${prospect.email}`} className={ICON}>
          <EnvelopeSimple size={16} />
        </a>
      )}
      {prospect.phone && (
        <a href={`tel:${prospect.phone.replace(/\s/g, "")}`} title={`Appeler le ${prospect.phone}`} aria-label={`Appeler le ${prospect.phone}`} className={ICON}>
          <Phone size={16} />
        </a>
      )}
      {instagram && (
        <a href={instagram} target="_blank" rel="noopener noreferrer" title={`Instagram ${prospect.instagram ?? ""}`} aria-label="Ouvrir le profil Instagram" className={ICON}>
          <InstagramLogo size={16} />
        </a>
      )}
      {prospect.whatsappUrl && (
        <a href={prospect.whatsappUrl} target="_blank" rel="noopener noreferrer" title="WhatsApp" aria-label="Ouvrir la conversation WhatsApp" className={ICON}>
          <WhatsappLogo size={16} />
        </a>
      )}
      {website && (
        <a href={website} target="_blank" rel="noopener noreferrer" title={website} aria-label="Ouvrir le site" className={ICON}>
          <Globe size={16} />
        </a>
      )}
      {!prospect.email && !prospect.phone && !instagram && !prospect.whatsappUrl && !website && (
        <span className="text-ink-muted">—</span>
      )}
    </span>
  );
}

export function ProspectTable({
  prospects,
  statuses,
  columns: requestedColumns = DEFAULT_COLUMNS,
  emptyMessage = "Aucun prospect pour le moment.",
}: {
  prospects: TableProspect[];
  statuses: { slug: string; label: string }[];
  /** Colonnes visibles, dans l'ordre (profil de l'admin). */
  columns?: string[];
  emptyMessage?: string;
}) {
  const columns = requestedColumns.filter((key) => key in COLUMN_LABELS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatusKey, setBulkStatusKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  if (prospects.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-ink-muted">{emptyMessage}</p>;
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
    <div>
      {selectedIds.size > 0 && (
        <div className="mx-3 my-2 flex min-h-11 flex-wrap items-center gap-3 rounded-3xl bg-select px-4 py-1.5 text-sm">
          <span className="font-medium text-ink">
            {selectedIds.size} prospect{selectedIds.size > 1 ? "s" : ""} sélectionné{selectedIds.size > 1 ? "s" : ""}
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
          <button type="button" onClick={() => setSelectedIds(new Set())} className="text-xs text-ink-muted hover:text-ink">
            Annuler la sélection
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="ws-list w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-medium text-ink-muted">
              <th className="w-10 py-2 pl-4">
                <input
                  type="checkbox"
                  aria-label="Tout sélectionner"
                  checked={allSelected}
                  onChange={() => setSelectedIds(allSelected ? new Set() : new Set(prospects.map((prospect) => prospect.id)))}
                  className="h-4 w-4 accent-accent"
                />
              </th>
              <th className="py-2 pr-4 font-medium">Nom</th>
              {columns.map((key) => (
                <th key={key} className="px-3 py-2 font-medium">
                  {COLUMN_LABELS[key]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {prospects.map((prospect) => {
              const overdue = isProspectReminderOverdue(prospect);
              const reminder = reminderLabel(prospect.nextReminderAt);
              return (
                <tr key={prospect.id} className={selectedIds.has(prospect.id) ? "bg-select" : undefined}>
                  <td className="w-10 pl-4">
                    <input
                      type="checkbox"
                      aria-label={`Sélectionner ${prospect.name}`}
                      checked={selectedIds.has(prospect.id)}
                      onChange={() => toggleSelect(prospect.id)}
                      className="h-4 w-4 accent-accent"
                    />
                  </td>
                  <td className="max-w-[18rem] py-1.5 pr-4">
                    <Link href={`/admin/prospection/${prospect.id}`} className="block min-w-0 hover:underline">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-medium text-ink">{prospect.name}</span>
                        {prospect.source === "recherche_ia" && (
                          <span title="Trouvé par la recherche IA" className="shrink-0 rounded-full border border-line px-1.5 text-[10px] text-ink-muted">
                            IA
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-xs text-ink-muted">
                        {[prospect.city, prospect.company && prospect.company !== prospect.name ? prospect.company : null]
                          .filter(Boolean)
                          .join(" · ") || "Ville non renseignée"}
                      </span>
                    </Link>
                    {prospect.convertedClient && (
                      <Link href={`/admin/clients/${prospect.convertedClient.id}`} className="text-[11px] font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                        Devenu client →
                      </Link>
                    )}
                  </td>
                  {columns.map((column) => {
                    switch (column) {
                      case "activite":
                        return (
                          <td key={column} className="whitespace-nowrap px-3 text-ink-muted">
                            {prospect.activityLevel || "—"}
                          </td>
                        );
                      case "contact":
                        return (
                          <td key={column} className="px-3">
                            <ContactIcons prospect={prospect} />
                          </td>
                        );
                      case "relance":
                        return (
                          <td key={column} className="whitespace-nowrap px-3">
                            {reminder ? (
                              <span className={overdue ? "font-medium text-danger" : "text-ink"}>
                                {overdue ? "⏰ " : ""}
                                {reminder}
                              </span>
                            ) : (
                              <span className="text-ink-muted">—</span>
                            )}
                          </td>
                        );
                      case "statut":
                        return (
                          <td key={column} className="px-3 pr-4">
                            <ProspectStatusSelect
                              prospectId={prospect.id}
                              currentSlug={prospect.status.slug}
                              currentColor={prospect.status.color}
                              statuses={statuses}
                            />
                          </td>
                        );
                      default:
                        return null;
                    }
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
