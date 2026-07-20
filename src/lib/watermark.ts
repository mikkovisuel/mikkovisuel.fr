import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const LOGO_PATH = path.join(process.cwd(), "public/brand/favicon-head.svg");
const TILE_SIZE = 160;
const MARK_SIZE = 90;
const OPACITY = 0.1;

let tilePromise: Promise<Buffer> | null = null;

// Construit une fois (puis met en cache en mémoire) une tuile transparente
// du logo, prête à être répétée sur une image — voir `watermarkImage`.
// L'opacité n'est pas un réglage natif de `sharp().composite()`, donc on la
// simule en multipliant le canal alpha du logo rasterisé avant de le
// réutiliser comme overlay.
async function buildTile(): Promise<Buffer> {
  const svg = await readFile(LOGO_PATH);
  const padding = (TILE_SIZE - MARK_SIZE) / 2;

  const { data, info } = await sharp(svg)
    .resize(MARK_SIZE, MARK_SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 3; i < data.length; i += 4) {
    data[i] = Math.round(data[i] * OPACITY);
  }

  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

function getTile(): Promise<Buffer> {
  if (!tilePromise) tilePromise = buildTile();
  return tilePromise;
}

// Filigrane appliqué à la volée aux BAT (Deliverable.kind = "bat") vus par
// le client — voir /api/fichiers/livrables/[id]. Le fichier original en
// stockage n'est jamais modifié, seul le buffer servi l'est.
export async function watermarkImage(imageBuffer: Buffer): Promise<Buffer> {
  const { width, height } = await sharp(imageBuffer).metadata();
  // sharp refuse de composer une tuile plus grande que l'image de base —
  // en dessous de cette taille (logo, icône...), on sert l'original tel
  // quel plutôt que de faire échouer le téléchargement.
  if (!width || !height || width < TILE_SIZE || height < TILE_SIZE) {
    return imageBuffer;
  }

  const tile = await getTile();
  return sharp(imageBuffer)
    .composite([{ input: tile, tile: true, blend: "over" }])
    .toBuffer();
}
