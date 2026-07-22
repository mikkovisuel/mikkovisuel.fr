import path from "node:path";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

// Même Clash Display auto-hébergée que le site (voir src/app/fonts), mais en
// .ttf plutôt que le .woff2 utilisé côté web : fontkit (utilisé par
// react-pdf) décompresse mal certaines tables de ce woff2 particulier — les
// mots affichaient des espaces parasites ("af che" au lieu de "affiche").
// Les .ttf sont une simple décompression du même fichier (`fonttools
// ttLib.woff2 decompress`), pas une police différente. Seuls les titres
// utilisent Clash Display, le corps de texte reste sur Helvetica (intégrée à
// react-pdf) pour ne pas dépendre d'un second fichier de police à charger
// (Manrope vient de next/font/google côté web, pas d'un fichier statique
// simple à référencer ici).
Font.register({
  family: "ClashDisplay",
  fonts: [
    { src: path.join(process.cwd(), "src/app/fonts/ClashDisplay-Regular.ttf"), fontWeight: 400 },
    { src: path.join(process.cwd(), "src/app/fonts/ClashDisplay-Bold.ttf"), fontWeight: 700 },
  ],
});

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

// Reprend les tokens de `globals.css` (thème sombre) — la DA du site, mais
// en valeurs fixes : un PDF n'a pas de media query ni de bascule clair/
// sombre, il fige un des deux rendus.
const COLORS = {
  surface: "#0b0b0d",
  surfaceElevated: "#17171b",
  ink: "#f5f4f2",
  inkMuted: "#a1a1aa",
  line: "#2a2a2f",
  accent: "#dded2e",
  accentInk: "#14141a",
};

// Mêmes teintes que `PALETTE_BADGE_CLASSES` (src/lib/dropdown-lists.ts),
// réécrites en couleurs fixes adaptées à un fond sombre — react-pdf n'a pas
// accès aux classes Tailwind ni aux variables CSS du site.
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  slate: { bg: "rgba(148,163,184,0.18)", text: "#cbd5e1" },
  blue: { bg: "rgba(59,130,246,0.2)", text: "#93c5fd" },
  emerald: { bg: "rgba(16,185,129,0.2)", text: "#6ee7b7" },
  amber: { bg: "rgba(245,158,11,0.2)", text: "#fcd34d" },
  rose: { bg: "rgba(244,63,94,0.2)", text: "#fda4af" },
  violet: { bg: "rgba(139,92,246,0.2)", text: "#c4b5fd" },
  orange: { bg: "rgba(249,115,22,0.2)", text: "#fdba74" },
  cyan: { bg: "rgba(6,182,212,0.2)", text: "#67e8f9" },
};

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
  subtitle: { fontSize: 10, color: COLORS.inkMuted, marginTop: 4 },
  meta: { fontSize: 9, color: COLORS.inkMuted, marginTop: 2 },
  taskCard: {
    marginTop: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceElevated,
  },
  taskHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  taskTitle: { fontFamily: "ClashDisplay", fontWeight: 700, fontSize: 13, color: COLORS.ink },
  statusBadge: {
    fontSize: 8,
    fontWeight: 700,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  taskDescription: { marginTop: 6, color: COLORS.inkMuted, lineHeight: 1.4 },
  taskDatesRow: { flexDirection: "row", marginTop: 10, gap: 16 },
  taskDateLabel: { color: COLORS.inkMuted, fontSize: 8 },
  taskDateValue: { fontSize: 9, fontWeight: 700, color: COLORS.ink, marginTop: 1 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 10, gap: 4 },
  tag: {
    fontSize: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: "rgba(245,244,242,0.08)",
    color: COLORS.inkMuted,
  },
  emptyState: { marginTop: 24, color: COLORS.inkMuted },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    fontSize: 8,
    color: COLORS.inkMuted,
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingTop: 8,
  },
});

interface ReportTask {
  id: string;
  title: string;
  description: string | null;
  eventDate: Date | null;
  dueDate: Date | null;
  status: { label: string; color: string };
  types: { label: string }[];
  formats: { label: string }[];
}

export function TaskReportDocument({
  clientName,
  tasks,
  generatedAt,
}: {
  clientName: string;
  tasks: ReportTask[];
  generatedAt: Date;
}) {
  return (
    <Document title={`Rapport — ${clientName}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBlock}>
          <Text style={styles.brand}>MIKKO VISUEL</Text>
          <Text style={styles.title}>Rapport d&apos;état — {clientName}</Text>
          <Text style={styles.subtitle}>
            {tasks.length} tâche{tasks.length > 1 ? "s" : ""} en cours (hors tâches terminées)
          </Text>
          <Text style={styles.meta}>Généré le {DATE_FORMATTER.format(generatedAt)}</Text>
        </View>

        {tasks.length === 0 ? (
          <Text style={styles.emptyState}>Aucune tâche en cours pour le moment.</Text>
        ) : (
          tasks.map((task) => {
            const statusColors = STATUS_COLORS[task.status.color] ?? STATUS_COLORS.slate;
            return (
              <View key={task.id} style={styles.taskCard} wrap={false}>
                <View style={styles.taskHeaderRow}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusColors.bg, color: statusColors.text },
                    ]}
                  >
                    {task.status.label}
                  </Text>
                </View>

                {task.description && <Text style={styles.taskDescription}>{task.description}</Text>}

                <View style={styles.taskDatesRow}>
                  <View>
                    <Text style={styles.taskDateLabel}>Évènement</Text>
                    <Text style={styles.taskDateValue}>
                      {task.eventDate ? DATE_FORMATTER.format(task.eventDate) : "—"}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.taskDateLabel}>Échéance</Text>
                    <Text style={styles.taskDateValue}>
                      {task.dueDate ? DATE_FORMATTER.format(task.dueDate) : "—"}
                    </Text>
                  </View>
                </View>

                {(task.types.length > 0 || task.formats.length > 0) && (
                  <View style={styles.tagsRow}>
                    {task.types.map((type) => (
                      <Text key={type.label} style={styles.tag}>
                        {type.label}
                      </Text>
                    ))}
                    {task.formats.map((format) => (
                      <Text key={format.label} style={styles.tag}>
                        {format.label}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}

        <Text style={styles.footer} fixed>
          Mikko Visuel — mikkovisuel.fr
        </Text>
      </Page>
    </Document>
  );
}
