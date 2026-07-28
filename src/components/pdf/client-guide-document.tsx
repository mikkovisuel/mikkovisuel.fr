import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { registerPdfFonts, PDF_COLORS as COLORS, PDF_STATUS_COLORS as STATUS_COLORS } from "@/components/pdf/pdf-theme";

registerPdfFonts();

// Guide "mode d'emploi" de l'espace client, dans la DA du site (mêmes
// couleurs/police que task-report-document.tsx — voir pdf-theme.ts).
// Chaque section combine une explication courte et une illustration
// vectorielle fidèle à l'interface réelle (mise en page, libellés, couleurs)
// plutôt qu'une capture d'écran pixel : ce document est généré côté serveur
// (route /api/exports/guide) sans navigateur disponible pour capturer de
// vraies captures — l'illustration reprend néanmoins l'exacte structure et
// les libellés réels de chaque page.

const styles = StyleSheet.create({
  page: {
    paddingVertical: 40,
    paddingHorizontal: 44,
    fontSize: 10,
    color: COLORS.ink,
    backgroundColor: COLORS.surface,
  },
  coverBrand: { fontFamily: "ClashDisplay", fontWeight: 700, fontSize: 16, color: COLORS.accent, letterSpacing: 1.5 },
  coverTitle: { fontFamily: "ClashDisplay", fontWeight: 700, fontSize: 30, marginTop: 100 },
  coverSubtitle: { fontSize: 12, color: COLORS.inkMuted, marginTop: 12, lineHeight: 1.5 },
  headerBlock: { borderBottomWidth: 2, borderBottomColor: COLORS.accent, paddingBottom: 10, marginBottom: 20 },
  brand: { fontFamily: "ClashDisplay", fontWeight: 700, fontSize: 11, letterSpacing: 1.5, color: COLORS.accent },
  pageTitle: { fontFamily: "ClashDisplay", fontWeight: 700, fontSize: 16, marginTop: 8 },
  section: { marginBottom: 28 },
  sectionTitle: { fontFamily: "ClashDisplay", fontWeight: 700, fontSize: 13, color: COLORS.ink },
  sectionText: { marginTop: 6, color: COLORS.inkMuted, lineHeight: 1.5 },
  mockFrame: {
    marginTop: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceElevated,
  },
  mockNav: { flexDirection: "row", gap: 10, marginBottom: 12 },
  mockNavItem: { fontSize: 8, color: COLORS.inkMuted },
  mockNavItemActive: { fontSize: 8, color: COLORS.accent, fontWeight: 700 },
  mockCardRow: { flexDirection: "row", gap: 10 },
  mockCard: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
  },
  mockCardLabel: { fontSize: 7, color: COLORS.inkMuted },
  mockCardValue: { fontFamily: "ClashDisplay", fontWeight: 700, fontSize: 14, color: COLORS.ink, marginTop: 4 },
  mockButton: {
    fontSize: 8,
    fontWeight: 700,
    color: COLORS.accentInk,
    backgroundColor: COLORS.accent,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  mockButtonOutline: {
    fontSize: 8,
    color: COLORS.ink,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  mockBadge: {
    fontSize: 7,
    fontWeight: 700,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  mockTimelineRow: { flexDirection: "row", marginTop: 4 },
  mockTimelineStep: { flex: 1, alignItems: "center" },
  mockTimelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.line },
  mockTimelineDotActive: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.accent },
  mockTimelineLabel: { fontSize: 6, color: COLORS.inkMuted, marginTop: 4, textAlign: "center" },
  mockCalendarGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  mockCalendarCell: {
    width: 36,
    height: 30,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 4,
    padding: 3,
  },
  mockCalendarCellFilled: {
    width: 36,
    height: 30,
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: 4,
    padding: 3,
    backgroundColor: "rgba(221,237,46,0.12)",
  },
  mockCalendarNum: { fontSize: 6, color: COLORS.inkMuted },
  mockFileGrid: { flexDirection: "row", gap: 8, marginTop: 4 },
  mockFileThumb: {
    width: 52,
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 6,
    backgroundColor: COLORS.surface,
  },
  mockDocRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  mockDocName: { fontSize: 8, color: COLORS.ink },
  mockTextarea: {
    marginTop: 6,
    height: 40,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 6,
    backgroundColor: COLORS.surface,
  },
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

function GuidePage({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.headerBlock}>
        <Text style={styles.brand}>{eyebrow}</Text>
        <Text style={styles.pageTitle}>{title}</Text>
      </View>
      {children}
      <Text style={styles.footer} fixed>
        Mikko Visuel — mikkovisuel.fr — Guide de l&apos;espace client
      </Text>
    </Page>
  );
}

export function ClientGuideDocument() {
  return (
    <Document title="Guide de l'espace client — Mikko Visuel">
      <Page size="A4" style={styles.page}>
        <Text style={styles.coverBrand}>MIKKO VISUEL</Text>
        <Text style={styles.coverTitle}>Guide de votre{"\n"}espace client</Text>
        <Text style={styles.coverSubtitle}>
          Comment suivre vos projets, valider vos BAT, récupérer vos livrables et gérer vos
          documents administratifs — pas à pas.
        </Text>
        <Text style={styles.footer} fixed>
          Mikko Visuel — mikkovisuel.fr — Guide de l&apos;espace client
        </Text>
      </Page>

      <GuidePage eyebrow="MIKKO VISUEL" title="Connexion et application installable">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Se connecter</Text>
          <Text style={styles.sectionText}>
            Rendez-vous sur mikkovisuel.fr, rubrique «&nbsp;Application&nbsp;», ou directement sur
            l&apos;adresse de connexion qui vous a été transmise. Renseignez l&apos;email et le
            mot de passe de votre compte. En cas d&apos;oubli, le lien «&nbsp;Mot de passe
            oublié&nbsp;?&nbsp;» vous envoie un email pour en choisir un nouveau.
          </Text>
          <View style={styles.mockFrame}>
            <Text style={{ fontFamily: "ClashDisplay", fontWeight: 700, fontSize: 11 }}>
              Espace client
            </Text>
            <Text style={{ fontSize: 8, color: COLORS.inkMuted, marginTop: 4 }}>
              Connectez-vous pour suivre vos demandes.
            </Text>
            <View style={{ marginTop: 10, gap: 6 }}>
              <View style={{ height: 16, borderWidth: 1, borderColor: COLORS.line, borderRadius: 6 }} />
              <View style={{ height: 16, borderWidth: 1, borderColor: COLORS.line, borderRadius: 6 }} />
              <Text style={[styles.mockButton, { marginTop: 4 }]}>Se connecter</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Installer l&apos;application</Text>
          <Text style={styles.sectionText}>
            Depuis la page d&apos;accueil du site, section «&nbsp;Votre espace client, comme une
            application&nbsp;» : sur ordinateur ou Android, un bouton d&apos;installation propose
            de l&apos;ajouter directement à votre écran. Sur iPhone (Safari), utilisez le bouton
            «&nbsp;Partager&nbsp;» puis «&nbsp;Sur l&apos;écran d&apos;accueil&nbsp;». Une fois
            installée, l&apos;icône ouvre directement votre espace, sans passer par un navigateur.
          </Text>
        </View>
      </GuidePage>

      <GuidePage eyebrow="MIKKO VISUEL" title="Accueil et validation des BAT">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accueil</Text>
          <Text style={styles.sectionText}>
            La page d&apos;accueil résume l&apos;essentiel en un coup d&apos;œil : le nombre de
            tâches en attente de validation, votre prochaine échéance, et un éventuel montant
            impayé — ainsi que la liste de vos tâches actives avec leur statut.
          </Text>
          <View style={styles.mockFrame}>
            <View style={styles.mockNav}>
              <Text style={styles.mockNavItemActive}>Accueil</Text>
              <Text style={styles.mockNavItem}>À valider</Text>
              <Text style={styles.mockNavItem}>Suivi</Text>
              <Text style={styles.mockNavItem}>Calendrier</Text>
              <Text style={styles.mockNavItem}>Livrables</Text>
              <Text style={styles.mockNavItem}>Administratif</Text>
            </View>
            <View style={styles.mockCardRow}>
              <View style={styles.mockCard}>
                <Text style={styles.mockCardLabel}>À valider</Text>
                <Text style={styles.mockCardValue}>2</Text>
              </View>
              <View style={styles.mockCard}>
                <Text style={styles.mockCardLabel}>Prochaine échéance</Text>
                <Text style={[styles.mockCardValue, { fontSize: 10 }]}>15 août</Text>
              </View>
              <View style={styles.mockCard}>
                <Text style={styles.mockCardLabel}>Montant impayé</Text>
                <Text style={styles.mockCardValue}>0 €</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>À valider</Text>
          <Text style={styles.sectionText}>
            Chaque BAT (bon à tirer) proposé par Mikko s&apos;affiche ici avec un aperçu du
            fichier. Vous pouvez le valider en un clic, ou le refuser en indiquant le motif —
            Mikko en est notifié immédiatement et peut reprendre le fichier.
          </Text>
          <View style={styles.mockFrame}>
            <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
              <View style={styles.mockFileThumb} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 9, fontWeight: 700 }}>Flyer soirée d&apos;été</Text>
                <Text
                  style={[styles.mockBadge, { backgroundColor: STATUS_COLORS.amber.bg, color: STATUS_COLORS.amber.text, marginTop: 4 }]}
                >
                  À valider
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              <Text style={styles.mockButton}>Valider</Text>
              <Text style={styles.mockButtonOutline}>Refuser</Text>
            </View>
          </View>
        </View>
      </GuidePage>

      <GuidePage eyebrow="MIKKO VISUEL" title="Suivi et calendrier">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suivi</Text>
          <Text style={styles.sectionText}>
            Chaque tâche progresse à travers une timeline simple : Nouveau, En cours, À valider,
            Terminé. Si un BAT a été refusé, le motif apparaît directement sur la tâche jusqu&apos;à
            la validation du BAT corrigé. Un fil de discussion permet d&apos;échanger avec Mikko
            directement sur chaque tâche, sans email.
          </Text>
          <View style={styles.mockFrame}>
            <View style={styles.mockTimelineRow}>
              {["Nouveau", "En cours", "À valider", "Terminé"].map((label, index) => (
                <View key={label} style={styles.mockTimelineStep}>
                  <View style={index <= 1 ? styles.mockTimelineDotActive : styles.mockTimelineDot} />
                  <Text style={styles.mockTimelineLabel}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Calendrier</Text>
          <Text style={styles.sectionText}>
            Vos tâches sont aussi visibles sous forme de calendrier, classées par date
            d&apos;évènement — pratique pour visualiser une échéance importante d&apos;un coup
            d&apos;œil.
          </Text>
          <View style={styles.mockFrame}>
            <View style={styles.mockCalendarGrid}>
              {Array.from({ length: 14 }).map((_, index) => (
                <View key={index} style={index === 8 ? styles.mockCalendarCellFilled : styles.mockCalendarCell}>
                  <Text style={styles.mockCalendarNum}>{index + 1}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </GuidePage>

      <GuidePage eyebrow="MIKKO VISUEL" title="Livrables et documents administratifs">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Livrables</Text>
          <Text style={styles.sectionText}>
            Une fois une tâche terminée, vos fichiers finaux (sans filigrane) sont téléchargeables
            ici, avec un aperçu (image, vidéo, PDF) selon le type de fichier. Vous pouvez trier par
            date d&apos;évènement ou date d&apos;ajout.
          </Text>
          <View style={styles.mockFrame}>
            <View style={styles.mockFileGrid}>
              <View style={styles.mockFileThumb} />
              <View style={styles.mockFileThumb} />
              <View style={styles.mockFileThumb} />
              <View style={styles.mockFileThumb} />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Administratif</Text>
          <Text style={styles.sectionText}>
            Devis, contrats et factures apparaissent ici, avec leur statut de paiement. Si un
            paiement en ligne est proposé, un bouton de règlement sécurisé (Stripe) est disponible
            directement sur le document.
          </Text>
          <View style={styles.mockFrame}>
            <View style={styles.mockDocRow}>
              <Text style={styles.mockDocName}>Devis — Flyer soirée d&apos;été.pdf</Text>
              <Text
                style={[styles.mockBadge, { backgroundColor: STATUS_COLORS.emerald.bg, color: STATUS_COLORS.emerald.text }]}
              >
                Payée
              </Text>
            </View>
            <View style={styles.mockDocRow}>
              <Text style={styles.mockDocName}>Facture — Motion design.pdf</Text>
              <Text
                style={[styles.mockBadge, { backgroundColor: STATUS_COLORS.amber.bg, color: STATUS_COLORS.amber.text }]}
              >
                En attente
              </Text>
            </View>
          </View>
        </View>
      </GuidePage>

      <GuidePage eyebrow="MIKKO VISUEL" title="Suggestion et mon compte">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suggestion</Text>
          <Text style={styles.sectionText}>
            Une remarque sur l&apos;espace client lui-même (pas sur une tâche précise) ? Ce petit
            formulaire envoie votre message directement à Mikko par email.
          </Text>
          <View style={styles.mockFrame}>
            <View style={styles.mockTextarea} />
            <Text style={[styles.mockButton, { marginTop: 8 }]}>Envoyer</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mon compte</Text>
          <Text style={styles.sectionText}>
            Depuis l&apos;icône en forme de roue crantée (en-tête), vous pouvez changer votre mot
            de passe (avec le mot de passe actuel), activer ou désactiver les notifications email
            automatiques, et basculer entre thème clair et sombre.
          </Text>
        </View>
      </GuidePage>
    </Document>
  );
}
