import type { Metadata } from "next";
import { verifyAdminSession } from "@/lib/dal";
import { ClientForm } from "@/components/admin/client-form";
import { createClient } from "@/lib/actions/clients";

export const metadata: Metadata = {
  title: "Nouveau client — Admin Mikko Visuel",
};

export default async function NewClientPage() {
  await verifyAdminSession();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
        Nouveau client
      </h1>
      <div className="mt-8">
        <ClientForm action={createClient} submitLabel="Créer le client" />
      </div>
    </div>
  );
}
