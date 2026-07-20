import type { Metadata } from "next";
import { WarningCircle, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { getAppSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/admin/settings-form";
import { GmailConnectionCard } from "@/components/admin/gmail-connection-card";

export const metadata: Metadata = {
  title: "Réglages — Admin Mikko Visuel",
};

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ gmail?: string }>;
}) {
  const admin = await verifyAdminSession();
  const settings = await getAppSettings();
  const { gmail } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Réglages</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Paramètres appliqués en direct sur l&apos;ensemble des espaces clients.
      </p>

      {gmail === "connected" && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-ink">
          <CheckCircle size={16} weight="fill" className="text-accent" />
          Gmail connecté avec succès.
        </div>
      )}
      {gmail === "error" && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          <WarningCircle size={16} weight="fill" />
          La connexion à Gmail a échoué. Réessaie, ou vérifie les identifiants Google configurés.
        </div>
      )}
      {gmail === "not-configured" && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          <WarningCircle size={16} weight="fill" />
          Les identifiants Google (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REDIRECT_URI) ne
          sont pas encore configurés côté serveur.
        </div>
      )}

      <div className="mt-8">
        <GmailConnectionCard gmailEmail={admin.gmailEmail} gmailConnectedAt={admin.gmailConnectedAt} />
      </div>

      <div className="mt-10 border-t border-line pt-8">
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
