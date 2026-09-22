import { diffWords } from "@/lib/social-posts";

// "Voir les changements" (2026-09-18) : texte refusé par le client comparé
// à la nouvelle version, mot à mot — ajouts surlignés, suppressions barrées.
// Utilisé côté admin et côté client.
export function SocialCaptionDiff({
  before,
  after,
  label,
}: {
  before: string;
  after: string;
  label: string;
}) {
  if (before.trim() === after.trim()) return null;
  return (
    <div>
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink">
        {diffWords(before, after).map((part, index) =>
          part.kind === "same" ? (
            <span key={index}>{part.text}</span>
          ) : part.kind === "added" ? (
            <ins key={index} className="rounded bg-accent/30 no-underline">
              {part.text}
            </ins>
          ) : (
            <del key={index} className="text-danger line-through decoration-danger/70">
              {part.text}
            </del>
          ),
        )}
      </p>
    </div>
  );
}

export function hasCaptionChanges(post: {
  caption: string | null;
  hashtags: string | null;
  previousCaption: string | null;
  previousHashtags: string | null;
}) {
  if (post.previousCaption === null && post.previousHashtags === null) return false;
  return (
    (post.previousCaption ?? "").trim() !== (post.caption ?? "").trim() ||
    (post.previousHashtags ?? "").trim() !== (post.hashtags ?? "").trim()
  );
}
