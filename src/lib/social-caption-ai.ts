import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { formatLabel, networkLabel } from "@/lib/social-posts";

// Rédaction assistée des légendes (module Community management, livraison
// 2) : propose un texte + des hashtags à partir du brief de la publication
// et de la ligne éditoriale / du ton du client. Une proposition, jamais une
// écriture directe : l'admin choisit ce qu'il reprend dans le formulaire.
// Dégrade proprement sans ANTHROPIC_API_KEY (comme prospect-search.ts).
const DEFAULT_MODEL = "claude-opus-5";

const SuggestionSchema = z.object({
  caption: z.string(),
  hashtags: z.string(),
});

export type CaptionSuggestion = z.infer<typeof SuggestionSchema>;

export interface CaptionBrief {
  clientName: string;
  editorialLine: string | null;
  brandTone: string | null;
  title: string;
  format: string;
  networks: string[];
  /** Texte déjà saisi : notes en vrac ou brouillon à retravailler. */
  draft: string;
  /** Groupes de hashtags du client, pour rester cohérent avec l'existant. */
  hashtagSets: { name: string; content: string }[];
}

const SYSTEM_PROMPT = `Tu es community manager pour une agence de graphisme française (Mikko Visuel). Tu rédiges des légendes de publications pour les réseaux sociaux de ses clients, en français.

- Respecte à la lettre le ton de la marque et la ligne éditoriale fournis : ils priment sur tes habitudes.
- Adapte la longueur et le style au format et aux réseaux (accroche forte en première ligne pour Instagram et TikTok, plus posé pour LinkedIn).
- Si un brouillon ou des notes sont fournis, garde toutes les informations factuelles (dates, lieux, prix, noms) sans en inventer d'autres. N'invente jamais une information absente du brief : laisse plutôt un repère entre crochets, par ex. [horaire].
- "caption" : le texte de la légende seul, sans hashtags.
- "hashtags" : 5 à 15 hashtags pertinents séparés par des espaces, en réutilisant en priorité ceux des groupes du client quand ils correspondent au sujet.`;

export async function suggestCaption(brief: CaptionBrief): Promise<CaptionSuggestion> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY n'est pas configurée.");
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  const context = [
    `Client : ${brief.clientName}`,
    `Ligne éditoriale : ${brief.editorialLine || "non renseignée"}`,
    `Ton de la marque : ${brief.brandTone || "non renseigné"}`,
    `Format : ${formatLabel(brief.format)}`,
    `Réseaux : ${brief.networks.map(networkLabel).join(", ") || "non précisés"}`,
    `Sujet de la publication : ${brief.title}`,
    brief.draft ? `Brouillon / notes :\n${brief.draft}` : "Pas de brouillon : rédige à partir du sujet.",
    brief.hashtagSets.length > 0
      ? `Groupes de hashtags du client :\n${brief.hashtagSets.map((set) => `- ${set.name} : ${set.content}`).join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await client.beta.messages.parse({
    model,
    max_tokens: 16000,
    // Refus éventuel d'un classifieur : relancé côté serveur sur le modèle
    // de repli recommandé plutôt que de renvoyer une erreur à l'admin.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(SuggestionSchema) },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: context }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("La proposition a été refusée par le modèle.");
  }
  if (response.stop_reason === "max_tokens" || !response.parsed_output) {
    throw new Error("Réponse IA incomplète.");
  }
  return {
    caption: response.parsed_output.caption.trim(),
    hashtags: response.parsed_output.hashtags.trim(),
  };
}
