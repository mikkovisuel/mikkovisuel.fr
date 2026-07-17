import type { Metadata } from "next";
import Link from "next/link";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Listes déroulantes — Admin Mikko Visuel",
};

export default async function DropdownListsPage() {
  await verifyAdminSession();

  const lists = await db.dropdownList.findMany({
    include: { _count: { select: { items: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
        Listes déroulantes
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        Gérez le contenu des listes utilisées dans le site (statuts, types de document, catégories).
      </p>

      <div className="mt-8 divide-y divide-line rounded-2xl border border-line">
        {lists.map((list) => (
          <Link
            key={list.id}
            href={`/admin/listes/${list.key}`}
            className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-surface-elevated"
          >
            <div>
              <p className="font-medium text-ink">{list.name}</p>
              <p className="text-sm text-ink-muted">
                {list._count.items} élément{list._count.items > 1 ? "s" : ""}
                {!list.allowCustomItems && " · figée"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
