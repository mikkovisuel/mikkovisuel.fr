// Hook appelé par Next pour toute erreur serveur non gérée — composants
// serveur, Server Actions, routes API. C'est le seul point de passage commun,
// d'où l'alerte email posée ici plutôt que dans chaque `error.tsx` (qui, lui,
// est côté client et ne voit pas les erreurs de rendu serveur).
export async function onRequestError(
  error: unknown,
  request: { path?: string },
  context: { renderSource?: string; routerKind?: string },
) {
  if (process.env.NODE_ENV !== "production") return;

  const { reportServerError } = await import("@/lib/error-alert");
  await reportServerError(error, {
    path: request.path,
    kind: context.renderSource ?? context.routerKind,
  });
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;

  // Scalingo (and most PaaS container hosts) have EPHEMERAL disk — anything
  // written locally is lost on the next restart/deploy. Refuse to boot
  // rather than silently running with a database or file storage that will
  // vanish. See /Users/mikko/.claude/plans/smooth-crafting-rose.md.
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (databaseUrl.startsWith("file:")) {
    throw new Error(
      "DATABASE_URL points to a local SQLite file in production. This would " +
        "lose all data on the next container restart. Set DATABASE_URL to a " +
        "Postgres connection string before deploying.",
    );
  }

  const hasS3Config = Boolean(
    process.env.STORAGE_S3_ENDPOINT &&
      process.env.STORAGE_S3_BUCKET &&
      process.env.STORAGE_S3_ACCESS_KEY_ID &&
      process.env.STORAGE_S3_SECRET_ACCESS_KEY,
  );
  if (!hasS3Config) {
    throw new Error(
      "No S3-compatible storage configured in production. Local disk " +
        "storage would be lost on every container restart — set the " +
        "STORAGE_S3_* environment variables before deploying.",
    );
  }
}
