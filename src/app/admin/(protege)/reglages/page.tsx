import type { Metadata } from "next";
import { verifyAdminSession } from "@/lib/dal";
import { getAppSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/settings-form";

export const metadata: Metadata = {
  title: "Réglages — Admin Mikko Visuel",
};

export default async function AdminSettingsPage() {
  await verifyAdminSession();
  const settings = await getAppSettings();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Réglages</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Paramètres appliqués en direct sur l&apos;ensemble des espaces clients.
      </p>

      <div className="mt-8">
        <SettingsForm
          defaultValues={{
            deliverableRetentionDays: settings.deliverableRetentionDays,
            batWatermarkEnabled: settings.batWatermarkEnabled,
            popupEnabled: settings.popupEnabled,
            popupMessage: settings.popupMessage ?? "",
          }}
        />
      </div>
    </div>
  );
}
