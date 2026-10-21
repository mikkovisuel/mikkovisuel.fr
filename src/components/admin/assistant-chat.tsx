"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  Check,
  ClockCounterClockwise,
  Database,
  Plus,
  ShieldCheck,
  Sparkle,
  Trash,
  X,
} from "@phosphor-icons/react";
import {
  deleteAssistantConversation,
  getAssistantConversation,
  listAssistantConversations,
} from "@/lib/actions/assistant";
import type { AssistantItem } from "@/lib/assistant/display";

// Assistant Claude du back-office (2026-10-21) : panneau latéral (barre du
// haut) et page « Assistant ». Lectures automatiques ; chaque action passe
// par une carte « Confirmer / Annuler ». Historique par admin.

type Item = AssistantItem | { kind: "error"; text: string };
type Conversation = { id: string; title: string; updatedAt: Date };

/** Texte simple, chemins « /admin/… » rendus cliquables. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\/admin\/[A-Za-z0-9/_\-?=&.]*[A-Za-z0-9/_\-])/g);
  return (
    <span className="whitespace-pre-wrap break-words">
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <Link key={index} href={part} className="text-ink underline decoration-accent decoration-2 underline-offset-2">
            {part}
          </Link>
        ) : (
          part
        ),
      )}
    </span>
  );
}

export function AssistantChat({ variant, onClose }: { variant: "panel" | "page"; onClose?: () => void }) {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [decisions, setDecisions] = useState<Record<string, "confirm" | "cancel">>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  const refreshList = useCallback(() => {
    listAssistantConversations().then(setConversations).catch(() => {});
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [items]);

  async function send(body: { message?: string; decisions?: Record<string, "confirm" | "cancel"> }) {
    setBusy(true);
    if (body.message) setItems((prev) => [...prev, { kind: "user", text: body.message! }]);
    let refresh = false;
    try {
      const response = await fetch("/api/admin/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(conversationId ? { conversationId } : {}), ...body }),
      });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        setItems((prev) => [...prev, { kind: "error", text: data?.error ?? "L'assistant n'a pas pu répondre." }]);
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.t === "conversation") setConversationId(event.id);
          else if (event.t === "text")
            setItems((prev) => {
              const last = prev[prev.length - 1];
              return last?.kind === "assistant"
                ? [...prev.slice(0, -1), { ...last, text: last.text + event.d }]
                : [...prev, { kind: "assistant", text: event.d }];
            });
          else if (event.t === "read") setItems((prev) => [...prev, { kind: "read", label: event.label }]);
          else if (event.t === "confirm")
            setItems((prev) => [
              ...prev,
              ...event.actions.map((action: { id: string; title: string; details: string[] }) => ({
                kind: "action" as const,
                ...action,
                state: "pending" as const,
              })),
            ]);
          else if (event.t === "result") {
            if (event.ok) refresh = true;
            setItems((prev) =>
              prev.map((item) =>
                item.kind === "action" && item.id === event.id
                  ? { ...item, state: event.ok ? "done" : event.text === "Annulée" ? "cancelled" : "failed", result: event.text }
                  : item,
              ),
            );
          } else if (event.t === "error") setItems((prev) => [...prev, { kind: "error", text: event.message }]);
        }
      }
    } catch {
      setItems((prev) => [...prev, { kind: "error", text: "Connexion interrompue. Réessayez." }]);
    } finally {
      setBusy(false);
      setDecisions({});
      refreshList();
      // Les données affichées derrière (tâches, factures…) ont pu changer.
      if (refresh) router.refresh();
    }
  }

  function submit() {
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    send({ message });
  }

  // Une décision par action en attente ; quand toutes sont prises, on envoie.
  function decide(id: string, decision: "confirm" | "cancel") {
    const next = { ...decisions, [id]: decision };
    setDecisions(next);
    const pendingIds = items.filter((item) => item.kind === "action" && item.state === "pending").map((item) => (item as { id: string }).id);
    if (pendingIds.every((pendingId) => next[pendingId])) send({ decisions: next });
  }

  async function open(id: string) {
    setHistoryOpen(false);
    setConversationId(id);
    setItems((await getAssistantConversation(id)) ?? []);
  }

  function startNew() {
    setHistoryOpen(false);
    setConversationId(null);
    setItems([]);
  }

  async function remove(id: string) {
    if (!window.confirm("Supprimer cette conversation ?")) return;
    await deleteAssistantConversation(id);
    if (id === conversationId) startNew();
    refreshList();
  }

  const iconButton = "flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-ink/[0.08] hover:text-ink";

  const history = (
    <ul className="flex flex-col gap-0.5">
      {conversations.length === 0 && <li className="px-3 py-2 text-sm text-ink-muted">Aucune conversation.</li>}
      {conversations.map((conversation) => (
        <li key={conversation.id} className="group flex items-center">
          <button
            type="button"
            onClick={() => open(conversation.id)}
            className={`min-w-0 flex-1 truncate rounded-r-full py-2 pl-3 pr-2 text-left text-sm transition-colors ${
              conversation.id === conversationId ? "bg-select font-medium text-ink" : "text-ink hover:bg-ink/[0.06]"
            }`}
          >
            {conversation.title || "Sans titre"}
          </button>
          <button
            type="button"
            onClick={() => remove(conversation.id)}
            aria-label="Supprimer la conversation"
            className="ml-1 hidden shrink-0 text-ink-muted hover:text-danger group-hover:block"
          >
            <Trash size={14} />
          </button>
        </li>
      ))}
    </ul>
  );

  let thread: ReactNode = (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-ink-muted">
      <Sparkle size={28} weight="fill" className="text-accent-strong" />
      <p className="text-base text-ink">Que puis-je faire pour vous ?</p>
      <p>« Quelles factures sont en retard ? », « Résume le client Bokao », « Crée une tâche pour… »</p>
    </div>
  );
  if (items.length > 0) {
    thread = (
      <div className="flex flex-col gap-3 px-4 py-4 text-sm">
        {items.map((item, index) => {
          if (item.kind === "user")
            return (
              <div key={index} className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-select px-3 py-2 text-ink">
                <RichText text={item.text} />
              </div>
            );
          if (item.kind === "assistant")
            return (
              <div key={index} className="leading-relaxed text-ink">
                <RichText text={item.text} />
              </div>
            );
          if (item.kind === "read")
            return (
              <div key={index} className="flex items-center gap-1.5 text-xs text-ink-muted">
                <Database size={13} /> A lu : {item.label}
              </div>
            );
          if (item.kind === "error")
            return (
              <div key={index} className="rounded-xl border border-danger/40 px-3 py-2 text-danger">
                {item.text}
              </div>
            );
          const decided = decisions[item.id];
          return (
            <div key={index} className="rounded-xl border border-[var(--color-outline)] p-3">
              <div className="mb-1 flex items-center gap-1.5 text-xs text-ink-muted">
                <ShieldCheck size={13} />
                {item.state === "pending" ? "Action à confirmer" : item.state === "done" ? "Faite" : item.state === "cancelled" ? "Annulée" : "Échec"}
              </div>
              <p className="font-medium text-ink">{item.title}</p>
              {item.details.map((line, lineIndex) => (
                <p key={lineIndex} className="whitespace-pre-wrap break-words text-ink-muted">
                  {line}
                </p>
              ))}
              {item.result && item.state !== "cancelled" && (
                <p className={`mt-1 ${item.state === "done" ? "text-ink" : "text-danger"}`}>
                  <RichText text={item.result} />
                </p>
              )}
              {item.state === "pending" && (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={busy || Boolean(decided)}
                    onClick={() => decide(item.id, "confirm")}
                    className="inline-flex h-8 items-center gap-1 rounded-full bg-accent px-4 text-sm font-medium text-accent-ink disabled:opacity-60"
                  >
                    <Check size={14} weight="bold" /> {decided === "confirm" ? "Confirmé" : "Confirmer"}
                  </button>
                  <button
                    type="button"
                    disabled={busy || Boolean(decided)}
                    onClick={() => decide(item.id, "cancel")}
                    className="h-8 rounded-full border border-[var(--color-outline)] px-4 text-sm text-ink disabled:opacity-60"
                  >
                    {decided === "cancel" ? "Annulé" : "Annuler"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {busy && <div className="text-xs text-ink-muted">L&apos;assistant travaille…</div>}
        <div ref={bottomRef} />
      </div>
    );
  }

  const composer = (
    <div className="border-t border-line p-3">
      <div className="flex items-end gap-2 rounded-2xl border border-[var(--color-outline)] px-3 py-2 focus-within:ring-1 focus-within:ring-accent">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder="Demander à l'assistant…"
          aria-label="Message pour l'assistant"
          className="max-h-40 min-h-6 flex-1 resize-none bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
        />
        <button
          type="button"
          onClick={submit}
          disabled={busy || !input.trim()}
          aria-label="Envoyer"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink disabled:opacity-40"
        >
          <ArrowUp size={16} weight="bold" />
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-ink-muted">
        Claude Sonnet · peut se tromper : vérifiez avant de confirmer une action.
      </p>
    </div>
  );

  if (variant === "page") {
    return (
      <div className="flex h-[calc(100dvh-121px)] overflow-hidden lg:h-[calc(100dvh-137px)]">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-line py-3 pr-2 md:flex">
          <button
            type="button"
            onClick={startNew}
            className="mb-3 ml-3 inline-flex h-9 w-fit items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-accent-ink"
          >
            <Plus size={14} weight="bold" /> Nouvelle conversation
          </button>
          <div className="flex-1 overflow-y-auto">{history}</div>
        </aside>
        <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
          <div className="flex-1 overflow-y-auto">{thread}</div>
          {composer}
        </section>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center gap-1 border-b border-line pl-4 pr-2">
        <Sparkle size={16} weight="fill" className="text-accent-strong" />
        <span className="flex-1 text-sm font-medium text-ink">Assistant</span>
        <button type="button" onClick={() => setHistoryOpen((open) => !open)} aria-label="Historique" aria-pressed={historyOpen} className={iconButton}>
          <ClockCounterClockwise size={17} />
        </button>
        <button type="button" onClick={startNew} aria-label="Nouvelle conversation" className={iconButton}>
          <Plus size={17} />
        </button>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Fermer l'assistant" className={iconButton}>
            <X size={17} />
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{historyOpen ? <div className="py-2 pr-2">{history}</div> : thread}</div>
      {!historyOpen && composer}
    </div>
  );
}
