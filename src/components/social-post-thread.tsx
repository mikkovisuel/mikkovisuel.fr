import { formatSchedule } from "@/lib/social-posts";

// Fil d'échange admin ↔ client d'une publication (2026-09-18), affiché à
// l'identique des deux côtés ; le formulaire d'envoi est fourni à part.
export function SocialPostThread({
  comments,
  viewer,
}: {
  comments: { id: string; authorType: string; authorName: string; body: string; createdAt: Date }[];
  viewer: "ADMIN" | "CLIENT_USER";
}) {
  if (comments.length === 0) return null;
  return (
    <ul className="grid gap-2">
      {comments.map((comment) => {
        const mine = comment.authorType === viewer;
        return (
          <li
            key={comment.id}
            className={`max-w-[85%] rounded-xl border p-3 ${
              mine ? "ml-auto border-accent/40 bg-accent/5" : "border-line bg-surface-elevated"
            }`}
          >
            <p className="whitespace-pre-wrap break-words text-sm text-ink">{comment.body}</p>
            <p className="mt-1 text-xs text-ink-muted">
              {comment.authorName} · {formatSchedule(comment.createdAt)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
