import "server-only";
import { db } from "@/lib/db";

// Journal d'audit global — actions sensibles uniquement (voir /admin/audit
// et le schéma AuditLogEntry) : connexions, suppressions définitives,
// changements/réinitialisations de mot de passe, exports de données,
// usurpation d'espace client. Mirror du pattern `logProspectActivity` — un
// seul point d'écriture, appelé au moment de chaque action concernée,
// jamais d'interception globale.
export type AuditAction =
  | "admin_login_success"
  | "admin_login_failed"
  | "client_deleted"
  | "admin_password_reset_completed"
  | "client_password_reset"
  | "impersonation_start"
  | "admin_invited"
  | "admin_revoked"
  | "data_export";

export async function logAuditEvent(input: {
  actorType: "ADMIN" | "SYSTEM";
  actorId?: string;
  actorLabel: string;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}) {
  await db.auditLogEntry.create({
    data: {
      actorType: input.actorType,
      actorId: input.actorId,
      actorLabel: input.actorLabel,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      targetLabel: input.targetLabel,
      metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
      ipAddress: input.ipAddress ?? undefined,
    },
  });
}

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  admin_login_success: "Connexion admin réussie",
  admin_login_failed: "Connexion admin échouée",
  client_deleted: "Client supprimé définitivement",
  admin_password_reset_completed: "Mot de passe admin réinitialisé",
  client_password_reset: "Réinitialisation du mot de passe d'un client déclenchée",
  impersonation_start: "Usurpation d'espace client",
  admin_invited: "Administrateur invité",
  admin_revoked: "Administrateur révoqué",
  data_export: "Export de données",
};
