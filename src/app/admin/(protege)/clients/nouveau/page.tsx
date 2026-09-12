import type { Metadata } from "next";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { ClientForm } from "@/components/admin/client-form";
import { createClient } from "@/lib/actions/clients";
import { CLIENT_CATEGORY_LIST_KEY } from "@/lib/dropdown-lists";

export const metadata: Metadata = {
  title: "Nouveau client — Admin Mikko Visuel",
};

/** Voir la page « nouveau prospect » : mêmes paramètres, même intention —
 * ne pas retaper ce qu'une autre application connaît déjà. */
type Prefill = {
  nom?: string;
  email?: string;
  notes?: string;
};

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<Prefill>;
}) {
  await verifyAdminSession();
  const prefill = await searchParams;

  const categoryList = await db.dropdownList.findUnique({
    where: { key: CLIENT_CATEGORY_LIST_KEY },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  const categoryOptions =
    categoryList?.items.map((item) => ({ id: item.id, label: item.label })) ?? [];

  return (
    <div className="mx-auto max-w-7xl 2xl:max-w-[100rem] px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
        Nouveau client
      </h1>
      <div className="mt-8">
        <ClientForm
          action={createClient}
          categoryOptions={categoryOptions}
          defaultValues={{
            name: prefill.nom ?? "",
            raisonSociale: null,
            notes: prefill.notes ?? null,
            address: null,
            siret: null,
            vatNumber: null,
            billingEmail: prefill.email ?? null,
            driveUrl: null,
            categoryId: null,
          }}
          submitLabel="Créer le client"
        />
      </div>
    </div>
  );
}
