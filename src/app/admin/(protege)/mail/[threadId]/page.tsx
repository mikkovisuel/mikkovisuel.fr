import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DownloadSimple, Paperclip } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { extractEmailAddress, getThread, listUserLabels, modifyThreads } from "@/lib/gmail";
import { linksForAddresses } from "@/lib/mail-links";
import { formatFileSize } from "@/lib/files";
import { EmailMessageBody } from "@/components/admin/email-message-body";
import { MailReplyBox, MailThreadLinks, MailThreadToolbar } from "@/components/admin/mail-thread-actions";

export const metadata: Metadata = { title: "Conversation — Mail — Admin Mikko Visuel" };

const DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

export default async function MailThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ threadId: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const admin = await verifyAdminSession();
  const { threadId } = await params;
  const back = new URLSearchParams(await searchParams).toString();

  const [messages, labels] = await Promise.all([getThread(threadId).catch(() => []), listUserLabels()]);
  if (messages.length === 0) notFound();

  // Ouvrir une conversation la marque comme lue, comme dans Gmail (sans
  // droit de rangement, elle reste non lue : aucune erreur affichée).
  if (messages.some((message) => message.isUnread)) {
    await modifyThreads([threadId], { remove: ["UNREAD"] }).catch(() => {});
  }

  const mine = (admin.gmailEmail ?? "").toLowerCase();
  const last = messages[messages.length - 1];
  const labelIds = new Set(messages.flatMap((message) => message.labelIds));
  const addresses = (header: string) =>
    header
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part && extractEmailAddress(part).toLowerCase() !== mine);
  const lastFromMe = extractEmailAddress(last.from).toLowerCase() === mine;
  const replyTo = lastFromMe ? last.to : last.from;
  const replyAllCc = [...addresses(last.to), ...addresses(last.cc)]
    .filter((part) => extractEmailAddress(part).toLowerCase() !== extractEmailAddress(replyTo).toLowerCase())
    .join(", ");
  const linkMap = await linksForAddresses(messages.flatMap((message) => [message.from, message.to, message.cc]));
  const links = Object.values(linkMap).filter(
    (link, index, all) => all.findIndex((other) => other.type === link.type && other.id === link.id) === index,
  );

  return (
    <div className="pb-10">
      <MailThreadToolbar
        threadId={threadId}
        backHref={`/admin/mail${back ? `?${back}` : ""}`}
        starred={labelIds.has("STARRED")}
        inTrash={labelIds.has("TRASH")}
        labels={labels}
      />
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <h2 className="mt-5 text-[22px] font-normal text-ink">{last.subject}</h2>
        <div className="mt-3">
          <MailThreadLinks threadId={threadId} subject={last.subject} links={links} />
        </div>

        <div className="mt-6 flex flex-col gap-4">
          {messages.map((message) => (
            <article key={message.id} className="border-b border-line pb-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="font-medium text-ink">{message.from}</span>
                <span className="text-xs text-ink-muted">{message.date ? DATE.format(message.date) : ""}</span>
              </div>
              <p className="mt-0.5 text-xs text-ink-muted">
                à {message.to}
                {message.cc ? ` · cc ${message.cc}` : ""}
              </p>
              <div className="mt-3">
                <EmailMessageBody html={message.bodyHtml} text={message.bodyText} />
              </div>
              {message.attachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.attachments.map((attachment) => (
                    <a
                      key={attachment.attachmentId}
                      href={`/api/gmail/attachments/${message.id}/${attachment.attachmentId}?filename=${encodeURIComponent(attachment.filename)}&mimeType=${encodeURIComponent(attachment.mimeType)}`}
                      className="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-xs text-ink transition-colors hover:bg-ink/[0.04]"
                    >
                      <Paperclip size={12} /> {attachment.filename}
                      <span className="text-ink-muted">({formatFileSize(attachment.sizeBytes)})</span>
                      <DownloadSimple size={12} />
                    </a>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>

        <div className="mt-6">
          <MailReplyBox threadId={threadId} replyTo={replyTo} replyAllCc={replyAllCc} />
        </div>
      </div>
    </div>
  );
}
