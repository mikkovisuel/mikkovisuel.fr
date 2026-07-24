import "server-only";
import sharp from "sharp";

const THUMBNAIL_SIZE = 320;

// Vignette légère pour les grilles de fichiers (`FileGrid`) — évite de
// télécharger l'original en pleine résolution juste pour l'afficher dans un
// carré de 112px : avec une dizaine de photos par tâche, ça faisait ramer la
// page (plusieurs Mo décodés par le navigateur pour un aperçu minuscule).
// `.rotate()` sans argument applique l'orientation EXIF (photos de
// téléphone) avant redimensionnement. Générée à la volée à chaque requête,
// sans cache disque — largement suffisant pour la volumétrie de ce projet
// (voir `Cache-Control` côté route pour éviter de la refaire à chaque clic).
export async function createThumbnail(original: Buffer): Promise<Buffer> {
  return sharp(original)
    .rotate()
    .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 70 })
    .toBuffer();
}
