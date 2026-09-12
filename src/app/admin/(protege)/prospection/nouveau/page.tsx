import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { PROSPECT_STATUS_LIST_KEY, PROSPECT_STATUS } from "@/lib/dropdown-lists";
import { getAppSettings } from "@/lib/settings";
import { suggestedProspectReminderDate } from "@/lib/prospects";
import { ProspectForm } from "@/components/admin/prospect-form";
import { createProspect } from "@/lib/actions/prospects";

export const metadata: Metadata = {
  title: "Nouveau prospect — Admin Mikko Visuel",
};

/** Champs pré-remplissables depuis l'extérieur — Mikko Hub passe le nom et
 * l'adresse d'un expéditeur de mail pour éviter la ressaisie. Purement
 * additif : sans paramètre, la page se comporte comme avant. */
type Prefill = {
  nom?: string;
  email?: string;
  societe?: string;
  telephone?: string;
  notes?: string;
};

export default async function NewProspectPage({
  searchParams,
}: {
  searchParams: Promise<Prefill>;
}) {
  await verifyAdminSession();
  const prefill = await searchParams;

  const [statusList, settings] = await Promise.all([
    db.dropdownList.findUnique({
      where: { key: PROSPECT_STATUS_LIST_KEY },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
    getAppSettings(),
  ]);

  const suggestedReminder = suggestedProspectReminderDate(settings.prospectReminderDefaultDays)
    .toISOString()
    .slice(0, 10);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/admin/prospection"
        className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} weight="regular" />
        Retour à la prospection
      </Link>

      <h1 className="mt-4 font-display text-2xl font-medium tracking-tight text-ink">
        Nouveau prospect
      </h1>

      <div className="mt-8">
        <ProspectForm
          action={createProspect}
          statusOptions={statusList?.items.map((item) => ({ slug: item.slug, label: item.label })) ?? []}
          defaultValues={{
            name: prefill.nom ?? "",
            company: prefill.societe ?? null,
            address: null,
            city: null,
            phone: prefill.telephone ?? null,
            email: prefill.email ?? null,
            instagram: null,
            instagramUrl: null,
            website: null,
            whatsappUrl: null,
            activityLevel: null,
            notes: prefill.notes ?? null,
            statusSlug: PROSPECT_STATUS.A_FAIRE,
            nextReminderAt: suggestedReminder,
          }}
          submitLabel="Créer le prospect"
        />
      </div>
    </div>
  );
}
