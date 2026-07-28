const ACTIVITY_DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

interface ActivityEntry {
  id: string;
  type: string;
  message: string;
  createdAt: Date;
}

// Mini fil d'historique par prospect (créé, changement de statut, email
// envoyé, relance) — même esprit que l'historique des statuts de tâche
// (TaskStatusHistory) : lecture seule, ordre chronologique inverse.
export function ProspectActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-ink-muted">Aucun évènement pour le moment.</p>;
  }

  return (
    <ol className="flex flex-col gap-3">
      {entries.map((entry) => (
        <li key={entry.id} className="flex gap-3 text-sm">
          <span className="mt-0.5 shrink-0 text-xs text-ink-muted">
            {ACTIVITY_DATE_FORMATTER.format(entry.createdAt)}
          </span>
          <span className="text-ink-muted">{entry.message}</span>
        </li>
      ))}
    </ol>
  );
}
