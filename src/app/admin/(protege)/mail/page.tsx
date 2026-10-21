import type { Metadata } from "next";
import Link from "next/link";
import { CaretLeft, CaretRight, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { extractEmailAddress, listThreads, listUserLabels } from "@/lib/gmail";
import { linksForAddresses } from "@/lib/mail-links";
import { MAIL_FOLDERS, decodeEntities } from "@/lib/mail-folders";
import { MailList, type MailRow } from "@/components/admin/mail-list";

export const metadata: Metadata = { title: "Mail — Admin Mikko Visuel" };

function displayName(header: string) {
  const name = header.replace(/<[^>]*>/, "").replace(/"/g, "").trim();
  return name || extractEmailAddress(header);
}

export default async function MailPage({
  searchParams,
}: {
  searchParams: Promise<{ dossier?: string; libelle?: string; q?: string; page?: string; prev?: string }>;
}) {
  const admin = await verifyAdminSession();
  const { dossier, libelle, q, page, prev } = await searchParams;
  const folder = MAIL_FOLDERS.find((entry) => entry.key === dossier) ?? (libelle ? null : MAIL_FOLDERS[0]);
  const labelId = libelle ?? folder?.labelId;

  const [{ threads, nextPageToken, estimate }, labels] = await Promise.all([
    listThreads({ labelId: q ? undefined : labelId, query: q || undefined, pageToken: page }),
    listUserLabels(),
  ]);
  const links = await linksForAddresses(threads.flatMap((thread) => [thread.lastMessageFrom, thread.lastMessageTo]));
  const mine = (admin.gmailEmail ?? "").toLowerCase();

  const rows: MailRow[] = threads.map((thread) => {
    const fromMe = extractEmailAddress(thread.lastMessageFrom).toLowerCase() === mine;
    const other = fromMe ? thread.lastMessageTo : thread.lastMessageFrom;
    const link = links[extractEmailAddress(other.split(",")[0] ?? "").toLowerCase()] ?? null;
    return {
      id: thread.id,
      who: fromMe ? `À : ${displayName(other.split(",")[0] ?? "")}` : displayName(thread.lastMessageFrom),
      subject: thread.subject,
      snippet: decodeEntities(thread.snippet),
      date: thread.lastMessageDate?.toISOString() ?? "",
      unread: thread.isUnread,
      starred: thread.labelIds.includes("STARRED"),
      count: thread.messageCount,
      link: link ? { type: link.type, name: link.name } : null,
    };
  });

  const base = new URLSearchParams();
  if (dossier) base.set("dossier", dossier);
  if (libelle) base.set("libelle", libelle);
  if (q) base.set("q", q);
  const withPage = (token: string | null, previous?: string) => {
    const params = new URLSearchParams(base);
    if (token) params.set("page", token);
    if (previous) params.set("prev", previous);
    return `/admin/mail?${params.toString()}`;
  };

  return (
    <div className="pb-6">
      <form action="/admin/mail" className="px-3 pt-3 sm:px-4">
        {dossier && <input type="hidden" name="dossier" value={dossier} />}
        {libelle && <input type="hidden" name="libelle" value={libelle} />}
        <label className="relative block max-w-2xl">
          <MagnifyingGlass size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            name="q"
            defaultValue={q}
            data-admin-search
            placeholder="Rechercher dans les e-mails (ex. from:bokao has:attachment)"
            aria-label="Rechercher dans les e-mails"
            className="h-11 w-full rounded-full bg-search pl-11 pr-4 text-sm text-ink focus:bg-surface focus:outline-none focus:ring-1 focus:ring-line"
          />
        </label>
      </form>
      <div className="mt-2 flex items-center justify-end gap-1 px-4 text-xs text-ink-muted">
        {q ? `Résultats pour « ${q} »` : null}
        <span className="ml-auto">{estimate > 0 ? `≈ ${estimate} conversations` : ""}</span>
        {page && (
          <Link href={withPage(prev ?? null)} aria-label="Page précédente" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-ink/[0.08]">
            <CaretLeft size={16} />
          </Link>
        )}
        {nextPageToken && (
          <Link href={withPage(nextPageToken, page)} aria-label="Page suivante" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-ink/[0.08]">
            <CaretRight size={16} />
          </Link>
        )}
      </div>
      <MailList rows={rows} folder={folder?.key ?? "libelle"} labels={labels} backQuery={base.toString()} />
    </div>
  );
}
