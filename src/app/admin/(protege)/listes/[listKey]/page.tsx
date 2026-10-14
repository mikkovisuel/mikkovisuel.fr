import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { DropdownItemRow } from "@/components/admin/dropdown-item-row";
import { NewDropdownItemForm } from "@/components/admin/new-dropdown-item-form";
import { createDropdownItem } from "@/lib/actions/dropdown-lists";
import { PageToolbar, PAGE_BODY } from "@/components/admin/page-toolbar";

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
    <>
      <PageToolbar title={list.name} back={{ href: "/admin/listes", label: "Retour aux listes" }} />
      <div className={PAGE_BODY}>
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
    </>
  );
}
