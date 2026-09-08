// Hook appelé par Next pour toute erreur serveur non gérée — composants
// serveur, Server Actions, routes API. C'est le seul point de passage commun,
// d'où l'alerte email posée ici plutôt que dans chaque `error.tsx` (qui, lui,
// est côté client et ne voit pas les erreurs de rendu serveur).
export async function onRequestError(
  error: unknown,
  request: { path?: string },
  context: { renderSource?: string; routerKind?: string },
) {
  // Next compile `instrumentation.ts` pour les deux runtimes, Node **et**
  // Edge (le proxy de `src/proxy.ts` tourne sur Edge). Sans ce garde, l'import
  // dynamique ci-dessous entraînait Prisma dans le bundle Edge, qui ne
  // supporte pas les modules Node (`node:url`) : le build affichait
  // "Ecmascript file had an error" avant de conclure malgré tout par
  // "Compiled successfully", et l'alerte était de toute façon inopérante côté
  // Edge. `NEXT_RUNTIME` est remplacé statiquement par le bundler, donc cette
  // branche — et tout ce qu'elle importe — disparaît du bundle Edge.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;

  const { reportServerError } = await import("@/lib/error-alert");
  await reportServerError(error, {
    path: request.path,
    kind: context.renderSource ?? context.routerKind,
  });
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Constat du 2026-09-08 ("je trouve parfois des ralentissements") :
  // conteneur à 100% de sa mémoire (512/512 Mo) avec 2% de CPU seulement —
  // signature d'une pression mémoire qui s'accumule dans le temps, pas d'un
  // pic de trafic. `sharp` (utilisé en interne par l'optimiseur d'images de
  // Next, très sollicité par un portfolio public riche en photos) garde par
  // défaut un cache natif jusqu'à 50 Mo/20 fichiers/100 opérations, jamais
  // libéré tant que le processus tourne — un plancher fixe qui ne sert à
  // rien ici : le cache disque de Next (`.next/cache/images`) sert déjà les
  // requêtes identiques répétées sans repasser par `sharp`, donc ce second
  // cache en mémoire n'apporte quasiment aucun gain, seulement un coût.
  // Import dynamique comme `error-alert` ci-dessus : un `import` statique de
  // `sharp` (module natif Node) serait entraîné dans le bundle Edge, qui ne
  // le supporte pas.
  const sharp = (await import("sharp")).default;
  sharp.cache(false);
  // Une seule opération native à la fois plutôt que la valeur par défaut
  // (nombre de cœurs) : plusieurs redimensionnements simultanés sous fort
  // trafic peuvent chacun allouer plusieurs Mo de tampons décodés/encodés en
  // parallèle — un pic de mémoire ponctuel bien plus dangereux sur 512 Mo
  // qu'une latence légèrement plus élevée en cas de forte concurrence.
  sharp.concurrency(1);

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
