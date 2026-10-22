import type { BatFile } from "@/components/bat-review";

// Livrables BAT d'une tâche au format de `BatReview` (2026-10-22). `viewerId` :
// compte connecté, pour savoir quelles annotations il peut retirer.
export const BAT_DELIVERABLES_INCLUDE = { annotations: { orderBy: { createdAt: "asc" as const } } };

export function toBatFiles(
  deliverables: {
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedAt: Date;
    kind: string;
    version: number;
    annotations: { id: string; x: number; y: number; body: string; authorName: string; authorId: string }[];
  }[],
  viewerId?: string,
): BatFile[] {
  return deliverables
    .filter((deliverable) => deliverable.kind === "bat")
    .map(({ annotations, ...file }) => ({
      ...file,
      annotations: annotations.map((a) => ({ id: a.id, x: a.x, y: a.y, body: a.body, authorName: a.authorName, mine: a.authorId === viewerId })),
    }));
}
