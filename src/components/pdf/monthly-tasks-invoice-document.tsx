import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
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
  subtitle: { fontSize: 10, color: COLORS.inkMuted, marginTop: 4 },
  meta: { fontSize: 9, color: COLORS.inkMuted, marginTop: 2 },
  list: { marginTop: 16 },
  row: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceElevated,
  },
  taskTitle: { fontFamily: "ClashDisplay", fontWeight: 700, fontSize: 12, color: COLORS.ink },
  taskDate: { fontSize: 10, color: COLORS.inkMuted },
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

interface InvoiceTask {
  id: string;
  title: string;
  eventDate: Date;
}

// Récapitulatif mensuel des tâches terminées pour un client, pensé comme
// pièce jointe à une facture (2026-09-02, "je souhaite pouvoir éditer un
// pdf en faisant une liste des tâches que j'ai réalisé par mois pour un
// client") — pas de montant ni de statut, ce n'est pas la facture
// elle-même : voir src/app/api/exports/facturation/route.ts pour la
// sélection des tâches (statut "Terminé", groupées par date d'évènement).
export function MonthlyTasksInvoiceDocument({
  clientName,
  monthLabel,
  tasks,
  generatedAt,
}: {
  clientName: string;
  monthLabel: string;
  tasks: InvoiceTask[];
  generatedAt: Date;
}) {
  return (
    <Document title={`Récapitulatif ${monthLabel} — ${clientName}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBlock}>
          <Text style={styles.brand}>MIKKO VISUEL</Text>
          <Text style={styles.title}>Récapitulatif des prestations — {clientName}</Text>
          <Text style={styles.subtitle}>
            {monthLabel} — {tasks.length} tâche{tasks.length > 1 ? "s" : ""} réalisée
            {tasks.length > 1 ? "s" : ""}
          </Text>
          <Text style={styles.meta}>Généré le {DATE_FORMATTER.format(generatedAt)}</Text>
        </View>

        {tasks.length === 0 ? (
          <Text style={styles.emptyState}>Aucune tâche terminée pour ce client sur cette période.</Text>
        ) : (
          <View style={styles.list}>
            {tasks.map((task) => (
              <View key={task.id} style={styles.row} wrap={false}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.taskDate}>{DATE_FORMATTER.format(task.eventDate)}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer} fixed>
          Mikko Visuel — mikkovisuel.fr
        </Text>
      </Page>
    </Document>
  );
}
