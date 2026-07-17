import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Clients — Admin Mikko Visuel",
};

export default async function AdminClientsPage() {
  await verifyAdminSession();

  const clients = await db.client.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { users: true, tasks: true } } },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Clients</h1>
        <Link
          href="/admin/clients/nouveau"
          className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
        >
          <Plus size={16} weight="bold" />
          Nouveau client
        </Link>
      </div>

      {clients.length === 0 ? (
        <p className="mt-8 text-sm text-ink-muted">Aucun client pour le moment.</p>
      ) : (
        <div className="mt-8 divide-y divide-line rounded-2xl border border-line">
          {clients.map((client) => (
            <Link
              key={client.id}
              href={`/admin/clients/${client.id}`}
              className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-surface-elevated"
            >
              <div>
                <p className="font-medium text-ink">{client.name}</p>
                <p className="mt-0.5 text-sm text-ink-muted">
                  {client._count.users} compte{client._count.users > 1 ? "s" : ""} ·{" "}
                  {client._count.tasks} tâche{client._count.tasks > 1 ? "s" : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
