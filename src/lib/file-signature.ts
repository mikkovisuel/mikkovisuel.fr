import "server-only";
import sharp from "sharp";

// Vérifie le contenu réel d'un fichier envoyé, pas seulement son
// `Content-Type` déclaré par le navigateur (spoofable côté client — voir
// l'audit sécurité du 2026-07-28). Ne couvre que les types servis `inline`
// (images, PDF) : les autres types autorisés (vidéo, zip) restent validés
// par MIME déclaré uniquement, comme avant.
const PDF_MAGIC = Buffer.from("%PDF-");

async function looksLikeImage(buffer: Buffer): Promise<boolean> {
  try {
    const metadata = await sharp(buffer).metadata();
    return Boolean(metadata.format);
  } catch {
    return false;
  }
}

function looksLikePdf(buffer: Buffer): boolean {
  return buffer.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC);
}

// Retourne `true` si le contenu réel du fichier correspond à son type
// déclaré, pour les types qu'on sait vérifier (image/*, application/pdf).
// Retourne aussi `true` pour tout autre type déclaré (vidéo, zip...) — pas
// de régression sur ce qui n'est pas encore couvert par cette vérification.
export async function contentMatchesDeclaredType(
  buffer: Buffer,
  declaredType: string,
): Promise<boolean> {
  if (declaredType === "application/pdf") {
    return looksLikePdf(buffer);
  }
  if (declaredType.startsWith("image/")) {
    return looksLikeImage(buffer);
  }
  return true;
}
