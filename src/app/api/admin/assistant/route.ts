import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { runAssistant, saveConversation, type AssistantEvent, type Pending } from "@/lib/assistant/run";

// Assistant Claude du back-office (2026-10-21). Réponse en flux NDJSON (un
// évènement JSON par ligne) : texte au fil de l'eau, lectures, cartes
// d'actions à confirmer, résultats. Réservé aux admins ; chaque admin ne voit
// que ses conversations.
export const maxDuration = 300;

const BodySchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().trim().max(8000).optional(),
  decisions: z.record(z.string(), z.enum(["confirm", "cancel"])).optional(),
});

export async function POST(request: Request) {
  const admin = await getAdminSession();
  if (!admin) return new Response(null, { status: 403 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "L'assistant n'est pas configuré (clé Anthropic manquante)." }, { status: 503 });
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || (!parsed.data.message && !parsed.data.decisions)) {
    return Response.json({ error: "Demande invalide." }, { status: 400 });
  }
  const { conversationId, message, decisions } = parsed.data;

  const conversation = conversationId
    ? await db.assistantConversation.findFirst({ where: { id: conversationId, adminId: admin.id } })
    : await db.assistantConversation.create({ data: { adminId: admin.id, title: (message ?? "").slice(0, 80) } });
  if (!conversation) return Response.json({ error: "Conversation introuvable." }, { status: 404 });

  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      const emit = (event: AssistantEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      emit({ t: "conversation", id: conversation.id });
      // Ligne vide toutes les 15 s : le routeur coupe une réponse silencieuse
      // (lectures longues), le navigateur ignore ces lignes.
      const keepAlive = setInterval(() => controller.enqueue(encoder.encode("\n")), 15_000);
      try {
        const result = await runAssistant({
          conversation: {
            id: conversation.id,
            messages: conversation.messages as unknown as Anthropic.Beta.BetaMessageParam[],
            pending: conversation.pending as unknown as Pending | null,
          },
          message,
          decisions,
          ctx: { admin: { id: admin.id, email: admin.email } },
          emit,
        });
        await saveConversation(conversation.id, result);
      } catch (error) {
        emit({
          t: "error",
          message:
            error instanceof Anthropic.RateLimitError
              ? "Trop de demandes pour le moment, réessayez dans une minute."
              : error instanceof Anthropic.AuthenticationError
                ? "Clé Anthropic refusée : vérifiez la configuration."
                : "L'assistant n'a pas pu répondre. Réessayez.",
        });
      } finally {
        clearInterval(keepAlive);
        controller.close();
      }
    },
  });

  return new Response(body, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
