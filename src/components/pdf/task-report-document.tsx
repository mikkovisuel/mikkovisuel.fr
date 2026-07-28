import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { registerPdfFonts, PDF_COLORS as COLORS, PDF_STATUS_COLORS as STATUS_COLORS } from "@/components/pdf/pdf-theme";

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
