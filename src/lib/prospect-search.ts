import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Recherche de prospects assistée par IA (bouton "Rechercher des prospects
// (IA)" sur /admin/prospection) : dégrade proprement si ANTHROPIC_API_KEY
// n'est pas configurée (même principe que Stripe/Resend/Gmail ailleurs dans
// ce projet) — voir searchProspectsWithAI dans src/lib/actions/prospects.ts,
// qui vérifie la clé avant d'appeler ce module.
const DEFAULT_MODEL = "claude-sonnet-5";

export interface FoundProspect {
  name: string;
  company: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  instagramUrl: string | null;
  website: string | null;
  whatsappUrl: string | null;
  activityLevel: string | null;
  // Une phrase justifiant pourquoi cette fiche est un prospect pertinent
  // (fondée sur ce qui a été trouvé, jamais une supposition) — ajoutée à la
  // note du prospect à la création. Distincte de `activityLevel` (signal
  // d'activité) : ceci qualifie plutôt l'intérêt du profil pour un
  // graphiste (identité visuelle absente/datée, besoin visible...).
  matchReason: string | null;
}

// Demande du 2026-09-08 ("bien remplir toutes les colonnes, bien qualifier
// les prospects") : avant cette révision, seuls name/company/address/phone/
// email/instagram/website étaient demandés à l'IA — city, instagramUrl,
// whatsappUrl et activityLevel (colonnes réellement affichées sur
// /admin/prospection, alimentées jusqu'ici par l'import CSV/Sheets mais
// jamais par cette recherche) restaient donc systématiquement vides.
const SYSTEM_PROMPT = `Tu aides un graphiste freelance français (Mikko Visuel) à trouver et qualifier de
nouveaux prospects réels et identifiables publiquement (studios, entreprises, événements,
commerces, associations...).

Pour chaque prospect, cherche activement à compléter TOUS les champs ci-dessous avant de répondre —
ne t'arrête pas au premier résultat de recherche, croise plusieurs sources (site, réseaux sociaux,
annuaires professionnels) pour chaque entité retenue :
- "name" : nom de la personne ou, à défaut, de l'entité.
- "company" : nom de la structure (studio, entreprise, association...), si distinct de "name".
- "address" : adresse complète si trouvée (numéro, rue), sinon null.
- "city" : ville seule (ex. "Lyon"), même si "address" est vide — c'est ce qui alimente la carte
  de prospection, remplis-la dès que la ville est connue même sans adresse précise.
- "phone", "email" : jamais devinés à partir d'un format probable.
- "instagram" : identifiant du compte (ex. "@studio.exemple").
- "instagramUrl" : URL complète du profil (ex. "https://www.instagram.com/studio.exemple/"), pas
  seulement l'identifiant.
- "website" : URL du site, ou null si l'entité n'en a pas / n'a pas été trouvé.
- "whatsappUrl" : lien "wa.me/..." ou "api.whatsapp.com/..." UNIQUEMENT s'il est affiché
  publiquement (souvent le cas pour un commerce local) — ne jamais le construire à partir d'un
  numéro de téléphone trouvé ailleurs.
- "activityLevel" : évalue l'activité publique réelle (fréquence de publication, nombre
  d'abonnés/de posts, dernière activité visible) en une expression courte ("Très actif",
  "Actif", "Peu actif", "Compte dormant"...) — uniquement si tu as un indice concret observé
  (ex. dernier post daté, nombre d'abonnés visible), sinon null. Ne jamais deviner un niveau
  d'activité sans preuve.
- "matchReason" : une phrase courte expliquant en quoi ce prospect est pertinent pour un
  graphiste (ex. identité visuelle absente ou datée, communication très artisanale, structure
  récemment créée, forte présence sur Instagram sans branding travaillé...) — fondée uniquement
  sur ce que tu as réellement observé, jamais une hypothèse générique. null si rien de spécifique
  ne ressort.

Règles strictes :
- N'invente JAMAIS de coordonnée ni de fait. Si une information n'est pas trouvée publiquement
  ou pas confirmée par au moins un indice concret, laisse le champ correspondant à null plutôt
  que de deviner ou d'extrapoler.
- Ne retourne que des entités réelles trouvées via la recherche web, jamais des exemples
  génériques ou plausibles mais non vérifiés.
- Privilégie la qualité à la quantité : mieux vaut renvoyer moins de prospects mais bien
  qualifiés (plusieurs champs remplis, "matchReason" concret) que remplir la limite demandée
  avec des fiches pauvres en information.
- Réponds UNIQUEMENT avec un tableau JSON valide, sans texte avant ni après, au format exact :
  [{"name": string, "company": string|null, "address": string|null, "city": string|null,
    "phone": string|null, "email": string|null, "instagram": string|null,
    "instagramUrl": string|null, "website": string|null, "whatsappUrl": string|null,
    "activityLevel": string|null, "matchReason": string|null}]`;

function extractJsonArray(text: string): unknown {
  const trimmed = text.trim();
  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Réponse IA sans tableau JSON exploitable.");
  }
  return JSON.parse(trimmed.slice(start, end + 1));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeProspect(raw: unknown): FoundProspect | null {
  if (typeof raw !== "object" || raw === null) return null;
  const record = raw as Record<string, unknown>;
  if (!isNonEmptyString(record.name)) return null;
  return {
    name: record.name.trim(),
    company: isNonEmptyString(record.company) ? record.company.trim() : null,
    address: isNonEmptyString(record.address) ? record.address.trim() : null,
    city: isNonEmptyString(record.city) ? record.city.trim() : null,
    phone: isNonEmptyString(record.phone) ? record.phone.trim() : null,
    email: isNonEmptyString(record.email) ? record.email.trim().toLowerCase() : null,
    instagram: isNonEmptyString(record.instagram) ? record.instagram.trim() : null,
    instagramUrl: isNonEmptyString(record.instagramUrl) ? record.instagramUrl.trim() : null,
    website: isNonEmptyString(record.website) ? record.website.trim() : null,
    whatsappUrl: isNonEmptyString(record.whatsappUrl) ? record.whatsappUrl.trim() : null,
    activityLevel: isNonEmptyString(record.activityLevel) ? record.activityLevel.trim() : null,
    matchReason: isNonEmptyString(record.matchReason) ? record.matchReason.trim() : null,
  };
}

export async function findProspectsWithAI(query: string, limit: number): Promise<FoundProspect[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY n'est pas configurée.");
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  const response = await client.messages.create({
    model,
    // Relevé de 4096 : le prompt demande désormais 5 champs texte libre de
    // plus par prospect (city, instagramUrl, whatsappUrl, activityLevel,
    // matchReason) — une réponse à 15 résultats pouvait approcher l'ancienne
    // limite et se faire tronquer en plein JSON.
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Trouve jusqu'à ${limit} prospects correspondant à cette recherche : "${query}". Documente-toi sur chacun (site, réseaux sociaux) avant de répondre plutôt que de t'arrêter au premier résultat de recherche.`,
      },
    ],
    // max_uses relevé de 8 à 14 : qualifier correctement chaque prospect
    // (ville, activité réelle, raison de pertinence) demande plusieurs
    // recherches par entité, pas une seule requête globale.
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 14 }],
  });

  const textBlocks = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  const parsed = extractJsonArray(textBlocks);
  if (!Array.isArray(parsed)) {
    throw new Error("Réponse IA invalide (tableau attendu).");
  }

  return parsed
    .map(normalizeProspect)
    .filter((prospect): prospect is FoundProspect => prospect !== null)
    .slice(0, limit);
}
