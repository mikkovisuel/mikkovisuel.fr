import { db } from "@/lib/db";
import { EXCLUDE_DEMO_CLIENT } from "@/lib/clients";
import { EXCLUDE_DEMO_CLIENT_TASKS } from "@/lib/tasks";

const RESULT_LIMIT = 5;

export type SearchResult = {
  id: string;
  label: string;
  sublabel: string | null;
  href: string;
};

export type SearchResults = {
  clients: SearchResult[];
  contacts: SearchResult[];
  tasks: SearchResult[];
  prospects: SearchResult[];
  documents: SearchResult[];
};

export async function searchAll(query: string): Promise<SearchResults> {
  const q = query.trim();
  if (!q) return { clients: [], contacts: [], tasks: [], prospects: [], documents: [] };

  const [clients, contacts, tasks, prospects, documents] = await Promise.all([
    db.client.findMany({
      where: {
        ...EXCLUDE_DEMO_CLIENT,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { billingEmail: { contains: q, mode: "insensitive" } },
        ],
      },
      take: RESULT_LIMIT,
      orderBy: { name: "asc" },
    }),
    db.clientContact.findMany({
      where: {
        client: { isDemo: false },
        contact: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { role: { contains: q, mode: "insensitive" } },
          ],
        },
      },
      include: { client: { select: { id: true, name: true } }, contact: true },
      take: RESULT_LIMIT,
      orderBy: { contact: { name: "asc" } },
    }),
    db.task.findMany({
      // `EXCLUDE_DEMO_CLIENT_TASKS` et non `ACTIVE_TASKS` : la recherche
      // globale retrouve aussi les tâches **archivées**, comme elle retrouve
      // les clients archivés. C'est justement le chemin par lequel on va
      // rechercher quelque chose de rangé.
      where: {
        ...EXCLUDE_DEMO_CLIENT_TASKS,
        title: { contains: q, mode: "insensitive" },
      },
      include: { client: true },
      take: RESULT_LIMIT,
      orderBy: { createdAt: "desc" },
    }),
    db.prospect.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { company: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      take: RESULT_LIMIT,
      orderBy: { createdAt: "desc" },
    }),
    db.document.findMany({
      where: {
        client: EXCLUDE_DEMO_CLIENT,
        fileName: { contains: q, mode: "insensitive" },
      },
      include: { client: true },
      take: RESULT_LIMIT,
      orderBy: { uploadedAt: "desc" },
    }),
  ]);

  return {
    clients: clients.map((client) => ({
      id: client.id,
      label: client.name,
      sublabel: client.billingEmail,
      href: `/admin/clients/${client.id}`,
    })),
    // Un contact renvoie vers la fiche de son client : c'est là qu'il se
    // consulte et se modifie, `/admin/contacts` n'étant qu'un annuaire.
    contacts: contacts.map((link) => ({
      id: link.id,
      label: link.contact.name,
      sublabel: [link.client.name, link.contact.email ?? link.contact.phone]
        .filter(Boolean)
        .join(" · "),
      href: `/admin/clients/${link.client.id}`,
    })),
    tasks: tasks.map((task) => ({
      id: task.id,
      label: task.title,
      sublabel: task.client.name,
      href: `/admin/taches/${task.id}`,
    })),
    prospects: prospects.map((prospect) => ({
      id: prospect.id,
      label: prospect.name,
      sublabel: prospect.company,
      href: `/admin/prospection/${prospect.id}`,
    })),
    documents: documents.map((document) => ({
      id: document.id,
      label: document.fileName,
      sublabel: document.client.name,
      href: `/admin/clients/${document.clientId}`,
    })),
  };
}
