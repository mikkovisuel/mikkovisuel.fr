import { NextResponse } from "next/server";
import { getHeapStatistics } from "node:v8";
import { getAdminSession } from "@/lib/dal";

// Sonde mémoire du conteneur web (2026-09-13, signalement "le site est encore
// buggé / des lenteurs"). Le problème du 2026-09-08 a été traité à moitié :
// le cache natif de `sharp` est bien désactivé, mais la mémoire remonte
// quand même à ~95 % du conteneur (489/512 Mo mesurés après ~19 h). Or
// `scalingo stats` ne donne que le RSS global, sans dire **ce qui** occupe
// la place — impossible d'aller plus loin sans cette répartition.
//
// Les trois chiffres qui comptent :
//   - `heapUsedMB` : objets JavaScript vivants. V8 plafonne déjà le tas à
//     259 Mo sur ce conteneur (mesuré), donc une fuite JS ne peut pas à elle
//     seule expliquer un RSS de 489 Mo.
//   - `externalMB`/`arrayBuffersMB` : tampons hors tas (fichiers lus,
//     génération PDF, images).
//   - `nativeMB` (= RSS − tas − externe) : allocations natives et
//     fragmentation glibc. C'est le suspect principal : 8 cœurs visibles et
//     `MALLOC_ARENA_MAX` non défini laissent glibc ouvrir jusqu'à 64 arènes,
//     qui gardent la mémoire libérée au lieu de la rendre à l'OS.
//
// Réservée à l'admin (même garde que /api/admin/search) : ces chiffres
// renseignent sur l'infrastructure, ils n'ont rien à faire en accès public.
export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return new NextResponse(null, { status: 403 });
  }

  const memory = process.memoryUsage();
  const heap = getHeapStatistics();
  const toMB = (bytes: number) => Math.round((bytes / 1048576) * 10) / 10;

  const rssMB = toMB(memory.rss);
  const heapUsedMB = toMB(memory.heapUsed);
  const externalMB = toMB(memory.external);

  return NextResponse.json({
    rssMB,
    heapUsedMB,
    heapTotalMB: toMB(memory.heapTotal),
    heapLimitMB: toMB(heap.heap_size_limit),
    externalMB,
    arrayBuffersMB: toMB(memory.arrayBuffers),
    // Ce qui reste une fois le tas JS et les tampons externes retirés :
    // code natif, piles de threads, et surtout fragmentation de l'allocateur.
    nativeMB: Math.round((rssMB - heapUsedMB - externalMB) * 10) / 10,
    uptimeHours: Math.round((process.uptime() / 3600) * 10) / 10,
    mallocArenaMax: process.env.MALLOC_ARENA_MAX ?? "non défini",
  });
}
