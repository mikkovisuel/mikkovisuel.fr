import type { Metadata } from "next";
import { TaskForm } from "@/components/task-form";
import { createTaskByClient } from "@/lib/actions/tasks";
import { db } from "@/lib/db";
import { TASK_TYPE_LIST_KEY, TASK_FORMAT_LIST_KEY } from "@/lib/dropdown-lists";

export const metadata: Metadata = {
  title: "Nouvelle demande — Espace client Mikko Visuel",
};

export default async function NewRequestPage() {
  const [typeList, formatList] = await Promise.all([
    db.dropdownList.findUnique({
      where: { key: TASK_TYPE_LIST_KEY },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
    db.dropdownList.findUnique({
      where: { key: TASK_FORMAT_LIST_KEY },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
        Nouvelle demande
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        Décrivez votre besoin, elle apparaîtra dans votre suivi au statut « Nouveau ».
      </p>
      <div className="mt-8">
        <TaskForm
          action={createTaskByClient}
          typeOptions={typeList?.items ?? []}
          formatOptions={formatList?.items ?? []}
          allowAttachments
          successMessage="Merci, votre demande a été prise en compte."
        />
      </div>
    </div>
  );
}
