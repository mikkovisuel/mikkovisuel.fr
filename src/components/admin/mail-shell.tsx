"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  EnvelopeSimple,
  File,
  Info,
  PaperPlaneTilt,
  PencilSimple,
  Star,
  Tag,
  Trash,
  Tray,
  WarningOctagon,
  Archive,
} from "@phosphor-icons/react";
import { Modal } from "@/components/admin/modal";
import { MailComposer } from "@/components/admin/mail-composer";
import { MAIL_FOLDERS } from "@/lib/mail-folders";

// Cadre de l'onglet Mail (2026-10-21) : bouton « Nouveau message » et
// dossiers / libellés à gauche, comme Gmail.
const ICONS = {
  reception: Tray,
  suivis: Star,
  importants: Info,
  envoyes: PaperPlaneTilt,
  brouillons: File,
  tous: Archive,
  spam: WarningOctagon,
  corbeille: Trash,
} as const;

export function MailShell({
  labels,
  unread,
  children,
}: {
  labels: { id: string; name: string }[];
  unread: number;
  children: React.ReactNode;
}) {
  const [composing, setComposing] = useState(false);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const onList = pathname === "/admin/mail";
  const folder = searchParams.get("dossier") ?? (searchParams.get("libelle") ? "" : "reception");
  const label = searchParams.get("libelle");

  const item = (active: boolean) =>
    `flex h-8 items-center gap-3 rounded-r-full pl-5 pr-3 text-sm transition-colors ${
      active && onList ? "bg-select font-semibold text-ink" : "text-ink hover:bg-ink/[0.06]"
    }`;

  return (
    <div className="flex min-h-[calc(100dvh-137px)]">
      <nav aria-label="Dossiers" className="hidden w-60 shrink-0 flex-col gap-0.5 py-3 pr-3 md:flex">
        <button
          type="button"
          onClick={() => setComposing(true)}
          className="mb-3 ml-3 flex h-12 w-fit items-center gap-3 rounded-2xl bg-accent pl-4 pr-5 text-sm font-medium text-accent-ink"
        >
          <PencilSimple size={18} /> Nouveau message
        </button>
        {MAIL_FOLDERS.map((entry) => {
          const Icon = ICONS[entry.key];
          return (
            <Link key={entry.key} href={`/admin/mail?dossier=${entry.key}`} className={item(!label && folder === entry.key)}>
              <Icon size={17} />
              <span className="flex-1 truncate">{entry.label}</span>
              {entry.key === "reception" && unread > 0 && <span className="text-xs font-semibold">{unread}</span>}
            </Link>
          );
        })}
        {labels.length > 0 && <p className="pb-1 pl-5 pt-4 text-xs font-medium text-ink-muted">Libellés</p>}
        {labels.map((entry) => (
          <Link key={entry.id} href={`/admin/mail?libelle=${encodeURIComponent(entry.id)}`} className={item(label === entry.id)}>
            <Tag size={17} />
            <span className="truncate">{entry.name}</span>
          </Link>
        ))}
      </nav>
      <div className="min-w-0 flex-1">
        <div className="flex gap-2 px-3 pt-3 md:hidden">
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="flex h-10 items-center gap-2 rounded-2xl bg-accent px-4 text-sm font-medium text-accent-ink"
          >
            <PencilSimple size={16} /> Nouveau
          </button>
          <select
            value={label ? `l:${label}` : folder}
            onChange={(event) => {
              const value = event.target.value;
              window.location.href = value.startsWith("l:") ? `/admin/mail?libelle=${encodeURIComponent(value.slice(2))}` : `/admin/mail?dossier=${value}`;
            }}
            aria-label="Dossier"
            className="h-10 flex-1 rounded-full border border-line bg-surface px-3 text-sm text-ink"
          >
            {MAIL_FOLDERS.map((entry) => (
              <option key={entry.key} value={entry.key}>
                {entry.label}
              </option>
            ))}
            {labels.map((entry) => (
              <option key={entry.id} value={`l:${entry.id}`}>
                {entry.name}
              </option>
            ))}
          </select>
        </div>
        {children}
      </div>
      <Modal open={composing} onClose={() => setComposing(false)} title="Nouveau message">
        <div className="flex items-center gap-2 pb-2 text-xs text-ink-muted">
          <EnvelopeSimple size={14} /> Envoyé depuis votre Gmail
        </div>
        <MailComposer mode="new" onDone={() => setComposing(false)} />
      </Modal>
    </div>
  );
}
