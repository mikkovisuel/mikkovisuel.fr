import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Paperclip,
  DownloadSimple,
  Envelope,
  EnvelopeOpen,
} from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { getThread, extractEmailAddress } from "@/lib/gmail";
import { sendReply, forwardMessage } from "@/lib/actions/gmail-messages";
import { EmailComposer } from "@/components/admin/email-composer";
import { EmailMessageBody } from "@/components/admin/email-message-body";
import { formatFileSize } from "@/lib/files";
import { PageToolbar, PAGE_BODY } from "@/components/admin/page-toolbar";

export const metadata: Metadata = {
  title: "Fil email — Admin Mikko Visuel",
};

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function EmailThreadPage({
  params,
}: {
  params: Promise<{ clientId: string; threadId: string }>;
}) {
  await verifyAdminSession();
  const { clientId, threadId } = await params;

  const client = await db.client.findUnique({ where: { id: clientId } });
  if (!client) notFound();

  const messages = await getThread(threadId);
  if (messages.length === 0) notFound();

  const lastMessage = messages[messages.length - 1];
  const replyTo = {
    to: extractEmailAddress(lastMessage.from),
    subject: lastMessage.subject,
    messageIdHeader: lastMessage.messageIdHeader,
    referencesHeader: lastMessage.referencesHeader,
  };
  const originalBody = {
    html: lastMessage.bodyHtml,
    text: lastMessage.bodyText,
    from: lastMessage.from,
    date: lastMessage.date,
  };

  const sendReplyForThisThread = sendReply.bind(null, clientId, threadId, replyTo, originalBody);
  const forwardThisMessage = forwardMessage.bind(
    null,
    clientId,
    lastMessage.subject,
    originalBody,
  );

  return (
    <>
      <PageToolbar
        title={lastMessage.subject}
        back={{ href: `/admin/clients/${client.id}/emails`, label: `Retour aux emails de ${client.name}` }}
      />
      <div className={`${PAGE_BODY} mx-auto max-w-3xl`}>
        <div className="mt-8 flex flex-col gap-6">
          {messages.map((message) => (
            <div key={message.id} className="rounded-2xl border border-line p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 font-medium text-ink">
                  {message.isUnread ? (
                    <Envelope size={14} weight="fill" className="shrink-0 text-accent" aria-label="Non lu" />
                  ) : (
                    <EnvelopeOpen
                      size={14}
                      weight="regular"
                      className="shrink-0 text-ink-muted"
                      aria-label="Lu"
                    />
                  )}
                  {message.from}
                </span>
                <span className="text-xs text-ink-muted">
                  {message.date ? DATE_FORMATTER.format(message.date) : ""}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-ink-muted">à {message.to}</p>

              <div className="mt-3">
                <EmailMessageBody html={message.bodyHtml} text={message.bodyText} />
              </div>

              {message.attachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.attachments.map((attachment) => (
                    <a
                      key={attachment.attachmentId}
                      href={`/api/gmail/attachments/${message.id}/${attachment.attachmentId}?filename=${encodeURIComponent(attachment.filename)}&mimeType=${encodeURIComponent(attachment.mimeType)}`}
                      className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink"
                    >
                      <Paperclip size={12} weight="regular" />
                      {attachment.filename}
                      <span className="text-ink-muted">({formatFileSize(attachment.sizeBytes)})</span>
                      <DownloadSimple size={12} weight="regular" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <section className="mt-10 border-t border-line pt-8">
          <h2 className="text-sm font-medium text-ink-muted">Répondre</h2>
          <div className="mt-4">
            <EmailComposer
              action={sendReplyForThisThread}
              toDisplay={replyTo.to}
              subjectDisplay={replyTo.subject.toLowerCase().startsWith("re:") ? replyTo.subject : `Re: ${replyTo.subject}`}
              submitLabel="Répondre"
            />
          </div>
        </section>

        <section className="mt-10 border-t border-line pt-8">
          <h2 className="text-sm font-medium text-ink-muted">Transférer</h2>
          <div className="mt-4">
            <EmailComposer
              action={forwardThisMessage}
              subjectDisplay={
                lastMessage.subject.toLowerCase().startsWith("fwd:")
                  ? lastMessage.subject
                  : `Fwd: ${lastMessage.subject}`
              }
              submitLabel="Transférer"
              placeholder="Message pour accompagner le contenu transféré..."
            />
          </div>
        </section>
      </div>
    </>
  );
}
