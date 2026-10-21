import type { Metadata } from "next";
import { verifyAdminSession } from "@/lib/dal";
import { PageToolbar } from "@/components/admin/page-toolbar";
import { AssistantChat } from "@/components/admin/assistant-chat";

export const metadata: Metadata = {
  title: "Assistant — Admin Mikko Visuel",
};

// Assistant Claude en pleine page (2026-10-21), avec l'historique à gauche.
// Le même assistant s'ouvre en panneau depuis la barre du haut.
export default async function AdminAssistantPage() {
  await verifyAdminSession();
  return (
    <>
      <PageToolbar title="Assistant" subtitle="Claude lit vos données ; chaque action attend votre confirmation" />
      <AssistantChat variant="page" />
    </>
  );
}
