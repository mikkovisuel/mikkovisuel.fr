"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import {
  TextB,
  TextItalic,
  TextUnderline,
  TextStrikethrough,
  TextH,
  ListBullets,
  ListNumbers,
  CheckSquare,
  Quotes,
} from "@phosphor-icons/react";

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
      aria-pressed={active}
      className={`rounded-md p-1.5 transition-colors ${
        active
          ? "bg-accent text-accent-ink"
          : "text-ink-muted hover:bg-surface hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-line px-2 py-1.5">
      <ToolbarButton
        label="Titre"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <TextH size={16} weight="bold" />
      </ToolbarButton>
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
      StarterKit,
      TaskList.configure({ HTMLAttributes: { class: "note-task-list" } }),
      TaskItem.configure({ nested: true, HTMLAttributes: { class: "note-task-item" } }),
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
