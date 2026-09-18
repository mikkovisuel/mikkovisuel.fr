import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { registerPdfFonts, PDF_COLORS as COLORS } from "@/components/pdf/pdf-theme";

registerPdfFonts();

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Paris",
});

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 44,
    fontSize: 10,
    color: COLORS.ink,
    backgroundColor: COLORS.surface,
  },
  headerBlock: { borderBottomWidth: 2, borderBottomColor: COLORS.accent, paddingBottom: 14 },
  brand: { fontFamily: "ClashDisplay", fontWeight: 700, fontSize: 13, letterSpacing: 1.5, color: COLORS.accent },
  title: { fontFamily: "ClashDisplay", fontWeight: 700, fontSize: 20, marginTop: 14 },
  subtitle: { fontSize: 10, color: COLORS.inkMuted, marginTop: 4 },
  sectionTitle: { fontFamily: "ClashDisplay", fontWeight: 700, fontSize: 13, marginTop: 24 },
  kpiRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  kpi: {
    width: "31%",
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceElevated,
  },
  kpiLabel: { fontSize: 8, color: COLORS.inkMuted },
  kpiValue: { fontFamily: "ClashDisplay", fontWeight: 700, fontSize: 18, marginTop: 4 },
  kpiDelta: { fontSize: 8, marginTop: 2 },
  notes: { marginTop: 12, lineHeight: 1.5, color: COLORS.ink },
  postRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceElevated,
  },
  thumb: { width: 64, height: 80, objectFit: "cover", borderRadius: 4 },
  thumbPlaceholder: { width: 64, height: 80, borderRadius: 4, backgroundColor: COLORS.line },
  postBody: { flex: 1 },
  postTitle: { fontFamily: "ClashDisplay", fontWeight: 700, fontSize: 11 },
  postMeta: { fontSize: 8, color: COLORS.inkMuted, marginTop: 3 },
  postCaption: { fontSize: 9, color: COLORS.inkMuted, marginTop: 6, lineHeight: 1.4 },
  postLink: { fontSize: 8, color: COLORS.accent, marginTop: 4 },
  emptyState: { marginTop: 12, color: COLORS.inkMuted },
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

export interface SocialReportKpi {
  label: string;
  value: string;
  /** Évolution par rapport au mois précédent, déjà formatée ("+120"). */
  delta?: { text: string; positive: boolean } | null;
}

export interface SocialReportPost {
  id: string;
  title: string;
  meta: string;
  caption: string | null;
  publishedUrl: string | null;
  /** JPEG en data URI (react-pdf ne lit pas le WebP). */
  thumbnail: string | null;
}

export function SocialReportDocument({
  clientName,
  monthLabel,
  kpis,
  notes,
  posts,
  generatedAt,
}: {
  clientName: string;
  monthLabel: string;
  kpis: SocialReportKpi[];
  notes: string | null;
  posts: SocialReportPost[];
  generatedAt: Date;
}) {
  return (
    <Document title={`Rapport réseaux — ${clientName} — ${monthLabel}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBlock}>
          <Text style={styles.brand}>MIKKO VISUEL</Text>
          <Text style={styles.title}>Réseaux sociaux — {monthLabel}</Text>
          <Text style={styles.subtitle}>
            {clientName} · généré le {DATE_FORMATTER.format(generatedAt)}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Chiffres du mois</Text>
        <View style={styles.kpiRow}>
          {kpis.map((kpi) => (
            <View key={kpi.label} style={styles.kpi}>
              <Text style={styles.kpiLabel}>{kpi.label}</Text>
              <Text style={styles.kpiValue}>{kpi.value}</Text>
              {kpi.delta && (
                <Text style={[styles.kpiDelta, { color: kpi.delta.positive ? COLORS.accent : "#fca5a5" }]}>
                  {kpi.delta.text} vs mois précédent
                </Text>
              )}
            </View>
          ))}
        </View>
        {notes && <Text style={styles.notes}>{notes}</Text>}

        <Text style={styles.sectionTitle}>
          Publications du mois ({posts.length})
        </Text>
        {posts.length === 0 ? (
          <Text style={styles.emptyState}>Aucune publication marquée publiée sur ce mois.</Text>
        ) : (
          posts.map((post) => (
            <View key={post.id} style={styles.postRow} wrap={false}>
              {post.thumbnail ? (
                // eslint-disable-next-line jsx-a11y/alt-text -- composant react-pdf, pas une balise HTML
                <Image src={post.thumbnail} style={styles.thumb} />
              ) : (
                <View style={styles.thumbPlaceholder} />
              )}
              <View style={styles.postBody}>
                <Text style={styles.postTitle}>{post.title}</Text>
                <Text style={styles.postMeta}>{post.meta}</Text>
                {post.caption && <Text style={styles.postCaption}>{post.caption}</Text>}
                {post.publishedUrl && <Text style={styles.postLink}>{post.publishedUrl}</Text>}
              </View>
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
