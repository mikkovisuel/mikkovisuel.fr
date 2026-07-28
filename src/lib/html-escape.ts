// Échappement HTML minimal pour interpoler du texte saisi par un
// utilisateur (client ou visiteur public) dans un corps d'email HTML
// (`sendEmail({ html })`) — sans ça, un titre de tâche ou un motif de refus
// contenant des balises serait interprété tel quel par le client mail du
// destinataire (souvent l'admin lui-même). Ne couvre que l'insertion dans du
// texte HTML, pas les attributs.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
