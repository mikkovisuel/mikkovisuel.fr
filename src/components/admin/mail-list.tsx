"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArrowCounterClockwise, Envelope, EnvelopeOpen, Star, Tag, Tray, Trash } from "@phosphor-icons/react";
import { mailModify } from "@/lib/actions/mail";

// Liste des conversations de l'onglet Mail (2026-10-21), façon Gmail :
// cases à cocher, actions groupées, étoile, repère client / prospect.

export interface MailRow {
  id: string;
  who: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
  starred: boolean;
  count: number;
  link: { type: "client" | "prospect"; name: string } | null;
}

const TIME = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
const DAY = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });
const FULL = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Europe/Paris" });

function shortDate(iso: string) {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  if (DAY.format(date) === DAY.format(now) && date.getFullYear() === now.getFullYear()) return TIME.format(date);
  return date.getFullYear() === now.getFullYear() ? DAY.format(date) : FULL.format(date);
}

const ICON = "flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink/[0.08] hover:text-ink disabled:opacity-40";

export function MailList({
  rows,
  folder,
  labels,
  backQuery,
}: {
  rows: MailRow[];
  folder: string;
  labels: { id: string; name: string }[];
  /** Paramètres de la vue, pour revenir au bon dossier depuis une conversation. */
  backQuery: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const ids = [...selected];
  const all = rows.length > 0 && selected.size === rows.length;

  function run(operation: Parameters<typeof mailModify>[1], threadIds = ids, labelId?: string) {
    if (threadIds.length === 0) return;
    setError(null);
    startTransition(async () => {
      const result = await mailModify(threadIds, operation, labelId);
      if (result.error) setError(result.error);
      else setSelected(new Set());
      router.refresh();
    });
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const none = selected.size === 0 || isPending;

  return (
    <div>
      <div className="flex min-h-12 flex-wrap items-center gap-0.5 border-b border-line px-2">
        <input
          type="checkbox"
          checked={all}
          onChange={() => setSelected(all ? new Set() : new Set(rows.map((row) => row.id)))}
          aria-label="Tout sélectionner"
          className="mx-2 h-4 w-4 accent-accent"
        />
        {folder === "corbeille" ? (
          <button type="button" disabled={none} onClick={() => run("untrash")} title="Restaurer" aria-label="Restaurer" className={ICON}>
            <ArrowCounterClockwise size={18} />
          </button>
        ) : (
          <>
            {folder === "reception" ? (
              <button type="button" disabled={none} onClick={() => run("archive")} title="Archiver" aria-label="Archiver" className={ICON}>
                <Archive size={18} />
              </button>
            ) : (
              <button type="button" disabled={none} onClick={() => run("inbox")} title="Remettre dans la boîte de réception" aria-label="Remettre dans la boîte de réception" className={ICON}>
                <Tray size={18} />
              </button>
            )}
            <button type="button" disabled={none} onClick={() => run("trash")} title="Supprimer (corbeille)" aria-label="Supprimer" className={ICON}>
              <Trash size={18} />
            </button>
          </>
        )}
        <button type="button" disabled={none} onClick={() => run("read")} title="Marquer comme lu" aria-label="Marquer comme lu" className={ICON}>
          <EnvelopeOpen size={18} />
        </button>
        <button type="button" disabled={none} onClick={() => run("unread")} title="Marquer comme non lu" aria-label="Marquer comme non lu" className={ICON}>
          <Envelope size={18} />
        </button>
        {labels.length > 0 && (
          <label className={`${ICON} relative w-auto gap-1 px-2`} title="Ajouter un libellé">
            <Tag size={18} />
            <select
              disabled={none}
              value=""
              onChange={(event) => run("addLabel", ids, event.target.value)}
              aria-label="Ajouter un libellé"
              className="absolute inset-0 cursor-pointer opacity-0"
            >
              <option value="">Libellé…</option>
              {labels.map((label) => (
                <option key={label.id} value={label.id}>
                  {label.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {selected.size > 0 && <span className="ml-2 text-xs text-ink-muted">{selected.size} sélectionnée{selected.size > 1 ? "s" : ""}</span>}
        {error && <span className="ml-2 text-xs text-danger">{error}</span>}
      </div>

      {rows.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-ink-muted">Aucune conversation ici.</p>
      ) : (
        <ul>
          {rows.map((row) => (
            <li
              key={row.id}
              className={`group flex items-center gap-1 border-b border-line pl-2 pr-4 text-sm transition-shadow hover:z-10 hover:shadow-[inset_1px_0_0_var(--color-line),inset_-1px_0_0_var(--color-line),0_1px_2px_rgba(0,0,0,0.15)] ${
                selected.has(row.id) ? "bg-select" : row.unread ? "" : "bg-ink/[0.025]"
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(row.id)}
                onChange={() => toggle(row.id)}
                aria-label={`Sélectionner « ${row.subject} »`}
                className="mx-2 h-4 w-4 shrink-0 accent-accent"
              />
              <button
                type="button"
                onClick={() => run(row.starred ? "unstar" : "star", [row.id])}
                aria-label={row.starred ? "Retirer l'étoile" : "Suivre (étoile)"}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-ink/[0.08]"
              >
                <Star size={17} weight={row.starred ? "fill" : "regular"} className={row.starred ? "text-amber-500" : "text-ink-muted"} />
              </button>
              <Link href={`/admin/mail/${row.id}?${backQuery}`} className="flex min-w-0 flex-1 items-center gap-3 py-2.5">
                <span className={`flex w-44 shrink-0 items-center gap-1.5 truncate ${row.unread ? "font-semibold text-ink" : "text-ink"}`}>
                  <span className="truncate">{row.who}</span>
                  {row.count > 1 && <span className="shrink-0 text-xs font-normal text-ink-muted">{row.count}</span>}
                </span>
                {row.link && (
                  <span
                    title={row.link.name}
                    className="hidden shrink-0 rounded-full border border-[var(--color-outline)] px-2 text-[11px] text-ink-muted sm:inline"
                  >
                    {row.link.type === "client" ? "client" : "prospect"}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate">
                  <span className={row.unread ? "font-semibold text-ink" : "text-ink"}>{row.subject}</span>
                  <span className="text-ink-muted"> — {row.snippet}</span>
                </span>
                <span className={`shrink-0 text-xs ${row.unread ? "font-semibold text-ink" : "text-ink-muted"}`}>{shortDate(row.date)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
