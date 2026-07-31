"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import {
  TextB,
  TextItalic,
  TextUnderline,
  TextStrikethrough,
  ListBullets,
  ListNumbers,
  CheckSquare,
  Quotes,
  TextAa,
  PaintBucket,
  Highlighter,
  CaretDown,
  Prohibit,
  LinkSimple,
  Image as ImageIcon,
  WarningCircle,
} from "@phosphor-icons/react";
import { uploadNoteImage } from "@/lib/actions/notes";

// Couleurs de texte et de surlignage proposées dans les notes.
//
// Volontairement des tons moyens : les notes s'affichent dans les deux
// thèmes, et le fond passe de #f7f6f3 à #0b0b0d selon celui-ci. Un texte
// quasi noir deviendrait illisible en sombre, un jaune très clair en clair.
// Chaque valeur ci-dessous a été choisie pour rester lisible sur les deux
// fonds — c'est la raison pour laquelle ce n'est pas un sélecteur libre.
const TEXT_COLORS = [
  { value: "#ef4444", label: "Rouge" },
  { value: "#f97316", label: "Orange" },
  { value: "#eab308", label: "Jaune" },
  { value: "#22c55e", label: "Vert" },
  { value: "#14b8a6", label: "Sarcelle" },
  { value: "#3b82f6", label: "Bleu" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#ec4899", label: "Rose" },
];

// Surlignage : les mêmes teintes très diluées, pour que le texte par-dessus
// reste lisible quelle que soit sa couleur et quel que soit le thème.
const HIGHLIGHT_COLORS = [
  { value: "#fde04766", label: "Jaune" },
  { value: "#86efac66", label: "Vert" },
  { value: "#93c5fd66", label: "Bleu" },
  { value: "#f9a8d466", label: "Rose" },
  { value: "#fdba7466", label: "Orange" },
  { value: "#c4b5fd66", label: "Violet" },
];

const TEXT_SIZES = [
  { label: "Grand titre", level: 1 as const },
  { label: "Titre", level: 2 as const },
  { label: "Sous-titre", level: 3 as const },
];

function ToolbarButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`rounded-md p-1.5 transition-colors ${
        active ? "bg-accent text-accent-ink" : "text-ink-muted hover:bg-surface hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

// Déroulant partagé par les trois nouveaux contrôles (taille, couleur,
// surlignage). Composant client avec fermeture au clic extérieur, comme
// `ColorSelect` et `SettingsMenu` — un `<details>` seul resterait ouvert.
function ToolbarMenu({
  label,
  icon,
  active,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative"
      onKeyDown={(event) => event.key === "Escape" && setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-0.5 rounded-md p-1.5 transition-colors ${
          active ? "bg-accent text-accent-ink" : "text-ink-muted hover:bg-surface hover:text-ink"
        }`}
      >
        {icon}
        <CaretDown size={10} weight="bold" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 z-20 mt-1 rounded-xl border border-line bg-surface-elevated p-1.5 shadow-lg"
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

function LinkForm({
  editor,
  close,
  initialUrl,
}: {
  editor: Editor;
  close: () => void;
  initialUrl: string;
}) {
  const [url, setUrl] = useState(initialUrl);

  function apply() {
    const trimmed = url.trim();
    if (!trimmed) {
      editor.chain().focus().unsetLink().run();
    } else {
      // `setLink` passe par la validation de l'extension, qui rejette
      // `javascript:` et `data:` — inutile de refiltrer ici.
      editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
    }
    close();
  }

  return (
    <div className="flex w-64 flex-col gap-2 p-1">
      <input
        autoFocus
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            apply();
          }
        }}
        placeholder="exemple.fr ou https://…"
        aria-label="Adresse du lien"
        className="w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={apply}
          className="rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-ink transition-transform active:scale-[0.98]"
        >
          Appliquer
        </button>
        {editor.isActive("link") && (
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().unsetLink().run();
              close();
            }}
            className="flex items-center gap-1 text-xs text-ink-muted transition-colors hover:text-ink"
          >
            <Prohibit size={13} weight="bold" />
            Retirer
          </button>
        )}
      </div>
    </div>
  );
}

// Insertion d'image (ajoutée le 2026-07-31) : `<input type="file">` caché
// plutôt qu'un menu — un seul geste (choisir un fichier) suffit, pas besoin
// d'un second clic pour confirmer. Upload puis insertion à la position du
// curseur au moment du clic (le focus de l'éditeur est repris explicitement
// après l'upload, le temps d'attente ayant pu le faire perdre).
function ImageButton({ editor }: { editor: Editor }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setPending(true);
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadNoteImage(formData);
    setPending(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    editor.chain().focus().setImage({ src: result.url }).run();
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) handleFile(file);
        }}
      />
      <ToolbarButton label="Insérer une image" onClick={() => inputRef.current?.click()}>
        {pending ? (
          <span className="block h-4 w-4 animate-pulse rounded-full bg-ink-muted/40" />
        ) : (
          <ImageIcon size={16} weight="bold" />
        )}
      </ToolbarButton>
      {error && (
        <span className="flex items-center gap-1 text-xs text-danger" role="alert">
          <WarningCircle size={13} weight="fill" />
          {error}
        </span>
      )}
    </>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const activeColor = editor.getAttributes("textStyle").color as string | undefined;
  const activeHighlight = editor.getAttributes("highlight").color as string | undefined;
  const activeHeading = TEXT_SIZES.find((size) =>
    editor.isActive("heading", { level: size.level }),
  );

  return (
    // `sticky` et non statique : la barre vit à l'intérieur du conteneur
    // scrollable de l'éditeur (voir NotesApp), donc sans ça elle défilait
    // hors de vue dès qu'une note dépassait la hauteur visible — les
    // styles devenaient inatteignables au milieu d'une note longue. Fond
    // opaque obligatoire, sinon le texte défile visiblement dessous.
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-line bg-surface-elevated px-2 py-1.5">
      <ToolbarMenu
        label="Taille du texte"
        active={Boolean(activeHeading)}
        icon={<TextAa size={16} weight="bold" />}
      >
        {(close) => (
          <div className="flex w-44 flex-col">
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().setParagraph().run();
                close();
              }}
              className={`rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-surface ${
                activeHeading ? "text-ink-muted" : "font-medium text-ink"
              }`}
            >
              Normal
            </button>
            {TEXT_SIZES.map((size) => (
              <button
                key={size.level}
                type="button"
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: size.level }).run();
                  close();
                }}
                className={`rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-surface ${
                  activeHeading?.level === size.level ? "font-medium text-ink" : "text-ink-muted"
                } ${size.level === 1 ? "text-lg" : size.level === 2 ? "text-base" : "text-sm"}`}
              >
                {size.label}
              </button>
            ))}
          </div>
        )}
      </ToolbarMenu>

      <div className="mx-1 h-4 w-px bg-line" />

      <ToolbarButton
        label="Gras"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <TextB size={16} weight="bold" />
      </ToolbarButton>
      <ToolbarButton
        label="Italique"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <TextItalic size={16} weight="bold" />
      </ToolbarButton>
      <ToolbarButton
        label="Souligné"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <TextUnderline size={16} weight="bold" />
      </ToolbarButton>
      <ToolbarButton
        label="Barré"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <TextStrikethrough size={16} weight="bold" />
      </ToolbarButton>

      <div className="mx-1 h-4 w-px bg-line" />

      <ToolbarMenu
        label="Couleur du texte"
        active={Boolean(activeColor)}
        icon={<PaintBucket size={16} weight="bold" />}
      >
        {(close) => (
          <div className="w-40">
            <div className="grid grid-cols-4 gap-1">
              {TEXT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  title={color.label}
                  aria-label={color.label}
                  onClick={() => {
                    editor.chain().focus().setColor(color.value).run();
                    close();
                  }}
                  className="flex h-8 items-center justify-center rounded-md transition-colors hover:bg-surface"
                >
                  <span
                    className={`h-5 w-5 rounded-full ${
                      activeColor === color.value ? "ring-2 ring-ink ring-offset-2 ring-offset-surface-elevated" : ""
                    }`}
                    style={{ backgroundColor: color.value }}
                  />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().unsetColor().run();
                close();
              }}
              className="mt-1 flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-ink-muted transition-colors hover:bg-surface hover:text-ink"
            >
              <Prohibit size={13} weight="bold" />
              Couleur par défaut
            </button>
          </div>
        )}
      </ToolbarMenu>

      <ToolbarMenu
        label="Surlignage"
        active={Boolean(activeHighlight)}
        icon={<Highlighter size={16} weight="bold" />}
      >
        {(close) => (
          <div className="w-40">
            <div className="grid grid-cols-3 gap-1">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  title={color.label}
                  aria-label={color.label}
                  onClick={() => {
                    editor.chain().focus().setHighlight({ color: color.value }).run();
                    close();
                  }}
                  className="flex h-8 items-center justify-center rounded-md transition-colors hover:bg-surface"
                >
                  <span
                    className={`h-5 w-8 rounded border border-line ${
                      activeHighlight === color.value ? "ring-2 ring-ink ring-offset-2 ring-offset-surface-elevated" : ""
                    }`}
                    style={{ backgroundColor: color.value }}
                  />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().unsetHighlight().run();
                close();
              }}
              className="mt-1 flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-ink-muted transition-colors hover:bg-surface hover:text-ink"
            >
              <Prohibit size={13} weight="bold" />
              Retirer le surlignage
            </button>
          </div>
        )}
      </ToolbarMenu>

      {/* Poser un lien sur un texte déjà écrit : `autolink` ne couvre que
          les adresses tapées telles quelles, pas le cas "faire de ces trois
          mots un lien". */}
      <ToolbarMenu
        label="Lien"
        active={editor.isActive("link")}
        icon={<LinkSimple size={16} weight="bold" />}
      >
        {(close) => (
          <LinkForm
            editor={editor}
            close={close}
            initialUrl={(editor.getAttributes("link").href as string | undefined) ?? ""}
          />
        )}
      </ToolbarMenu>

      <div className="mx-1 h-4 w-px bg-line" />

      <ToolbarButton
        label="Liste à puces"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <ListBullets size={16} weight="bold" />
      </ToolbarButton>
      <ToolbarButton
        label="Liste numérotée"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListNumbers size={16} weight="bold" />
      </ToolbarButton>
      <ToolbarButton
        label="Checklist"
        active={editor.isActive("taskList")}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      >
        <CheckSquare size={16} weight="bold" />
      </ToolbarButton>
      <ToolbarButton
        label="Citation"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quotes size={16} weight="bold" />
      </ToolbarButton>

      <div className="mx-1 h-4 w-px bg-line" />

      <ImageButton editor={editor} />
    </div>
  );
}

export function NoteEditor({
  content,
  onChange,
}: {
  content: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      // `link` est déjà fourni par StarterKit, avec `autolink` actif : une
      // adresse tapée devient un lien toute seule. Deux réglages sont
      // repris ici — `defaultProtocol` par défaut vaut "http", donc un
      // "exemple.fr" tapé sans schéma partait en clair ; et la classe
      // permet de styler les liens, qui sinon ressortent identiques au
      // texte courant (le reset CSS de Tailwind neutralise la couleur et
      // le soulignement par défaut du navigateur).
      //
      // Les protocoles dangereux n'ont pas besoin d'être filtrés ici :
      // `isAllowedUri` de l'extension rejette déjà `javascript:` et
      // `data:` (vérifié), tout en laissant passer http, https et mailto.
      StarterKit.configure({
        link: {
          defaultProtocol: "https",
          HTMLAttributes: {
            class: "note-link",
            target: "_blank",
            rel: "noopener noreferrer nofollow",
          },
        },
      }),
      // `TextStyle` est la brique de base dont dépend `Color` : sans lui, la
      // couleur n'a pas de marque `<span>` où s'accrocher.
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TaskList.configure({ HTMLAttributes: { class: "note-task-list" } }),
      TaskItem.configure({ nested: true, HTMLAttributes: { class: "note-task-item" } }),
      Image.configure({ HTMLAttributes: { class: "note-image" } }),
      Placeholder.configure({ placeholder: "Écrivez quelque chose…" }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "note-prose min-h-[50vh] flex-1 px-6 py-4 focus:outline-none",
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="flex flex-1 flex-col">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="flex flex-1 flex-col" />
    </div>
  );
}
