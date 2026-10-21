import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { ACTION_TITLES, getTool, readLabel } from "@/lib/assistant/tools";
import type { Pending } from "@/lib/assistant/run";

// Historique enregistré (format de l'API) → fil affiché dans le panneau.
export type AssistantItem =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string }
  | { kind: "read"; label: string }
  | {
      kind: "action";
      id: string;
      title: string;
      details: string[];
      state: "pending" | "done" | "cancelled" | "failed";
      result?: string;
    };

export function toDisplay(messages: Anthropic.Beta.BetaMessageParam[], pending: Pending | null): AssistantItem[] {
  const items: AssistantItem[] = [];
  const results = new Map<string, Anthropic.Beta.BetaToolResultBlockParam>();
  for (const message of messages) {
    if (message.role === "user" && Array.isArray(message.content)) {
      for (const block of message.content) if (block.type === "tool_result") results.set(block.tool_use_id, block);
    }
  }
  const pendingById = new Map((pending?.actions ?? []).map((action) => [action.id, action]));

  for (const message of messages) {
    const blocks = typeof message.content === "string" ? [{ type: "text" as const, text: message.content }] : message.content;
    for (const block of blocks) {
      if (block.type === "text" && block.text.trim()) {
        items.push({ kind: message.role === "user" ? "user" : "assistant", text: block.text });
      } else if (block.type === "tool_use") {
        const tool = getTool(block.name);
        if (tool?.kind === "read") {
          items.push({ kind: "read", label: readLabel(block.name, block.input) });
          continue;
        }
        const waiting = pendingById.get(block.id);
        if (waiting) {
          items.push({ kind: "action", id: block.id, title: waiting.title, details: waiting.details, state: "pending" });
          continue;
        }
        const result = results.get(block.id);
        const text = typeof result?.content === "string" ? result.content : "";
        items.push({
          kind: "action",
          id: block.id,
          title: ACTION_TITLES[block.name] ?? block.name,
          details: [],
          state: text.startsWith("Confirmée") ? "done" : text.startsWith("L'admin a annulé") ? "cancelled" : "failed",
          result: text.replace(/^Confirmée par l'admin et faite\. /, ""),
        });
      }
    }
  }
  return items;
}
