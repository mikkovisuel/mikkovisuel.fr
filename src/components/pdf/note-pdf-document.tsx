import { Document, Page, Text, View, Image, Link, StyleSheet, type Styles } from "@react-pdf/renderer";

// `Style` n'est pas ré-exporté par le paquet (seul `Styles`, la table
// nom -> style, l'est) — on récupère le type d'une entrée via indexation.
type Style = Styles[string];
import { registerPdfFonts, PDF_COLORS as COLORS } from "@/components/pdf/pdf-theme";

registerPdfFonts();

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const styles = StyleSheet.create({
  page: {
    paddingVertical: 40,
    paddingHorizontal: 44,
    fontSize: 10,
    color: COLORS.ink,
    backgroundColor: COLORS.surface,
  },
  headerBlock: { borderBottomWidth: 2, borderBottomColor: COLORS.accent, paddingBottom: 14 },
  brand: {
    fontFamily: "ClashDisplay",
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: 1.5,
    color: COLORS.accent,
  },
  title: { fontFamily: "ClashDisplay", fontWeight: 700, fontSize: 20, marginTop: 14 },
  meta: { fontSize: 9, color: COLORS.inkMuted, marginTop: 4 },
  h1: { fontFamily: "ClashDisplay", fontWeight: 700, fontSize: 17, marginTop: 14, marginBottom: 6 },
  h2: { fontFamily: "ClashDisplay", fontWeight: 700, fontSize: 14, marginTop: 12, marginBottom: 5 },
  h3: { fontFamily: "ClashDisplay", fontWeight: 700, fontSize: 12, marginTop: 10, marginBottom: 4 },
  paragraph: { marginBottom: 6, lineHeight: 1.5 },
  listItemRow: { flexDirection: "row", marginBottom: 3 },
  bullet: { width: 12, color: COLORS.inkMuted },
  listItemContent: { flex: 1 },
  taskRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 3, gap: 6 },
  checkbox: {
    width: 9,
    height: 9,
    borderWidth: 1,
    borderColor: COLORS.inkMuted,
    borderRadius: 2,
    marginTop: 2,
  },
  checkboxChecked: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  taskDone: { color: COLORS.inkMuted, textDecoration: "line-through" },
  blockquote: {
    borderLeftWidth: 2,
    borderLeftColor: COLORS.accent,
    paddingLeft: 10,
    marginVertical: 6,
    color: COLORS.inkMuted,
  },
  image: { maxWidth: 320, marginVertical: 8, borderRadius: 4 },
  link: { color: COLORS.ink, textDecoration: "underline" },
});

// Marque de texte ProseMirror -> style react-pdf. `highlight`/`textStyle`
// portent une couleur arbitraire choisie dans l'éditeur (voir NoteEditor) —
// react-pdf n'a pas de concept de thème clair/sombre, donc contrairement à
// l'éditeur (qui adapte l'opacité au thème), le PDF fige simplement la
// couleur choisie telle quelle sur fond sombre.
function textStyleForMarks(marks: { type: string; attrs?: Record<string, unknown> }[] = []): Style {
  const style: Style = {};
  for (const mark of marks) {
    if (mark.type === "bold") style.fontWeight = 700;
    if (mark.type === "italic") style.fontStyle = "italic";
    if (mark.type === "underline") style.textDecoration = "underline";
    if (mark.type === "strike") style.textDecoration = "line-through";
    if (mark.type === "textStyle" && typeof mark.attrs?.color === "string") {
      style.color = mark.attrs.color;
    }
    if (mark.type === "highlight" && typeof mark.attrs?.color === "string") {
      style.backgroundColor = mark.attrs.color;
    }
  }
  return style;
}

interface PMNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PMNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
}

// Convertit l'arbre ProseMirror (produit par `generateJSON`, voir la route
// d'export) en éléments react-pdf. Ne couvre que les nœuds que l'éditeur de
// notes peut réellement produire (voir les extensions de NoteEditor) — pas
// un convertisseur HTML générique, volontairement, puisque le contenu vient
// toujours du même éditeur interne.
function renderInline(nodes: PMNode[] = [], keyPrefix: string): React.ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;
    if (node.type === "text") {
      const linkMark = node.marks?.find((m) => m.type === "link");
      const style = textStyleForMarks(node.marks);
      if (linkMark && typeof linkMark.attrs?.href === "string") {
        // `Link` (et non `Text` simplement stylé) : produit une vraie
        // annotation PDF cliquable, pas seulement du texte souligné qui
        // ressemble à un lien.
        return (
          <Link key={key} src={linkMark.attrs.href} style={[styles.link, style]}>
            {node.text}
          </Link>
        );
      }
      return (
        <Text key={key} style={style}>
          {node.text}
        </Text>
      );
    }
    if (node.type === "hardBreak") return "\n";
    return null;
  });
}

function renderBlocks(nodes: PMNode[] = [], keyPrefix: string, images: Map<string, string>): React.ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;
    switch (node.type) {
      case "heading": {
        const level = (node.attrs?.level as number) ?? 1;
        const style = level === 1 ? styles.h1 : level === 2 ? styles.h2 : styles.h3;
        return (
          <Text key={key} style={style}>
            {renderInline(node.content, key)}
          </Text>
        );
      }
      case "paragraph":
        return (
          <Text key={key} style={styles.paragraph}>
            {node.content ? renderInline(node.content, key) : " "}
          </Text>
        );
      case "bulletList":
      case "orderedList":
        return (
          <View key={key}>
            {(node.content ?? []).map((item, itemIndex) => (
              <View key={`${key}-${itemIndex}`} style={styles.listItemRow}>
                <Text style={styles.bullet}>
                  {node.type === "orderedList" ? `${itemIndex + 1}.` : "•"}
                </Text>
                <View style={styles.listItemContent}>
                  {renderBlocks(item.content, `${key}-${itemIndex}`, images)}
                </View>
              </View>
            ))}
          </View>
        );
      case "taskList":
        return (
          <View key={key}>
            {(node.content ?? []).map((item, itemIndex) => {
              const checked = Boolean(item.attrs?.checked);
              return (
                <View key={`${key}-${itemIndex}`} style={styles.taskRow}>
                  <View style={checked ? { ...styles.checkbox, ...styles.checkboxChecked } : styles.checkbox} />
                  <View style={styles.listItemContent}>
                    {(item.content ?? []).map((child, childIndex) => (
                      <Text
                        key={`${key}-${itemIndex}-${childIndex}`}
                        style={checked ? { ...styles.paragraph, ...styles.taskDone } : styles.paragraph}
                      >
                        {renderInline(child.content, `${key}-${itemIndex}-${childIndex}`)}
                      </Text>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        );
      case "blockquote":
        return (
          <View key={key} style={styles.blockquote}>
            {renderBlocks(node.content, key, images)}
          </View>
        );
      case "image": {
        const src = typeof node.attrs?.src === "string" ? node.attrs.src : null;
        const dataUri = src ? images.get(src) : undefined;
        if (!dataUri) return null;
        // Faux positif : c'est le `<Image>` de react-pdf (rendu PDF), pas
        // l'élément HTML — la règle d'accessibilité ne s'applique pas ici,
        // et react-pdf n'expose de toute façon aucune prop `alt`.
        // eslint-disable-next-line jsx-a11y/alt-text
        return <Image key={key} src={dataUri} style={styles.image} />;
      }
      default:
        return null;
    }
  });
}

export function NotePdfDocument({
  title,
  content,
  updatedAt,
  images,
}: {
  title: string;
  content: PMNode;
  updatedAt: Date;
  /** Clé = `src` tel qu'il apparaît dans le contenu (ex.
   * "/api/fichiers/notes-images/abc"), valeur = data URI déjà encodée —
   * les images doivent être résolues avant le rendu, react-pdf ne peut pas
   * les récupérer lui-même derrière une session admin. */
  images: Map<string, string>;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBlock}>
          <Text style={styles.brand}>MIKKO VISUEL</Text>
          <Text style={styles.title}>{title.trim() || "Sans titre"}</Text>
          <Text style={styles.meta}>Modifiée le {DATE_FORMATTER.format(updatedAt)}</Text>
        </View>
        <View style={{ marginTop: 18 }}>{renderBlocks(content.content, "n", images)}</View>
      </Page>
    </Document>
  );
}
