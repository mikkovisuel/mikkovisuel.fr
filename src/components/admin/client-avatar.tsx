// Avatar rond du client. Repli sur les initiales plutôt qu'une image
// générique : tant qu'aucun logo n'est chargé, la liste reste lisible et
// chaque client garde un repère visuel distinct.
//
// `<img>` natif et non `next/image` : la source est une route applicative
// protégée par session (`/api/clients/[id]/avatar`), que l'optimiseur d'images
// de Next ne peut pas récupérer côté serveur — il n'a pas le cookie.
function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

const SIZES = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-20 w-20 text-lg",
} as const;

export function ClientAvatar({
  clientId,
  name,
  hasAvatar,
  size = "sm",
}: {
  clientId: string;
  name: string;
  hasAvatar: boolean;
  size?: keyof typeof SIZES;
}) {
  const base = `${SIZES[size]} shrink-0 overflow-hidden rounded-full border border-line`;

  if (!hasAvatar) {
    return (
      <span
        aria-hidden="true"
        className={`${base} flex items-center justify-center bg-surface-elevated font-medium text-ink-muted`}
      >
        {initials(name)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/clients/${clientId}/avatar`}
      alt=""
      className={`${base} object-cover`}
    />
  );
}
