import { createElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { generateJSON } from "@tiptap/html/server";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import TiptapImage from "@tiptap/extension-image";
import { getAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage";
import { NotePdfDocument } from "@/components/pdf/note-pdf-document";

// Mêmes extensions que NoteEditor (src/components/admin/note-editor.tsx) —
// `generateJSON` doit reconnaître exactement les mêmes nœuds/marques que
// ceux que l'éditeur a pu produire, sinon un contenu (une image, une
// checklist) ressortirait silencieusement vide du PDF plutôt qu'en erreur.
const NOTE_EXTENSIONS = [
  StarterKit.configure({
    link: {
      defaultProtocol: "https",
      HTMLAttributes: { class: "note-link", target: "_blank", rel: "noopener noreferrer nofollow" },
    },
  }),
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  TaskList.configure({ HTMLAttributes: { class: "note-task-list" } }),
  TaskItem.configure({ nested: true, HTMLAttributes: { class: "note-task-item" } }),
  TiptapImage.configure({ HTMLAttributes: { class: "note-image" } }),
];

interface PMNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PMNode[];
}

function collectImageSrcs(node: PMNode, out: Set<string>) {
  if (node.type === "image" && typeof node.attrs?.src === "string") {
    out.add(node.attrs.src);
  }
  for (const child of node.content ?? []) collectImageSrcs(child, out);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminSession();
  if (!admin) return new NextResponse(null, { status: 403 });

  const { id } = await params;
  const note = await db.note.findUnique({ where: { id } });
  if (!note) return new NextResponse(null, { status: 404 });

  const json = generateJSON(note.content, NOTE_EXTENSIONS) as PMNode;

  // Résout chaque image insérée en data URI avant le rendu : react-pdf ne
  // peut pas suivre `/api/fichiers/notes-images/[id]`, cette route exige la
  // session admin que le moteur de rendu PDF n'a pas.
  const srcs = new Set<string>();
  collectImageSrcs(json, srcs);
  const storage = getStorageAdapter();
  const images = new Map<string, string>();
  for (const src of srcs) {
    const imageId = src.split("/").pop();
    if (!imageId) continue;
    const image = await db.noteImage.findUnique({ where: { id: imageId } });
    if (!image) continue;
    const buffer = await storage.read(image.storageKey);
    images.set(src, `data:${image.mimeType};base64,${buffer.toString("base64")}`);
  }

  const documentElement = createElement(NotePdfDocument, {
    title: note.title,
    content: json,
    updatedAt: note.updatedAt,
    images,
  }) as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(documentElement);

  const safeName = (note.title.trim() || "note").replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
    },
  });
}
