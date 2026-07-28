import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { isProspectReminderOverdue } from "@/lib/prospects";

interface RowProspect {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  nextReminderAt: Date | null;
  source: string;
  status: { label: string; color: string };
  convertedClient: { id: string; name: string } | null;
}

export function ProspectRow({ prospect }: { prospect: RowProspect }) {
  const reminderOverdue = isProspectReminderOverdue(prospect);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/prospection/${prospect.id}`}
            className="text-sm font-medium text-ink hover:underline"
          >
            {prospect.name}
          </Link>
          <StatusBadge label={prospect.status.label} color={prospect.status.color} />
          {prospect.source === "recherche_ia" && (
            <span className="rounded-full border border-line px-2 py-0.5 text-[10px] text-ink-muted">
              Recherche IA
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          {[prospect.company, prospect.phone, prospect.email, prospect.instagram]
            .filter(Boolean)
            .join(" · ") || "Aucune coordonnée renseignée"}
        </p>
        {prospect.convertedClient && (
          <Link
            href={`/admin/clients/${prospect.convertedClient.id}`}
            className="mt-1 inline-block text-xs font-medium text-accent hover:underline"
          >
            Voir la fiche client →
          </Link>
        )}
      </div>
      {prospect.nextReminderAt && (
        <p className={`text-xs ${reminderOverdue ? "font-medium text-danger" : "text-ink-muted"}`}>
          Relance le {prospect.nextReminderAt.toLocaleDateString("fr-FR")}
          {reminderOverdue ? " — en retard" : ""}
        </p>
      )}
    </div>
  );
}
