import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { DropdownItemRow } from "@/components/admin/dropdown-item-row";
import { NewDropdownItemForm } from "@/components/admin/new-dropdown-item-form";
import { createDropdownItem } from "@/lib/actions/dropdown-lists";

export const metadata: Metadata = {
  title: "Liste déroulante — Admin Mikko Visuel",
};

export default async function DropdownListDetailPage({
  params,
}: {
  params: Promise<{ listKey: string }>;
}) {
  await verifyAdminSession();
  const { listKey } = await params;

  const list = await db.dropdownList.findUnique({
    where: { key: listKey },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  if (!list) notFound();

  const createItemForThisList = createDropdownItem.bind(null, list.id, list.key);

  return (
    <div className="mx-auto max-w-7xl 2xl:max-w-[100rem] px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/admin/listes"
        className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} weight="regular" />
        Retour aux listes
      </Link>

      <h1 className="mt-4 font-display text-2xl font-medium tracking-tight text-ink">
        {list.name}
      </h1>
      {!list.allowCustomItems && (
        <p className="mt-2 text-sm text-ink-muted">
          Cette liste est figée : les libellés et couleurs restent modifiables, mais aucun élément
          ne peut être ajouté ou supprimé.
        </p>
      )}

      <div className="mt-8 divide-y divide-line rounded-2xl border border-line">
        {list.items.map((item, index) => (
          <DropdownItemRow
            key={item.id}
            item={item}
            listId={list.id}
            listKey={list.key}
            isFirst={index === 0}
            isLast={index === list.items.length - 1}
          />
        ))}
      </div>

      {list.allowCustomItems && (
        <div className="mt-6 rounded-2xl border border-line p-6">
          <NewDropdownItemForm action={createItemForThisList} />
        </div>
      )}
    </div>
  );
}
