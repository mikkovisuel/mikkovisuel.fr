import type { Metadata } from "next";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { ClientForm } from "@/components/admin/client-form";
import { createClient } from "@/lib/actions/clients";
import { CLIENT_CATEGORY_LIST_KEY } from "@/lib/dropdown-lists";

export const metadata: Metadata = {
  title: "Nouveau client — Admin Mikko Visuel",
};

export default async function NewClientPage() {
  await verifyAdminSession();

  const categoryList = await db.dropdownList.findUnique({
    where: { key: CLIENT_CATEGORY_LIST_KEY },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  const categoryOptions =
    categoryList?.items.map((item) => ({ id: item.id, label: item.label })) ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
        Nouveau client
      </h1>
      <div className="mt-8">
        <ClientForm
          action={createClient}
          categoryOptions={categoryOptions}
          submitLabel="Créer le client"
        />
      </div>
    </div>
  );
}
