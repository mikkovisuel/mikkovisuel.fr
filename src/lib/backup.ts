import "server-only";
// archiver 8 exporte des classes, pas la fonction fabrique des versions
// précédentes : `new ZipArchive(...)` et non `archiver("zip", ...)`.
import { ZipArchive } from "archiver";
import { Readable, PassThrough } from "node:stream";
import { db } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage";
import { buildClientsCsv, buildTasksCsv, buildDocumentsCsv } from "@/lib/exports";

// Sauvegarde complète : les CSV de métadonnées **et** les fichiers réels.
//
// Pourquoi `archiver` : l'écriture ZIP maison qui servait auparavant
// (`src/lib/zip.ts`, supprimée depuis) construisait l'archive entière en
// mémoire et renvoyait un `Buffer`. Suffisant pour trois CSV, intenable ici —
// un seul livrable peut peser 500 Mo et ferait tomber le conteneur.
// `archiver` écrit en flux, la mémoire reste plate quelle que soit la taille.
//
// Constat à l'origine (2026-07-30) : `/api/exports/tout` ne contenait que des
// CSV. La "réversibilité" mise en avant côté commercial était donc fausse —
// un client repartait avec des lignes pointant vers des fichiers absents.

interface BackupFile {
  /** Chemin dans l'archive, dossiers compris. */
  path: string;
  storageKey: string;
  sizeBytes: number;
}

// Un même nom de fichier peut revenir plusieurs fois (deux "facture.pdf" chez
// deux clients, ou dans la même tâche) : les clés de stockage sont uniques,
// pas les noms d'affichage. Sans désambiguïsation, l'archive contiendrait des
// entrées en double et les lecteurs ZIP en écraseraient silencieusement.
function uniquePath(taken: Set<string>, candidate: string): string {
  if (!taken.has(candidate)) {
    taken.add(candidate);
    return candidate;
  }
  const dot = candidate.lastIndexOf(".");
  const stem = dot > 0 ? candidate.slice(0, dot) : candidate;
  const ext = dot > 0 ? candidate.slice(dot) : "";
  let n = 2;
  while (taken.has(`${stem} (${n})${ext}`)) n += 1;
  const result = `${stem} (${n})${ext}`;
  taken.add(result);
  return result;
}

// Neutralise ce qui casserait une arborescence à l'extraction (séparateurs,
// remontées de chemin) sans réécrire tout le nom.
function safeName(name: string): string {
  return name.replace(/[/\\]/g, "-").replace(/^\.+/, "").trim() || "sans-nom";
}

async function collectBackupFiles(): Promise<BackupFile[]> {
  const taken = new Set<string>();
  const files: BackupFile[] = [];

  const [documents, deliverables, attachments, clients, pillars, items] = await Promise.all([
    db.document.findMany({ include: { client: { select: { name: true } } } }),
    db.deliverable.findMany({
      include: { task: { select: { title: true, client: { select: { name: true } } } } },
    }),
    db.attachment.findMany({
      include: { task: { select: { title: true, client: { select: { name: true } } } } },
    }),
    db.client.findMany({ where: { avatarStorageKey: { not: null } } }),
    db.portfolioPillar.findMany({ where: { coverStorageKey: { not: null } } }),
    db.portfolioMediaItem.findMany({ where: { storageKey: { not: null } } }),
  ]);

  for (const doc of documents) {
    files.push({
      path: uniquePath(taken, `documents/${safeName(doc.client.name)}/${safeName(doc.fileName)}`),
      storageKey: doc.storageKey,
      sizeBytes: doc.sizeBytes,
    });
  }
  for (const d of deliverables) {
    files.push({
      path: uniquePath(
        taken,
        `livrables/${safeName(d.task.client.name)}/${safeName(d.task.title)}/${safeName(d.fileName)}`,
      ),
      storageKey: d.storageKey,
      sizeBytes: d.sizeBytes,
    });
  }
  for (const a of attachments) {
    files.push({
      path: uniquePath(
        taken,
        `pieces-jointes/${safeName(a.task.client.name)}/${safeName(a.task.title)}/${safeName(a.fileName)}`,
      ),
      storageKey: a.storageKey,
      sizeBytes: a.sizeBytes,
    });
  }
  for (const client of clients) {
    files.push({
      path: uniquePath(taken, `avatars/${safeName(client.name)}`),
      storageKey: client.avatarStorageKey!,
      sizeBytes: 0,
    });
  }
  for (const pillar of pillars) {
    files.push({
      path: uniquePath(taken, `portfolio/couvertures/${safeName(pillar.slug)}`),
      storageKey: pillar.coverStorageKey!,
      sizeBytes: 0,
    });
  }
  for (const item of items) {
    files.push({
      path: uniquePath(taken, `portfolio/medias/${item.id}`),
      storageKey: item.storageKey!,
      sizeBytes: item.sizeBytes ?? 0,
    });
  }

  return files;
}

// Inventaire affiché sur /admin/exports pour que l'admin sache ce qu'il
// s'apprête à télécharger — une archive de plusieurs Go ne doit pas être une
// surprise.
export async function backupInventory() {
  const files = await collectBackupFiles();
  return {
    fileCount: files.length,
    totalBytes: files.reduce((sum, file) => sum + file.sizeBytes, 0),
  };
}

export async function createBackupStream(): Promise<ReadableStream<Uint8Array>> {
  const [clientsCsv, tasksCsv, documentsCsv, files] = await Promise.all([
    buildClientsCsv(),
    buildTasksCsv(),
    buildDocumentsCsv(),
    collectBackupFiles(),
  ]);

  const storage = getStorageAdapter();
  // `store: true` — pas de compression : le gros du volume est déjà compressé
  // (JPEG, MP4, PDF). Compresser coûterait du CPU pour un gain nul.
  const archive = new ZipArchive({ store: true });

  archive.append(clientsCsv, { name: "metadonnees/clients.csv" });
  archive.append(tasksCsv, { name: "metadonnees/taches.csv" });
  archive.append(documentsCsv, { name: "metadonnees/documents.csv" });

  // Les fichiers sont ajoutés en arrière-plan pendant que la réponse est déjà
  // en cours d'envoi.
  //
  // Deux garde-fous, appris à la dure : une référence orpheline en base
  // (fichier supprimé du stockage) ne doit ni bloquer ni tronquer l'archive.
  // `readStream` ne rejette **pas** sur un fichier absent — il rend un flux
  // qui émettra l'erreur plus tard, et `archiver` restait alors bloqué
  // indéfiniment : le téléchargement partait en HTTP 200 puis ne se terminait
  // jamais, produisant une sauvegarde silencieusement incomplète. C'est le
  // pire comportement possible pour une sauvegarde, puisqu'il inspire
  // confiance.
  //   1. `exists()` écarte en amont les fichiers introuvables ;
  //   2. un `PassThrough` intercepte malgré tout une erreur survenant en
  //      cours de lecture (fichier supprimé entre-temps, coupure réseau S3)
  //      et referme proprement l'entrée au lieu de figer l'archive.
  // Dans les deux cas la perte est consignée dans un rapport joint.
  void (async () => {
    const missing: string[] = [];

    for (const file of files) {
      if (!(await storage.exists(file.storageKey))) {
        missing.push(`${file.path} (clé ${file.storageKey}) — introuvable dans le stockage`);
        continue;
      }

      const source = Readable.fromWeb((await storage.readStream(file.storageKey)) as never);
      const entry = new PassThrough();
      source.on("error", (error: Error) => {
        missing.push(`${file.path} (clé ${file.storageKey}) — lecture interrompue : ${error.message}`);
        entry.end();
      });
      source.pipe(entry);
      archive.append(entry, { name: file.path });
    }

    archive.append(
      missing.length > 0
        ? `Fichiers référencés en base mais absents ou illisibles au moment de la sauvegarde :\n\n${missing.join("\n")}\n`
        : "Aucun fichier manquant : tous les fichiers référencés en base sont présents dans cette archive.\n",
      { name: "RAPPORT-SAUVEGARDE.txt" },
    );

    await archive.finalize();
  })();

  return Readable.toWeb(archive) as ReadableStream<Uint8Array>;
}
