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
  phone: string | null;
  email: string | null;
  instagram: string | null;
  website: string | null;
}

const SYSTEM_PROMPT = `Tu aides un graphiste freelance français (Mikko Visuel) à trouver de nouveaux
prospects réels et identifiables publiquement (studios, entreprises, événements...).

Règles strictes :
- N'invente JAMAIS de coordonnées. Si une information n'est pas trouvée publiquement, laisse le
  champ correspondant à null plutôt que de deviner.
- Ne retourne que des entités réelles trouvées via la recherche web, jamais des exemples génériques.
- Indique si un site internet a été trouvé (champ "website"), ou null si l'entité n'en a pas /
  n'a pas été trouvé.
- Réponds UNIQUEMENT avec un tableau JSON valide, sans texte avant ni après, au format exact :
  [{"name": string, "company": string|null, "address": string|null, "phone": string|null,
    "email": string|null, "instagram": string|null, "website": string|null}]`;

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
    phone: isNonEmptyString(record.phone) ? record.phone.trim() : null,
    email: isNonEmptyString(record.email) ? record.email.trim().toLowerCase() : null,
    instagram: isNonEmptyString(record.instagram) ? record.instagram.trim() : null,
    website: isNonEmptyString(record.website) ? record.website.trim() : null,
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
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Trouve jusqu'à ${limit} prospects correspondant à cette recherche : "${query}".`,
      },
    ],
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 8 }],
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
