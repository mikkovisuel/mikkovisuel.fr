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

export default async function NewProspectPage() {
  await verifyAdminSession();

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
            name: "",
            company: null,
            address: null,
            phone: null,
            email: null,
            instagram: null,
            website: null,
            notes: null,
            statusSlug: PROSPECT_STATUS.A_FAIRE,
            nextReminderAt: suggestedReminder,
          }}
          submitLabel="Créer le prospect"
        />
      </div>
    </div>
  );
}
