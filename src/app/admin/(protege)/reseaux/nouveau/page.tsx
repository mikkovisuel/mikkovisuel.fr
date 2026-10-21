import type { Metadata } from "next";
import { verifyAdminSession } from "@/lib/dal";
import { listAssignableAdmins } from "@/lib/assignment";
import { db } from "@/lib/db";
import { ACTIVE_CLIENTS } from "@/lib/clients";
import { SocialPostForm } from "@/components/admin/social-post-form";
import { createSocialPost } from "@/lib/actions/social-posts";
import { loadSocialFormLists, loadSocialLibraries } from "@/lib/social-library";
import { SOCIAL_FORMATS, SOCIAL_NETWORKS, parseParisDateTimeLocal } from "@/lib/social-posts";
import { PageToolbar, PAGE_BODY } from "@/components/admin/page-toolbar";

export const metadata: Metadata = {
  title: "Nouvelle publication — Admin Mikko Visuel",
};

export default async function NewSocialPostPage({
  searchParams,
}: {
  // Pré-remplissage possible par l'URL — utilisé par le lien des rappels de
  // créneaux récurrents (src/lib/social-post-reminders.ts). Toute valeur
  // inconnue est ignorée plutôt que refusée.
  searchParams: Promise<{ clientId?: string; titre?: string; format?: string; reseaux?: string; date?: string }>;
}) {
  const me = await verifyAdminSession();
  const admins = await listAssignableAdmins();
  const { clientId, titre, format, reseaux, date } = await searchParams;
  const prefilledNetworks = (reseaux ?? "")
    .split(",")
    .filter((slug) => SOCIAL_NETWORKS.some((network) => network.slug === slug));

  const clients = await db.client.findMany({
    where: ACTIVE_CLIENTS,
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const libraries = await loadSocialLibraries(clients.map((client) => client.id));
  const { categories, taskTypes } = await loadSocialFormLists();

  return (
    <>
      <PageToolbar title="Nouvelle publication" back={{ href: "/admin/reseaux", label: "Retour aux réseaux sociaux" }} />
      <div className={PAGE_BODY}>
        <div className="max-w-7xl">
          <SocialPostForm
            action={createSocialPost}
            clients={clients}
            defaultValues={{
              clientId: clients.some((client) => client.id === clientId) ? clientId : undefined,
              title: (titre ?? "").slice(0, 160),
              networks: prefilledNetworks.length > 0 ? prefilledNetworks : ["instagram"],
              format: SOCIAL_FORMATS.some((item) => item.slug === format) ? format! : "post",
              caption: "",
              hashtags: "",
              scheduledAt: parseParisDateTimeLocal(date) ? date! : "",
            }}
            libraries={libraries}
            categories={categories}
            taskTypes={taskTypes}
            admins={admins}
            defaultAssigneeId={me.id}
            submitLabel="Créer la publication"
          />
        </div>
      </div>
    </>
  );
}
