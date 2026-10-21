"use server";

import type Anthropic from "@anthropic-ai/sdk";
import { verifyAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { toDisplay, type AssistantItem } from "@/lib/assistant/display";
import type { Pending } from "@/lib/assistant/run";

// Historique de l'assistant (2026-10-21) : chaque admin ne voit que ses
// propres conversations.

export async function listAssistantConversations() {
  const admin = await verifyAdminSession();
  return db.assistantConversation.findMany({
    where: { adminId: admin.id },
    select: { id: true, title: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
}

export async function getAssistantConversation(id: string): Promise<AssistantItem[] | null> {
  const admin = await verifyAdminSession();
  const conversation = await db.assistantConversation.findFirst({ where: { id, adminId: admin.id } });
  if (!conversation) return null;
  return toDisplay(
    conversation.messages as unknown as Anthropic.Beta.BetaMessageParam[],
    conversation.pending as unknown as Pending | null,
  );
}

export async function deleteAssistantConversation(id: string) {
  const admin = await verifyAdminSession();
  await db.assistantConversation.deleteMany({ where: { id, adminId: admin.id } });
}
