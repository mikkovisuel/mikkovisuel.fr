import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { PROSPECT_STATUS_LIST_KEY } from "@/lib/dropdown-lists";
import { ProspectForm } from "@/components/admin/prospect-form";
import { EmailComposer } from "@/components/admin/email-composer";
import { DeleteButton } from "@/components/admin/delete-button";
import { ConvertProspectButton } from "@/components/admin/convert-prospect-button";
import { ProspectActivityFeed } from "@/components/admin/prospect-activity-feed";
import {
  updateProspect,
  deleteProspect,
  sendProspectEmail,
  sendProspectReminderNow,
} from "@/lib/actions/prospects";

export const metadata: Metadata = {
  title: "Prospect — Admin Mikko Visuel",
};

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await verifyAdminSession();
  const { id } = await params;

  const [prospect, statusList] = await Promise.all([
    db.prospect.findUnique({
      where: { id },
      include: {
        status: true,
        convertedClient: true,
        activity: { orderBy: { createdAt: "desc" } },
      },
    }),
    db.dropdownList.findUnique({
      where: { key: PROSPECT_STATUS_LIST_KEY },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  if (!prospect) notFound();

  const updateThisProspect = updateProspect.bind(null, prospect.id);
  const sendThisProspectEmail = sendProspectEmail.bind(null, prospect.id);
  const gmailConnected = Boolean(admin.gmailEmail);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/admin/prospection"
        className="inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={16} weight="regular" />
        Retour à la prospection
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-medium tracking-tight text-ink">{prospect.name}</h1>
        {!prospect.convertedClientId && <ConvertProspectButton prospectId={prospect.id} />}
      </div>

      {prospect.convertedClient && (
        <p className="mt-4 rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink-muted">
          Converti en client le{" "}
          {prospect.convertedAt?.toLocaleDateString("fr-FR")} —{" "}
          <Link
            href={`/admin/clients/${prospect.convertedClient.id}`}
            className="font-medium text-ink hover:underline"
          >
            voir la fiche client
          </Link>
        </p>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-medium text-ink-muted">Informations</h2>
        <div className="mt-4">
          <ProspectForm
            action={updateThisProspect}
            statusOptions={
              statusList?.items.map((item) => ({ slug: item.slug, label: item.label })) ?? []
            }
            defaultValues={{
              name: prospect.name,
              company: prospect.company,
              address: prospect.address,
              city: prospect.city,
              phone: prospect.phone,
              email: prospect.email,
              instagram: prospect.instagram,
              instagramUrl: prospect.instagramUrl,
              website: prospect.website,
              whatsappUrl: prospect.whatsappUrl,
              activityLevel: prospect.activityLevel,
              notes: prospect.notes,
              statusSlug: prospect.status.slug,
              nextReminderAt: prospect.nextReminderAt
                ? prospect.nextReminderAt.toISOString().slice(0, 10)
                : null,
            }}
            submitLabel="Enregistrer"
          />
        </div>
      </section>

      {prospect.nextReminderAt && (
        <section className="mt-8 rounded-2xl border border-line p-4">
          <h2 className="text-sm font-medium text-ink-muted">Relance</h2>
          <p className="mt-2 text-sm text-ink">
            Relance planifiée le {prospect.nextReminderAt.toLocaleDateString("fr-FR")}
            {prospect.reminderSentAt ? " — alerte déjà envoyée" : ""}.
          </p>
          <form action={sendProspectReminderNow.bind(null, prospect.id)} className="mt-3">
            <button
              type="submit"
              className="rounded-full border border-line px-4 py-2 text-sm text-ink-muted transition-colors hover:border-accent hover:text-ink"
            >
              Envoyer une alerte maintenant
            </button>
          </form>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-medium text-ink-muted">Envoyer un email</h2>
        {gmailConnected ? (
          prospect.email ? (
            <div className="mt-4">
              <EmailComposer
                action={sendThisProspectEmail}
                toDefaultValue={prospect.email}
                submitLabel="Envoyer"
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-muted">
              Aucun email renseigné pour ce prospect.
            </p>
          )
        ) : (
          <p className="mt-4 text-sm text-ink-muted">
            Connectez Gmail depuis{" "}
            <Link href="/admin/reglages" className="font-medium text-ink hover:underline">
              Réglages
            </Link>{" "}
            pour envoyer des emails depuis l&apos;admin.
            {prospect.email && (
              <>
                {" "}
                En attendant,{" "}
                <a href={`mailto:${prospect.email}`} className="font-medium text-ink hover:underline">
                  ouvrir dans votre messagerie
                </a>
                .
              </>
            )}
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-ink-muted">Historique</h2>
        <div className="mt-4">
          <ProspectActivityFeed entries={prospect.activity} />
        </div>
      </section>

      <section className="mt-10 border-t border-line pt-6">
        <DeleteButton
          action={deleteProspect.bind(null, prospect.id)}
          confirmMessage={`Supprimer définitivement le prospect "${prospect.name}" ? Cette action est irréversible.`}
          label="Supprimer ce prospect"
        />
      </section>
    </div>
  );
}
