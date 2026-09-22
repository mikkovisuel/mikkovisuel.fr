import type { Metadata } from "next";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { TaskForm } from "@/components/task-form";
import { createTaskByAdminAnyClient } from "@/lib/actions/tasks";
import { TASK_TYPE_LIST_KEY, TASK_FORMAT_LIST_KEY } from "@/lib/dropdown-lists";
import { ACTIVE_CLIENTS } from "@/lib/clients";

export const metadata: Metadata = {
  title: "Nouvelle tâche — Admin Mikko Visuel",
};

export default async function NewTaskPage() {
  await verifyAdminSession();

  const [clients, typeList, formatList] = await Promise.all([
    db.client.findMany({ where: ACTIVE_CLIENTS, select: { id: true, name: true }, orderBy: { name: "asc" } }),
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
    <div className="mx-auto max-w-7xl 2xl:max-w-[100rem] px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
        Nouvelle tâche
      </h1>
      <div className="mt-8 max-w-xl">
        <TaskForm
          action={createTaskByAdminAnyClient}
          typeOptions={typeList?.items ?? []}
          formatOptions={formatList?.items ?? []}
          clients={clients.map((client) => ({ id: client.id, name: client.name }))}
          allowEstimate
        />
      </div>
    </div>
  );
}
