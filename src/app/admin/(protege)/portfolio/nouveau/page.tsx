import type { Metadata } from "next";
import { verifyAdminSession } from "@/lib/dal";
import { PillarForm } from "@/components/admin/pillar-form";
import { createPillar } from "@/lib/actions/portfolio";

export const metadata: Metadata = {
  title: "Nouveau pilier — Admin Mikko Visuel",
};

export default async function NewPillarPage() {
  await verifyAdminSession();

  return (
    <div className="mx-auto max-w-7xl 2xl:max-w-[100rem] px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
        Nouveau pilier
      </h1>
      <div className="mt-8">
        <PillarForm action={createPillar} submitLabel="Créer le pilier" coverRequired />
      </div>
    </div>
  );
}
