import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

// Chiffrement au repos pour un seul secret dans ce projet : le refresh
// token Gmail (`Admin.gmailRefreshTokenEnc`), qui donne un accès permanent
// en lecture/envoi au Gmail personnel de l'admin — une fuite de la base ne
// doit pas suffire à elle seule à l'exploiter. AES-256-GCM (authentifié,
// détecte toute altération) avec une clé dérivée de `ENCRYPTION_KEY`
// (chaîne aléatoire en variable d'env, générée une fois — voir le guide de
// configuration Gmail).
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("ENCRYPTION_KEY n'est pas configurée.");
  }
  // sha256 dérive systématiquement une clé de 32 octets valides pour
  // AES-256, quelle que soit la longueur de la chaîne fournie en env.
  return createHash("sha256").update(secret).digest();
}

// Format stocké : "iv:authTag:ciphertext", chaque partie en base64url.
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((part) => part.toString("base64url")).join(":");
}

export function decryptSecret(stored: string): string {
  const [ivB64, authTagB64, ciphertextB64] = stored.split(":");
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Format de secret chiffré invalide.");
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64url")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
