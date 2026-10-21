"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowBendDoubleUpLeft,
  ArrowBendUpLeft,
  ArrowBendUpRight,
  ArrowLeft,
  ArrowSquareOut,
  CheckSquare,
  Envelope,
  NotePencil,
  Sparkle,
  Star,
  Tag,
  Trash,
  User,
} from "@phosphor-icons/react";
import { createNoteFromMail, createTaskFromMail, mailModify } from "@/lib/actions/mail";
import { MailComposer } from "@/components/admin/mail-composer";

// Conversation de l'onglet Mail (2026-10-21) : barre d'actions, liens vers
// l'admin (fiche, tâche, note, assistant) et zone de réponse.

const ICON = "flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink/[0.08] hover:text-ink";
const CHIP = "inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--color-outline)] px-3 text-sm text-ink transition-colors hover:bg-ink/[0.04] disabled:opacity-50";

export function MailThreadToolbar({
  threadId,
  backHref,
  starred,
  inTrash,
  labels,
}: {
  threadId: string;
  backHref: string;
  starred: boolean;
  inTrash: boolean;
  labels: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function run(operation: Parameters<typeof mailModify>[1], leave = false, labelId?: string) {
    setError(null);
    startTransition(async () => {
      const result = await mailModify([threadId], operation, labelId);
      if (result.error) return setError(result.error);
      if (leave) router.push(backHref);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-line px-2 py-1">
      <Link href={backHref} aria-label="Retour à la liste" title="Retour" className={ICON}>
        <ArrowLeft size={18} />
      </Link>
      <button type="button" onClick={() => run("archive", true)} title="Archiver" aria-label="Archiver" className={ICON}>
        <Archive size={18} />
      </button>
      <button type="button" onClick={() => run(inTrash ? "untrash" : "trash", true)} title={inTrash ? "Restaurer" : "Supprimer"} aria-label={inTrash ? "Restaurer" : "Supprimer"} className={ICON}>
        <Trash size={18} />
      </button>
      <button type="button" onClick={() => run("unread", true)} title="Marquer comme non lu" aria-label="Marquer comme non lu" className={ICON}>
        <Envelope size={18} />
      </button>
      <button type="button" onClick={() => run(starred ? "unstar" : "star")} title={starred ? "Retirer l'étoile" : "Suivre"} aria-label={starred ? "Retirer l'étoile" : "Suivre"} className={ICON}>
        <Star size={18} weight={starred ? "fill" : "regular"} className={starred ? "text-amber-500" : undefined} />
      </button>
      {labels.length > 0 && (
        <label className={`${ICON} relative`} title="Ajouter un libellé">
          <Tag size={18} />
          <select value="" onChange={(event) => run("addLabel", false, event.target.value)} aria-label="Ajouter un libellé" className="absolute inset-0 cursor-pointer opacity-0">
            <option value="">Libellé…</option>
            {labels.map((label) => (
              <option key={label.id} value={label.id}>
                {label.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {error && <span className="ml-2 text-xs text-danger">{error}</span>}
      <a
        href={`https://mail.google.com/mail/u/0/#all/${threadId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="ml-auto inline-flex items-center gap-1 px-2 text-xs text-ink-muted hover:text-ink"
      >
        <ArrowSquareOut size={14} /> Ouvrir dans Gmail
      </a>
    </div>
  );
}

export function MailThreadLinks({
  threadId,
  subject,
  links,
}: {
  threadId: string;
  subject: string;
  links: { type: "client" | "prospect"; id: string; name: string }[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<{ text: string; href?: string; error?: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const client = links.find((link) => link.type === "client");
  const prospect = links.find((link) => link.type === "prospect");

  function done(result: { error?: string; href?: string }, label: string) {
    setMessage(result.error ? { text: result.error, error: true } : { text: label, href: result.href });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {links.map((link) => (
        <Link key={`${link.type}-${link.id}`} href={link.type === "client" ? `/admin/clients/${link.id}` : `/admin/prospection/${link.id}`} className={CHIP}>
          <User size={14} /> {link.type === "client" ? "Fiche client" : "Fiche prospect"} {link.name}
        </Link>
      ))}
      {client && (
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => done(await createTaskFromMail(threadId, client.id), "Tâche créée"))}
          className={CHIP}
        >
          <CheckSquare size={14} /> Créer une tâche
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () =>
            done(await createNoteFromMail(threadId, { clientId: client?.id, prospectId: prospect?.id }), "Note créée"),
          )
        }
        className={CHIP}
      >
        <NotePencil size={14} /> Créer une note
      </button>
      <button
        type="button"
        onClick={() =>
          window.dispatchEvent(
            new CustomEvent("assistant:ask", {
              detail: `Lis l'e-mail « ${subject} » (fil Gmail ${threadId}), résume-le en quelques lignes et propose une réponse.`,
            }),
          )
        }
        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-select px-3 text-sm text-ink transition-colors hover:brightness-95"
      >
        <Sparkle size={14} weight="fill" /> Résumer / répondre avec l&apos;assistant
      </button>
      {message && (
        <span className={`text-sm ${message.error ? "text-danger" : "text-ink"}`}>
          {message.text}
          {message.href && (
            <>
              {" · "}
              <button type="button" onClick={() => router.push(message.href!)} className="underline">
                ouvrir
              </button>
            </>
          )}
        </span>
      )}
    </div>
  );
}

export function MailReplyBox({
  threadId,
  replyTo,
  replyAllCc,
}: {
  threadId: string;
  replyTo: string;
  replyAllCc: string;
}) {
  const [mode, setMode] = useState<"reply" | "replyAll" | "forward" | null>(null);
  if (!mode) {
    return (
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setMode("reply")} className={CHIP}>
          <ArrowBendUpLeft size={16} /> Répondre
        </button>
        {replyAllCc && (
          <button type="button" onClick={() => setMode("replyAll")} className={CHIP}>
            <ArrowBendDoubleUpLeft size={16} /> Répondre à tous
          </button>
        )}
        <button type="button" onClick={() => setMode("forward")} className={CHIP}>
          <ArrowBendUpRight size={16} /> Transférer
        </button>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-line p-4">
      <p className="mb-2 text-sm font-medium text-ink">
        {mode === "reply" ? "Répondre" : mode === "replyAll" ? "Répondre à tous" : "Transférer"}
      </p>
      <MailComposer
        key={mode}
        mode={mode}
        threadId={threadId}
        defaultTo={mode === "forward" ? "" : replyTo}
        defaultCc={mode === "replyAll" ? replyAllCc : ""}
        onDone={() => setMode(null)}
      />
    </div>
  );
}
