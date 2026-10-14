import type { Metadata } from "next";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { ClientForm } from "@/components/admin/client-form";
import { createClient } from "@/lib/actions/clients";
import { CLIENT_CATEGORY_LIST_KEY } from "@/lib/dropdown-lists";
import { PageToolbar, PAGE_BODY } from "@/components/admin/page-toolbar";

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
    <>
      <PageToolbar title="Nouveau client" back={{ href: "/admin/clients", label: "Retour aux clients" }} />
      <div className={PAGE_BODY}>
        <div className="mt-8 max-w-5xl">
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
    </>
  );
}
