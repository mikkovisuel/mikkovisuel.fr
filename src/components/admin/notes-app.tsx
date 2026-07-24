"use client";

import { useMemo, useRef, useState } from "react";
import {
  Plus,
  MagnifyingGlass,
  PushPin,
  PushPinSlash,
  Trash,
  FolderSimple,
  PencilSimple,
  Check,
  X,
  NotePencil,
  CaretLeft,
  Bell,
} from "@phosphor-icons/react";
import {
  createFolder,
  renameFolder,
  deleteFolder,
  createNote,
  updateNote,
  deleteNote,
} from "@/lib/actions/notes";
import { NoteEditor } from "@/components/admin/note-editor";

export interface NoteFolderData {
  id: string;
  name: string;
}

export interface NoteData {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  folderId: string | null;
  clientId: string | null;
  reminderAt: string | null;
  updatedAt: string;
}

export interface ClientOption {
  id: string;
  name: string;
}

type View = { type: "all" } | { type: "pinned" } | { type: "reminders" } | { type: "folder"; folderId: string };

// Comparaison par date calendaire locale (année/mois/jour), pas par
// timestamp brut — un rappel posé pour "aujourd'hui" est stocké en minuit
// UTC (`new Date("2026-07-24")`), qui ne tombe pas au même instant que
// minuit local ; comparer les timestamps directement décale le seuil "dû"
// de quelques heures selon le fuseau. Même convention que `dueDateKey`
// (src/lib/tasks.ts) pour les échéances de tâches.
function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isReminderDue(reminderAt: string) {
  return dateKey(new Date(reminderAt)) <= dateKey(new Date());
}

function formatReminderDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// En dessous de `md`, les 3 colonnes n'ont pas la place de coexister : on
// n'affiche qu'un panneau à la fois façon Apple Notes sur iPhone (dossiers
// -> notes -> édition, avec retour). À partir de `md`, ignoré : les 3
// colonnes restent côte à côte comme sur desktop.
type MobilePane = "folders" | "list" | "editor";

const SAVE_DELAY_MS = 600;

function formatNoteDate(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return `Aujourd'hui à ${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function snippet(html: string) {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 0 ? text : "Note vide";
}

export function NotesApp({
  initialFolders,
  initialNotes,
  clients,
}: {
  initialFolders: NoteFolderData[];
  initialNotes: NoteData[];
  clients: ClientOption[];
}) {
  const [folders, setFolders] = useState(initialFolders);
  const [notes, setNotes] = useState(initialNotes);
  const [view, setView] = useState<View>({ type: "all" });
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(initialNotes[0]?.id ?? null);
  const [mobilePane, setMobilePane] = useState<MobilePane>("folders");
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState<string>("");
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");

  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  function scheduleSave(noteId: string, patch: Partial<NoteData>) {
    if (saveTimers.current[noteId]) clearTimeout(saveTimers.current[noteId]);
    saveTimers.current[noteId] = setTimeout(() => {
      updateNote(noteId, patch);
      delete saveTimers.current[noteId];
    }, SAVE_DELAY_MS);
  }

  function patchNote(noteId: string, patch: Partial<NoteData>, saveImmediately = false) {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId
          ? { ...note, ...patch, updatedAt: new Date().toISOString() }
          : note,
      ),
    );
    if (saveImmediately) {
      if (saveTimers.current[noteId]) clearTimeout(saveTimers.current[noteId]);
      updateNote(noteId, patch);
    } else {
      scheduleSave(noteId, patch);
    }
  }

  const visibleNotes = useMemo(() => {
    let result = notes;
    if (view.type === "pinned") {
      result = result.filter((note) => note.pinned);
    } else if (view.type === "reminders") {
      result = result.filter((note) => note.reminderAt !== null);
    } else if (view.type === "folder") {
      result = result.filter((note) => note.folderId === view.folderId);
    }
    if (clientFilter) {
      result = result.filter((note) => note.clientId === clientFilter);
    }
    const query = search.trim().toLowerCase();
    if (query) {
      result = result.filter((note) => {
        const haystack = `${note.title} ${snippet(note.content)}`.toLowerCase();
        return haystack.includes(query);
      });
    }
    if (view.type === "reminders") {
      // Rappel le plus proche en premier, plutôt que le tri épinglées/récence
      // habituel — c'est une file d'attente par échéance, pas par activité.
      return [...result].sort(
        (a, b) => new Date(a.reminderAt!).getTime() - new Date(b.reminderAt!).getTime(),
      );
    }
    return [...result].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [notes, view, clientFilter, search]);

  const dueReminderCount = useMemo(
    () => notes.filter((note) => note.reminderAt !== null && isReminderDue(note.reminderAt)).length,
    [notes],
  );

  const selectedNote = notes.find((note) => note.id === selectedNoteId) ?? null;

  async function handleCreateNote() {
    const folderId = view.type === "folder" ? view.folderId : null;
    const note = await createNote({ folderId, clientId: clientFilter || null });
    const created: NoteData = {
      id: note.id,
      title: note.title,
      content: note.content,
      pinned: note.pinned,
      folderId: note.folderId,
      clientId: note.clientId,
      reminderAt: note.reminderAt ? note.reminderAt.toISOString() : null,
      updatedAt: note.updatedAt.toString(),
    };
    setNotes((prev) => [created, ...prev]);
    setSelectedNoteId(created.id);
    setMobilePane("editor");
  }

  async function handleDeleteNote(noteId: string) {
    if (!window.confirm("Supprimer définitivement cette note ?")) return;
    if (saveTimers.current[noteId]) clearTimeout(saveTimers.current[noteId]);
    setNotes((prev) => prev.filter((note) => note.id !== noteId));
    if (selectedNoteId === noteId) {
      setSelectedNoteId(null);
      setMobilePane("list");
    }
    await deleteNote(noteId);
  }

  function selectView(next: View) {
    setView(next);
    setMobilePane("list");
  }

  function selectNote(noteId: string) {
    setSelectedNoteId(noteId);
    setMobilePane("editor");
  }

  async function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) {
      setIsAddingFolder(false);
      return;
    }
    const folder = await createFolder(name);
    setFolders((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setNewFolderName("");
    setIsAddingFolder(false);
  }

  async function handleRenameFolder(folderId: string) {
    const name = editingFolderName.trim();
    setEditingFolderId(null);
    if (!name) return;
    setFolders((prev) => prev.map((f) => (f.id === folderId ? { ...f, name } : f)));
    await renameFolder(folderId, name);
  }

  async function handleDeleteFolder(folderId: string) {
    if (!window.confirm("Supprimer ce dossier ? Les notes qu'il contient seront conservées, sans dossier."))
      return;
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    setNotes((prev) => prev.map((n) => (n.folderId === folderId ? { ...n, folderId: null } : n)));
    if (view.type === "folder" && view.folderId === folderId) setView({ type: "all" });
    await deleteFolder(folderId);
  }

  const viewLabel =
    view.type === "all"
      ? "Toutes les notes"
      : view.type === "pinned"
        ? "Épinglées"
        : view.type === "reminders"
          ? "Rappels"
          : (folders.find((f) => f.id === view.folderId)?.name ?? "Dossier");

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-line bg-surface-elevated">
      {/* Dossiers */}
      <aside
        className={`w-full shrink-0 flex-col gap-1 overflow-y-auto border-r border-line p-3 md:flex md:w-56 ${
          mobilePane === "folders" ? "flex" : "hidden"
        }`}
      >
        <button
          onClick={() => selectView({ type: "all" })}
          className={`rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${
            view.type === "all" ? "bg-accent text-accent-ink" : "text-ink hover:bg-surface"
          }`}
        >
          Toutes les notes
        </button>
        <button
          onClick={() => selectView({ type: "pinned" })}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${
            view.type === "pinned" ? "bg-accent text-accent-ink" : "text-ink hover:bg-surface"
          }`}
        >
          <PushPin size={14} weight="fill" /> Épinglées
        </button>
        <button
          onClick={() => selectView({ type: "reminders" })}
          className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${
            view.type === "reminders" ? "bg-accent text-accent-ink" : "text-ink hover:bg-surface"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Bell size={14} weight="fill" /> Rappels
          </span>
          {dueReminderCount > 0 && (
            <span
              className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium ${
                view.type === "reminders" ? "bg-accent-ink/20 text-accent-ink" : "bg-accent text-accent-ink"
              }`}
            >
              {dueReminderCount}
            </span>
          )}
        </button>

        <div className="mt-3 mb-1 flex items-center justify-between px-2.5">
          <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">Dossiers</span>
          <button
            onClick={() => setIsAddingFolder(true)}
            aria-label="Nouveau dossier"
            className="text-ink-muted hover:text-ink"
          >
            <Plus size={14} weight="bold" />
          </button>
        </div>

        {folders.map((folder) =>
          editingFolderId === folder.id ? (
            <div key={folder.id} className="flex items-center gap-1 px-2">
              <input
                autoFocus
                value={editingFolderName}
                onChange={(e) => setEditingFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameFolder(folder.id);
                  if (e.key === "Escape") setEditingFolderId(null);
                }}
                className="w-full rounded border border-line bg-surface px-1.5 py-1 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button onClick={() => handleRenameFolder(folder.id)} className="text-ink-muted hover:text-ink">
                <Check size={14} />
              </button>
            </div>
          ) : (
            <div
              key={folder.id}
              className={`group flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                view.type === "folder" && view.folderId === folder.id
                  ? "bg-accent text-accent-ink"
                  : "text-ink hover:bg-surface"
              }`}
            >
              <button
                onClick={() => selectView({ type: "folder", folderId: folder.id })}
                className="flex flex-1 items-center gap-1.5 truncate text-left"
              >
                <FolderSimple size={14} weight="regular" />
                <span className="truncate">{folder.name}</span>
              </button>
              <div className="hidden items-center gap-1 group-hover:flex">
                <button
                  onClick={() => {
                    setEditingFolderId(folder.id);
                    setEditingFolderName(folder.name);
                  }}
                  aria-label="Renommer"
                  className="opacity-70 hover:opacity-100"
                >
                  <PencilSimple size={13} />
                </button>
                <button
                  onClick={() => handleDeleteFolder(folder.id)}
                  aria-label="Supprimer le dossier"
                  className="opacity-70 hover:opacity-100"
                >
                  <Trash size={13} />
                </button>
              </div>
            </div>
          ),
        )}

        {isAddingFolder && (
          <div className="flex items-center gap-1 px-2">
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
                if (e.key === "Escape") setIsAddingFolder(false);
              }}
              placeholder="Nom du dossier"
              className="w-full rounded border border-line bg-surface px-1.5 py-1 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <button onClick={handleCreateFolder} className="text-ink-muted hover:text-ink">
              <Check size={14} />
            </button>
            <button onClick={() => setIsAddingFolder(false)} className="text-ink-muted hover:text-ink">
              <X size={14} />
            </button>
          </div>
        )}
      </aside>

      {/* Liste des notes */}
      <section
        className={`w-full shrink-0 flex-col border-r border-line md:flex md:w-80 ${
          mobilePane === "list" ? "flex" : "hidden"
        }`}
      >
        <div className="space-y-2 border-b border-line p-3">
          <button
            onClick={() => setMobilePane("folders")}
            className="flex items-center gap-1 text-sm text-ink-muted hover:text-ink md:hidden"
          >
            <CaretLeft size={14} /> Dossiers
          </button>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">{viewLabel}</h2>
            <button
              onClick={handleCreateNote}
              aria-label="Nouvelle note"
              className="rounded-md p-1 text-ink-muted hover:bg-surface hover:text-ink"
            >
              <NotePencil size={17} weight="regular" />
            </button>
          </div>
          <div className="relative">
            <MagnifyingGlass
              size={14}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher"
              className="w-full rounded-md border border-line bg-surface py-1.5 pl-7 pr-2 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          {clients.length > 0 && (
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full rounded-md border border-line bg-surface px-2 py-1.5 text-xs text-ink-muted focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Tous les clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <ul className="flex-1 overflow-y-auto">
          {visibleNotes.length === 0 && (
            <li className="p-4 text-sm text-ink-muted">Aucune note.</li>
          )}
          {visibleNotes.map((note) => (
            <li key={note.id}>
              <button
                onClick={() => selectNote(note.id)}
                className={`w-full border-b border-line px-3 py-2.5 text-left transition-colors ${
                  selectedNoteId === note.id ? "bg-surface" : "hover:bg-surface"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {note.pinned && <PushPin size={11} weight="fill" className="shrink-0 text-accent" />}
                  <span className="truncate text-sm font-medium text-ink">
                    {note.title.trim() || "Sans titre"}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
                  {note.reminderAt ? (
                    <span
                      className={`flex shrink-0 items-center gap-1 ${
                        isReminderDue(note.reminderAt) ? "font-medium text-danger" : ""
                      }`}
                    >
                      <Bell size={11} weight="fill" />
                      {formatReminderDate(note.reminderAt)}
                    </span>
                  ) : (
                    <span className="shrink-0">{formatNoteDate(note.updatedAt)}</span>
                  )}
                  <span className="truncate">{snippet(note.content)}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Éditeur */}
      <div
        className={`w-full flex-1 flex-col overflow-hidden md:flex ${
          mobilePane === "editor" ? "flex" : "hidden"
        }`}
      >
        {selectedNote ? (
          <>
            <div className="flex flex-col gap-2 border-b border-line px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-3 md:px-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobilePane("list")}
                  aria-label="Retour aux notes"
                  className="shrink-0 text-ink-muted hover:text-ink md:hidden"
                >
                  <CaretLeft size={18} />
                </button>
                <input
                  value={selectedNote.title}
                  onChange={(e) => patchNote(selectedNote.id, { title: e.target.value })}
                  placeholder="Titre"
                  className="min-w-0 flex-1 font-display text-xl font-semibold text-ink focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 md:shrink-0 md:flex-nowrap">
                <select
                  value={selectedNote.folderId ?? ""}
                  onChange={(e) => patchNote(selectedNote.id, { folderId: e.target.value || null }, true)}
                  className="min-w-0 max-w-[9rem] rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink-muted focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="">Sans dossier</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
                {clients.length > 0 && (
                  <select
                    value={selectedNote.clientId ?? ""}
                    onChange={(e) => patchNote(selectedNote.id, { clientId: e.target.value || null }, true)}
                    className="min-w-0 max-w-[9rem] rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink-muted focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="">Aucun client lié</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                )}
                <label
                  className={`flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${
                    selectedNote.reminderAt && isReminderDue(selectedNote.reminderAt)
                      ? "border-danger/40 text-danger"
                      : "border-line text-ink-muted"
                  }`}
                >
                  <Bell size={13} weight={selectedNote.reminderAt ? "fill" : "regular"} />
                  <input
                    type="date"
                    value={selectedNote.reminderAt ? selectedNote.reminderAt.slice(0, 10) : ""}
                    onChange={(e) =>
                      patchNote(selectedNote.id, { reminderAt: e.target.value || null }, true)
                    }
                    aria-label="Rappel"
                    className="w-[6.5rem] bg-transparent focus:outline-none"
                  />
                </label>
                <button
                  onClick={() => patchNote(selectedNote.id, { pinned: !selectedNote.pinned }, true)}
                  aria-label={selectedNote.pinned ? "Désépingler" : "Épingler"}
                  className="rounded-md p-1.5 text-ink-muted hover:bg-surface hover:text-ink"
                >
                  {selectedNote.pinned ? (
                    <PushPinSlash size={16} weight="regular" />
                  ) : (
                    <PushPin size={16} weight="regular" />
                  )}
                </button>
                <button
                  onClick={() => handleDeleteNote(selectedNote.id)}
                  aria-label="Supprimer la note"
                  className="rounded-md p-1.5 text-ink-muted hover:bg-surface hover:text-danger"
                >
                  <Trash size={16} weight="regular" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NoteEditor
                key={selectedNote.id}
                content={selectedNote.content}
                onChange={(html) => patchNote(selectedNote.id, { content: html })}
              />
            </div>
            <div className="border-t border-line px-6 py-2 text-xs text-ink-muted">
              Modifié {formatNoteDate(selectedNote.updatedAt)}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-ink-muted">
            Sélectionnez une note ou créez-en une nouvelle.
          </div>
        )}
      </div>
    </div>
  );
}
