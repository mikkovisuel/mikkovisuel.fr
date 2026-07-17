import Link from "next/link";

export type TaskView = "liste" | "kanban" | "calendrier" | "clients" | "archivees";

const VIEWS: { value: TaskView; label: string }[] = [
  { value: "liste", label: "Liste" },
  { value: "kanban", label: "Kanban" },
  { value: "calendrier", label: "Calendrier" },
  { value: "clients", label: "Par client" },
  { value: "archivees", label: "Archivées" },
];

export function TaskViewTabs({
  current,
  clientId,
  status,
}: {
  current: TaskView;
  clientId?: string;
  status?: string;
}) {
  return (
    <nav className="flex flex-wrap gap-2">
      {VIEWS.map((view) => {
        const params = new URLSearchParams();
        if (clientId) params.set("clientId", clientId);
        if (status) params.set("status", status);
        if (view.value !== "liste") params.set("vue", view.value);
        const query = params.toString();
        const isActive = view.value === current;

        return (
          <Link
            key={view.value}
            href={query ? `/admin/taches?${query}` : "/admin/taches"}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "border-accent bg-accent text-accent-ink"
                : "border-line text-ink-muted hover:text-ink"
            }`}
          >
            {view.label}
          </Link>
        );
      })}
    </nav>
  );
}
