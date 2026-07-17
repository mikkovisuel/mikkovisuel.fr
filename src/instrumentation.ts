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
