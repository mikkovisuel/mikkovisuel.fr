import Link from "next/link";
import { CheckCircle, XCircle, Sparkle, ChatCircle } from "@phosphor-icons/react/dist/ssr";

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

interface BatValidatedEntry {
  id: string;
  title: string;
  clientName: string;
  validatedAt: Date;
}
interface RefusedEntry {
  id: string;
  title: string;
  clientName: string;
  reason: string;
}
interface NewRequestEntry {
  id: string;
  title: string;
  clientName: string;
}
interface NewCommentEntry {
  id: string;
  taskId: string;
  taskTitle: string;
  clientName: string;
  authorName: string;
  body: string;
}

export function RecentActivity({
  since,
  batValidated,
  refused,
  newRequests,
  newComments,
}: {
  since: Date;
  batValidated: BatValidatedEntry[];
  refused: RefusedEntry[];
  newRequests: NewRequestEntry[];
  newComments: NewCommentEntry[];
}) {
  return (
    <div className="mt-8 rounded-2xl border border-line p-6">
      <h2 className="font-display text-lg font-medium text-ink">Depuis votre dernière connexion</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Le {DATE_TIME_FORMATTER.format(since)}.
      </p>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {batValidated.length > 0 && (
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-medium text-ink">
              <CheckCircle size={16} weight="fill" className="text-emerald-500" />
              BAT validés ({batValidated.length})
            </h3>
            <ul className="mt-2 flex flex-col gap-1.5">
              {batValidated.map((entry) => (
                <li key={entry.id} className="text-sm">
                  <Link
                    href={`/admin/taches/${entry.id}`}
                    className="text-ink transition-colors hover:underline"
                  >
                    {entry.title}
                  </Link>
                  <span className="text-ink-muted"> — {entry.clientName}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {refused.length > 0 && (
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-medium text-ink">
              <XCircle size={16} weight="fill" className="text-danger" />
              Refus ({refused.length})
            </h3>
            <ul className="mt-2 flex flex-col gap-1.5">
              {refused.map((entry) => (
                <li key={entry.id} className="text-sm">
                  <Link
                    href={`/admin/taches/${entry.id}`}
                    className="text-ink transition-colors hover:underline"
                  >
                    {entry.title}
                  </Link>
                  <span className="text-ink-muted"> — {entry.clientName}</span>
                  <p className="text-xs text-ink-muted">Motif : {entry.reason}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {newRequests.length > 0 && (
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-medium text-ink">
              <Sparkle size={16} weight="fill" className="text-accent" />
              Nouvelles demandes ({newRequests.length})
            </h3>
            <ul className="mt-2 flex flex-col gap-1.5">
              {newRequests.map((entry) => (
                <li key={entry.id} className="text-sm">
                  <Link
                    href={`/admin/taches/${entry.id}`}
                    className="text-ink transition-colors hover:underline"
                  >
                    {entry.title}
                  </Link>
                  <span className="text-ink-muted"> — {entry.clientName}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {newComments.length > 0 && (
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-medium text-ink">
              <ChatCircle size={16} weight="fill" className="text-blue-500" />
              Commentaires clients ({newComments.length})
            </h3>
            <ul className="mt-2 flex flex-col gap-1.5">
              {newComments.map((entry) => (
                <li key={entry.id} className="text-sm">
                  <Link
                    href={`/admin/taches/${entry.taskId}`}
                    className="text-ink transition-colors hover:underline"
                  >
                    {entry.taskTitle}
                  </Link>
                  <span className="text-ink-muted"> — {entry.clientName}</span>
                  <p className="truncate text-xs text-ink-muted" title={entry.body}>
                    {entry.authorName} : « {entry.body} »
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
