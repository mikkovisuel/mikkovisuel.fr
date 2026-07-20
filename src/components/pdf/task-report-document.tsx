import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const styles = StyleSheet.create({
  page: { paddingVertical: 40, paddingHorizontal: 44, fontSize: 10, color: "#1a1a1a" },
  brand: { fontSize: 12, fontWeight: 700, letterSpacing: 1 },
  title: { fontSize: 18, fontWeight: 700, marginTop: 16 },
  subtitle: { fontSize: 10, color: "#666666", marginTop: 4 },
  meta: { fontSize: 9, color: "#999999", marginTop: 2 },
  taskCard: {
    marginTop: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#dddddd",
    borderRadius: 6,
  },
  taskHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  taskTitle: { fontSize: 12, fontWeight: 700 },
  statusBadge: {
    fontSize: 8,
    fontWeight: 700,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: "#eeeeee",
    color: "#333333",
  },
  taskDescription: { marginTop: 6, color: "#444444", lineHeight: 1.4 },
  taskDatesRow: { flexDirection: "row", marginTop: 8, gap: 16 },
  taskDateLabel: { color: "#999999", fontSize: 8 },
  taskDateValue: { fontSize: 9, fontWeight: 700 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 8, gap: 4 },
  tag: {
    fontSize: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: "#f2f2f2",
    color: "#555555",
  },
  emptyState: { marginTop: 24, color: "#999999" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    fontSize: 8,
    color: "#aaaaaa",
    textAlign: "center",
  },
});

interface ReportTask {
  id: string;
  title: string;
  description: string | null;
  eventDate: Date | null;
  dueDate: Date | null;
  status: { label: string };
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
        <Text style={styles.brand}>MIKKO VISUEL</Text>
        <Text style={styles.title}>Rapport d&apos;état — {clientName}</Text>
        <Text style={styles.subtitle}>
          {tasks.length} tâche{tasks.length > 1 ? "s" : ""} en cours (hors tâches terminées)
        </Text>
        <Text style={styles.meta}>Généré le {DATE_FORMATTER.format(generatedAt)}</Text>

        {tasks.length === 0 ? (
          <Text style={styles.emptyState}>Aucune tâche en cours pour le moment.</Text>
        ) : (
          tasks.map((task) => (
            <View key={task.id} style={styles.taskCard} wrap={false}>
              <View style={styles.taskHeaderRow}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.statusBadge}>{task.status.label}</Text>
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
          ))
        )}

        <Text style={styles.footer} fixed>
          Mikko Visuel — mikkovisuel.fr
        </Text>
      </Page>
    </Document>
  );
}
