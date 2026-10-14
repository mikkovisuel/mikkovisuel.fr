import type { Metadata } from "next";
import { verifyAdminSession } from "@/lib/dal";
import { PillarForm } from "@/components/admin/pillar-form";
import { createPillar } from "@/lib/actions/portfolio";
import { PageToolbar, PAGE_BODY } from "@/components/admin/page-toolbar";

export const metadata: Metadata = {
  title: "Nouveau pilier — Admin Mikko Visuel",
};

export default async function NewPillarPage() {
  await verifyAdminSession();

  return (
    <>
      <PageToolbar title="Nouveau pilier" back={{ href: "/admin/portfolio", label: "Retour au portfolio" }} />
      <div className={PAGE_BODY}>
        <div className="mt-8">
          <PillarForm action={createPillar} submitLabel="Créer le pilier" coverRequired />
        </div>
      </div>
    </>
  );
}
