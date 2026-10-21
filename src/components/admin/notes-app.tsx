"use client";

import { useMemo, useRef, useState, useSyncExternalStore, type DragEvent, type ReactNode } from "react";
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
  CaretDown,
  CaretRight,
  Tray,
  Bell,
  FilePdf,
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
  // Rattachement optionnel à un prospect (2026-07-31) — mutuellement
  // exclusif avec `clientId` : voir `assignmentValue`/`handleAssignmentChange`.
  prospectId: string | null;
  reminderAt: string | null;
  updatedAt: string;
}

export interface ClientOption {
  id: string;
  name: string;
}

export interface ProspectOption {
  id: string;
  name: string;
}

// Comparaison par date calendaire locale (année/mois/jour), pas par
// timestamp brut — un rappel posé pour "aujourd'hui" est stocké en minuit
// UTC (`new Date("2026-07-24")`), qui ne tombe pas au même instant que
// minuit local ; comparer les timestamps directement décale le seuil "dû"
// de quelques heures selon le fuseau. Même convention que `dueDateKey`
// (src/lib/tasks.ts) pour les échéances de tâches.
function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Encode le rattachement client/prospect d'une note dans une seule valeur de
// `<select>` (ajouté le 2026-07-31, "permettre l'affectation des prospects
// également") — les deux champs sont mutuellement exclusifs en base, donc un
// seul menu déroulant a plus de sens que deux menus indépendants qu'il
// faudrait garder synchronisés.
function encodeAssignment(clientId: string | null, prospectId: string | null): string {
  if (clientId) return `client:${clientId}`;
  if (prospectId) return `prospect:${prospectId}`;
  return "";
}

function decodeAssignment(value: string): { clientId: string | null; prospectId: string | null } {
  if (value.startsWith("client:")) return { clientId: value.slice(7), prospectId: null };
  if (value.startsWith("prospect:")) return { clientId: null, prospectId: value.slice(9) };
  return { clientId: null, prospectId: null };
}

function isReminderDue(reminderAt: string) {
  return dateKey(new Date(reminderAt)) <= dateKey(new Date());
}

function formatReminderDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// Arborescence (refonte du 2026-10-21, choix du client sur maquette) : deux
// colonnes au lieu de trois. À gauche, les dossiers se déplient avec un
// petit triangle pour montrer leurs notes (plus de colonne « liste » à part),
// précédés des groupes Épinglées et Rappels et suivis de « Sans dossier ».
// Une note se range en la faisant glisser sur un dossier (ou avec le menu
// du dossier dans l'éditeur). Dossiers ouverts / fermés mémorisés dans le
// navigateur. Sur téléphone : l'arborescence, puis l'éditeur, avec retour.
type MobilePane = "tree" | "editor";

const OPEN_KEY = "notes-open-groups";
const OPEN_EVENT = "notes-open-groups-change";
// Repli en mémoire si le stockage du navigateur est indisponible.
let memoryOpen: string | null = null;

function readOpenGroups() {
  try {
    return localStorage.getItem(OPEN_KEY) ?? memoryOpen;
  } catch {
    return memoryOpen;
  }
}

function writeOpenGroups(ids: string[]) {
  const value = JSON.stringify(ids);
  memoryOpen = value;
  try {
    localStorage.setItem(OPEN_KEY, value);
  } catch {}
  window.dispatchEvent(new Event(OPEN_EVENT));
}

function subscribeOpenGroups(callback: () => void) {
  window.addEventListener(OPEN_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(OPEN_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
const UNFILED = "__sans-dossier";
const PINNED = "__epinglees";
const REMINDERS = "__rappels";

function sortNotes(list: NoteData[]) {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

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
  prospects,
}: {
  initialFolders: NoteFolderData[];
  initialNotes: NoteData[];
  clients: ClientOption[];
  prospects: ProspectOption[];
}) {
  const [folders, setFolders] = useState(initialFolders);
  const [notes, setNotes] = useState(initialNotes);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(initialNotes[0]?.id ?? null);
  const [mobilePane, setMobilePane] = useState<MobilePane>("tree");
  const [search, setSearch] = useState("");
  // Encodé "client:<id>" / "prospect:<id>" / "" (aucun) — voir `decodeAssignment`.
  const [assignmentFilter, setAssignmentFilter] = useState<string>("");
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  // Groupes dépliés, mémorisés dans le navigateur. Par défaut (rien
  // d'enregistré) : tous les dossiers et « Sans dossier ».
  const savedOpen = useSyncExternalStore(subscribeOpenGroups, readOpenGroups, () => null);
  const open = useMemo(() => {
    try {
      if (savedOpen) return new Set(JSON.parse(savedOpen) as string[]);
    } catch {}
    return new Set([...folders.map((f) => f.id), UNFILED]);
  }, [savedOpen, folders]);

  function setOpen(update: (prev: Set<string>) => Set<string>) {
    writeOpenGroups([...update(open)]);
  }

  function toggleGroup(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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

  // Notes après recherche et filtre client / prospect.
  const filteredNotes = useMemo(() => {
    let result = notes;
    if (assignmentFilter) {
      const { clientId, prospectId } = decodeAssignment(assignmentFilter);
      result = result.filter(
        (note) =>
          (clientId && note.clientId === clientId) || (prospectId && note.prospectId === prospectId),
      );
    }
    const query = search.trim().toLowerCase();
    if (query) {
      result = result.filter((note) => `${note.title} ${snippet(note.content)}`.toLowerCase().includes(query));
    }
    return result;
  }, [notes, assignmentFilter, search]);

  const filtering = Boolean(search.trim() || assignmentFilter);

  const dueReminderCount = useMemo(
    () => notes.filter((note) => note.reminderAt !== null && isReminderDue(note.reminderAt)).length,
    [notes],
  );

  const selectedNote = notes.find((note) => note.id === selectedNoteId) ?? null;

  async function handleCreateNote(folderId: string | null) {
    const { clientId, prospectId } = decodeAssignment(assignmentFilter);
    const note = await createNote({ folderId, clientId, prospectId });
    const created: NoteData = {
      id: note.id,
      title: note.title,
      content: note.content,
      pinned: note.pinned,
      folderId: note.folderId,
      clientId: note.clientId,
      prospectId: note.prospectId,
      reminderAt: note.reminderAt ? note.reminderAt.toISOString() : null,
      updatedAt: note.updatedAt.toString(),
    };
    setNotes((prev) => [created, ...prev]);
    setOpen((prev) => new Set([...prev, folderId ?? UNFILED]));
    setSelectedNoteId(created.id);
    setMobilePane("editor");
  }

  async function handleDeleteNote(noteId: string) {
    if (!window.confirm("Supprimer définitivement cette note ?")) return;
    if (saveTimers.current[noteId]) clearTimeout(saveTimers.current[noteId]);
    setNotes((prev) => prev.filter((note) => note.id !== noteId));
    if (selectedNoteId === noteId) {
      setSelectedNoteId(null);
      setMobilePane("tree");
    }
    await deleteNote(noteId);
  }

  function selectNote(noteId: string) {
    setSelectedNoteId(noteId);
    setMobilePane("editor");
  }

  function moveNote(noteId: string, folderId: string | null) {
    const note = notes.find((n) => n.id === noteId);
    if (!note || note.folderId === folderId) return;
    patchNote(noteId, { folderId }, true);
    setOpen((prev) => new Set([...prev, folderId ?? UNFILED]));
  }

  // Dépôt d'une note sur un groupe : `data-drop-folder` = id du dossier, ""
  // pour « Sans dossier ».
  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDropTarget(null);
    const noteId = event.dataTransfer.getData("text/note-id");
    if (noteId) moveNote(noteId, event.currentTarget.dataset.dropFolder || null);
  }

  async function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) {
      setIsAddingFolder(false);
      return;
    }
    const folder = await createFolder(name);
    setFolders((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setOpen((prev) => new Set([...prev, folder.id]));
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
    await deleteFolder(folderId);
  }

  // Ligne d'une note dans l'arborescence (déplaçable vers un dossier).
  function renderNoteRow(note: NoteData, showReminder = false) {
    const selected = selectedNoteId === note.id;
    return (
      <li key={note.id}>
        <button
          type="button"
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData("text/note-id", note.id);
            event.dataTransfer.effectAllowed = "move";
          }}
          onClick={() => selectNote(note.id)}
          title={snippet(note.content)}
          className={`flex h-8 w-full items-center gap-2 rounded-r-full pl-11 pr-3 text-left text-sm transition-colors ${
            selected ? "bg-select font-medium text-ink" : "text-ink-muted hover:bg-ink/[0.06] hover:text-ink"
          }`}
        >
          <span className="min-w-0 flex-1 truncate">{note.title.trim() || "Sans titre"}</span>
          {note.pinned && !showReminder && <PushPin size={11} weight="fill" className="shrink-0 text-ink-muted" />}
          {note.reminderAt && (showReminder || isReminderDue(note.reminderAt)) && (
            <span
              className={`flex shrink-0 items-center gap-1 text-[11px] ${
                isReminderDue(note.reminderAt) ? "font-medium text-danger" : "text-ink-muted"
              }`}
            >
              <Bell size={11} weight="fill" />
              {formatReminderDate(note.reminderAt)}
            </span>
          )}
        </button>
      </li>
    );
  }

  // Groupe dépliable : triangle, icône, nom, nombre de notes. `dropFolder`
  // (dossier ou null pour « Sans dossier ») le rend cible du glisser-déposer.
  function renderGroup({
    id,
    icon,
    label,
    items,
    dropFolder,
    actions,
    badge,
    showReminder,
  }: {
    id: string;
    icon: ReactNode;
    label: ReactNode;
    items: NoteData[];
    dropFolder?: string | null;
    actions?: ReactNode;
    badge?: ReactNode;
    showReminder?: boolean;
  }) {
    const isOpen = filtering || open.has(id);
    const droppable = dropFolder !== undefined;
    if (filtering && items.length === 0) return null;
    return (
      <div
        key={id}
        onDragOver={
          droppable
            ? (event) => {
                event.preventDefault();
                setDropTarget(id);
              }
            : undefined
        }
        onDragLeave={droppable ? () => setDropTarget((current) => (current === id ? null : current)) : undefined}
        data-drop-folder={droppable ? (dropFolder ?? "") : undefined}
        onDrop={droppable ? handleDrop : undefined}
        className={`rounded-r-2xl ${dropTarget === id ? "bg-accent/15 ring-1 ring-inset ring-accent" : ""}`}
      >
        <div className="group flex h-8 items-center rounded-r-full pr-2 text-sm text-ink hover:bg-ink/[0.06]">
          <button
            type="button"
            onClick={() => toggleGroup(id)}
            aria-expanded={isOpen}
            className="flex min-w-0 flex-1 items-center gap-1.5 self-stretch pl-3 text-left"
          >
            {isOpen ? (
              <CaretDown size={12} weight="fill" className="shrink-0 text-ink-muted" />
            ) : (
              <CaretRight size={12} weight="fill" className="shrink-0 text-ink-muted" />
            )}
            <span className="shrink-0 text-ink-muted">{icon}</span>
            <span className="truncate font-medium">{label}</span>
          </button>
          {actions && <span className="hidden shrink-0 items-center gap-1.5 group-hover:flex">{actions}</span>}
          {badge ?? <span className="ml-2 shrink-0 text-xs text-ink-muted">{items.length}</span>}
        </div>
        {isOpen && (
          <ul>
            {items.length === 0 ? (
              <li className="py-1 pl-11 text-xs text-ink-muted/70">Vide — glissez une note ici</li>
            ) : (
              items.map((note) => renderNoteRow(note, showReminder))
            )}
          </ul>
        )}
      </div>
    );
  }

  const pinnedNotes = sortNotes(filteredNotes.filter((note) => note.pinned));
  const reminderNotes = filteredNotes
    .filter((note) => note.reminderAt !== null)
    .sort((a, b) => new Date(a.reminderAt!).getTime() - new Date(b.reminderAt!).getTime());
  const folderIds = new Set(folders.map((f) => f.id));
  const unfiled = sortNotes(filteredNotes.filter((note) => !note.folderId || !folderIds.has(note.folderId)));
  const iconButton = "text-ink-muted transition-colors hover:text-ink";

  return (
    // Pleine page façon Google Docs (2026-10-20) : hauteur = écran moins la
    // barre du haut (64 px), la barre d'outils (57 px) et, sur ordinateur,
    // la marge basse de la feuille (16 px).
    <div className="flex h-[calc(100dvh-121px)] overflow-hidden bg-surface lg:h-[calc(100dvh-137px)] lg:rounded-b-2xl">
      {/* Arborescence */}
      <aside
        className={`w-full shrink-0 flex-col border-r border-line md:flex md:w-72 xl:w-80 ${
          mobilePane === "tree" ? "flex" : "hidden"
        }`}
      >
        <div className="space-y-2 px-3 py-3">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <MagnifyingGlass
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher"
                aria-label="Rechercher dans les notes"
                className="h-9 w-full rounded-full bg-search pl-8 pr-3 text-sm text-ink focus:bg-surface focus:outline-none focus:ring-1 focus:ring-line"
              />
            </div>
            <button
              type="button"
              onClick={() => handleCreateNote(selectedNote?.folderId ?? null)}
              aria-label="Nouvelle note"
              title="Nouvelle note (dans le dossier de la note ouverte)"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink transition-transform active:scale-95"
            >
              <Plus size={16} weight="bold" />
            </button>
          </div>
          {(clients.length > 0 || prospects.length > 0) && (
            <select
              value={assignmentFilter}
              onChange={(e) => setAssignmentFilter(e.target.value)}
              aria-label="Filtrer par client ou prospect"
              className="h-8 w-full rounded-full border border-line bg-surface px-3 text-xs text-ink-muted focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">Tous les clients et prospects</option>
              {clients.length > 0 && (
                <optgroup label="Clients">
                  {clients.map((client) => (
                    <option key={client.id} value={`client:${client.id}`}>
                      {client.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {prospects.length > 0 && (
                <optgroup label="Prospects">
                  {prospects.map((prospect) => (
                    <option key={prospect.id} value={`prospect:${prospect.id}`}>
                      {prospect.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          )}
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto pb-4 pr-2" aria-label="Notes">
          {pinnedNotes.length > 0 && (
            renderGroup({ id: PINNED, icon: <PushPin size={14} weight="fill" />, label: "Épinglées", items: pinnedNotes })
          )}
          {reminderNotes.length > 0 && (
            renderGroup({
              id: REMINDERS,
              icon: <Bell size={14} weight="fill" />,
              label: "Rappels",
              items: reminderNotes,
              showReminder: true,
              badge:
                dueReminderCount > 0 ? (
                  <span className="ml-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-accent-ink">
                    {dueReminderCount}
                  </span>
                ) : undefined,
            })
          )}

          <div className="flex items-center justify-between pb-1 pl-4 pr-1 pt-3">
            <span className="text-xs font-medium text-ink-muted">Dossiers</span>
            <button type="button" onClick={() => setIsAddingFolder(true)} aria-label="Nouveau dossier" className={iconButton}>
              <Plus size={14} weight="bold" />
            </button>
          </div>

          {isAddingFolder && (
            <div className="flex items-center gap-1 pl-4 pr-1">
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
              <button type="button" onClick={handleCreateFolder} aria-label="Créer le dossier" className={iconButton}>
                <Check size={14} />
              </button>
              <button type="button" onClick={() => setIsAddingFolder(false)} aria-label="Annuler" className={iconButton}>
                <X size={14} />
              </button>
            </div>
          )}

          {folders.map((folder) =>
            editingFolderId === folder.id ? (
              <div key={folder.id} className="flex items-center gap-1 pl-4 pr-1">
                <input
                  autoFocus
                  value={editingFolderName}
                  onChange={(e) => setEditingFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameFolder(folder.id);
                    if (e.key === "Escape") setEditingFolderId(null);
                  }}
                  aria-label="Nom du dossier"
                  className="w-full rounded border border-line bg-surface px-1.5 py-1 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <button type="button" onClick={() => handleRenameFolder(folder.id)} aria-label="Renommer" className={iconButton}>
                  <Check size={14} />
                </button>
              </div>
            ) : (
              renderGroup({
                id: folder.id,
                icon: <FolderSimple size={15} />,
                label: folder.name,
                items: sortNotes(filteredNotes.filter((note) => note.folderId === folder.id)),
                dropFolder: folder.id,
                actions: (
                  <>
                    <button
                      type="button"
                      onClick={() => handleCreateNote(folder.id)}
                      aria-label={`Nouvelle note dans ${folder.name}`}
                      title="Nouvelle note ici"
                      className={iconButton}
                    >
                      <NotePencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingFolderId(folder.id);
                        setEditingFolderName(folder.name);
                      }}
                      aria-label="Renommer le dossier"
                      className={iconButton}
                    >
                      <PencilSimple size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteFolder(folder.id)}
                      aria-label="Supprimer le dossier"
                      className="text-ink-muted transition-colors hover:text-danger"
                    >
                      <Trash size={13} />
                    </button>
                  </>
                ),
              })
            ),
          )}

          {renderGroup({ id: UNFILED, icon: <Tray size={15} />, label: "Sans dossier", items: unfiled, dropFolder: null })}

          {filtering && filteredNotes.length === 0 && (
            <p className="px-4 py-6 text-sm text-ink-muted">Aucune note ne correspond.</p>
          )}
        </nav>
      </aside>

      {/* Éditeur */}
      <div
        className={`w-full flex-1 flex-col overflow-hidden md:flex ${
          mobilePane === "editor" ? "flex" : "hidden"
        }`}
      >
        {selectedNote ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 md:px-6">
              <div className="flex items-center gap-3 md:hidden">
                <button
                  onClick={() => setMobilePane("tree")}
                  aria-label="Retour aux notes"
                  className="shrink-0 text-ink-muted hover:text-ink md:hidden"
                >
                  <CaretLeft size={18} />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedNote.folderId ?? ""}
                  onChange={(e) => patchNote(selectedNote.id, { folderId: e.target.value || null }, true)}
                  className="h-8 min-w-0 max-w-[10rem] rounded-full border border-line bg-surface px-3 text-xs text-ink-muted focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="">Sans dossier</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
                {(clients.length > 0 || prospects.length > 0) && (
                  <select
                    value={encodeAssignment(selectedNote.clientId, selectedNote.prospectId)}
                    onChange={(e) => {
                      const { clientId, prospectId } = decodeAssignment(e.target.value);
                      patchNote(selectedNote.id, { clientId, prospectId }, true);
                    }}
                    className="h-8 min-w-0 max-w-[10rem] rounded-full border border-line bg-surface px-3 text-xs text-ink-muted focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="">Aucune affectation</option>
                    {clients.length > 0 && (
                      <optgroup label="Clients">
                        {clients.map((client) => (
                          <option key={client.id} value={`client:${client.id}`}>
                            {client.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {prospects.length > 0 && (
                      <optgroup label="Prospects">
                        {prospects.map((prospect) => (
                          <option key={prospect.id} value={`prospect:${prospect.id}`}>
                            {prospect.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                )}
                <label
                  className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs ${
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
                {/* Export PDF ajouté le 2026-07-31 — la note doit être
                    enregistrée pour que le contenu exporté soit à jour : le
                    lien pointe vers une route de service qui relit la note
                    en base, pas vers l'état encore non sauvegardé de
                    l'éditeur. */}
                <a
                  href={`/api/exports/notes/${selectedNote.id}`}
                  aria-label="Exporter en PDF"
                  title="Exporter en PDF"
                  className="rounded-full p-2 text-ink-muted transition-colors hover:bg-ink/[0.08] hover:text-ink"
                >
                  <FilePdf size={16} weight="regular" />
                </a>
                <button
                  onClick={() => patchNote(selectedNote.id, { pinned: !selectedNote.pinned }, true)}
                  aria-label={selectedNote.pinned ? "Désépingler" : "Épingler"}
                  className="rounded-full p-2 text-ink-muted hover:bg-ink/[0.08] hover:text-ink"
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
                  className="rounded-full p-2 text-ink-muted hover:bg-ink/[0.08] hover:text-danger"
                >
                  <Trash size={16} weight="regular" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {/* Sans cadre, sur toute la largeur du volet (2026-10-20 :
                  « la note ne fait pas la largeur ? ») : le titre en tête,
                  puis le texte. */}
              <div className="w-full px-6 pt-4 sm:px-10">
                <input
                  value={selectedNote.title}
                  onChange={(e) => patchNote(selectedNote.id, { title: e.target.value })}
                  placeholder="Titre"
                  aria-label="Titre de la note"
                  className="w-full bg-transparent text-[28px] font-normal leading-tight text-ink placeholder:text-ink-muted/60 focus:outline-none"
                />
              </div>
              <NoteEditor
                key={selectedNote.id}
                content={selectedNote.content}
                onChange={(html) => patchNote(selectedNote.id, { content: html })}
              />
            </div>
            <div className="px-6 py-1.5 text-center text-xs text-ink-muted">
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
