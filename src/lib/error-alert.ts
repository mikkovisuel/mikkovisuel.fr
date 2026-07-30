import "server-only";
import { escapeHtml } from "@/lib/html-escape";

// Alerte email quand une page ou une action plante en production.
//
// Avant (2026-07-30), une erreur serveur n'allait nulle part : trois
// `console.error` dans tout le code et les logs Scalingo, que personne ne
// lit. Un 500 chez un client un samedi soir restait invisible jusqu'à ce
// qu'il le signale — ou ne le signale pas.
//
// Trois précautions, parce qu'un système d'alerte qui s'emballe est pire que
// pas d'alerte du tout :
//   1. **Anti-répétition** : une même erreur (même message, même route) n'est
//      notifiée qu'une fois par heure. Une page cassée visitée cent fois ne
//      produit qu'un seul email.
//   2. **Plafond global** : au maximum 10 alertes par heure, tous types
//      confondus. Une panne de base de données ferait planter chaque page ;
//      sans ce plafond, la boîte mail serait inutilisable au moment précis
//      où il faut y voir clair.
//   3. **Jamais d'exception propre** : tout est encapsulé. Une alerte qui
//      échoue (base indisponible, Resend en panne) ne doit surtout pas
//      provoquer une seconde erreur, ni masquer l'erreur d'origine.
//
// État en mémoire du processus : suffisant sur un seul dyno web, et remis à
// zéro à chaque redéploiement — ce qui est le comportement souhaité (après un
// correctif, on veut être renotifié si le problème persiste).

const DEDUPE_WINDOW_MS = 60 * 60 * 1000;
const MAX_ALERTS_PER_WINDOW = 10;

const lastSentByFingerprint = new Map<string, number>();
let windowStartedAt = 0;
let sentInWindow = 0;

// Empêche la récursion : si l'envoi de l'alerte plante lui-même et que cette
// erreur repasse par `onRequestError`, on ne relance pas d'alerte.
let sending = false;

function shouldSend(fingerprint: string, now: number): boolean {
  if (now - windowStartedAt > DEDUPE_WINDOW_MS) {
    windowStartedAt = now;
    sentInWindow = 0;
  }
  if (sentInWindow >= MAX_ALERTS_PER_WINDOW) return false;

  const last = lastSentByFingerprint.get(fingerprint);
  if (last !== undefined && now - last < DEDUPE_WINDOW_MS) return false;

  lastSentByFingerprint.set(fingerprint, now);
  sentInWindow += 1;
  return true;
}

export interface ServerErrorContext {
  /** Chemin demandé, ex. `/admin/clients/abc`. */
  path?: string;
  /** `render` (composant serveur) ou `action` (Server Action), fourni par Next. */
  kind?: string;
}

export async function reportServerError(
  error: unknown,
  context: ServerErrorContext = {},
): Promise<void> {
  if (sending) return;

  try {
    const err = error instanceof Error ? error : new Error(String(error));
    const path = context.path ?? "(inconnu)";
    // L'empreinte volontairement grossière (message + route) : le but est de
    // regrouper les répétitions d'un même incident, pas de les distinguer
    // finement.
    const fingerprint = `${err.name}:${err.message}:${path}`;

    if (!shouldSend(fingerprint, Date.now())) return;

    sending = true;
    // Import différé : `instrumentation.ts` est chargé au démarrage du
    // serveur, on ne veut pas y tirer Prisma et Resend pour un chemin qui ne
    // sert qu'en cas d'incident.
    const { sendEmailToAdmins } = await import("@/lib/email/service");

    // La pile est tronquée : les premières lignes suffisent à situer le
    // problème, et un email de plusieurs milliers de lignes ne se lit pas.
    const stack = (err.stack ?? "").split("\n").slice(0, 12).join("\n");

    await sendEmailToAdmins({
      trigger: "server_error",
      subject: `Erreur serveur — ${path}`,
      html: `
        <p>Une erreur serveur s'est produite en production.</p>
        <p><strong>Page :</strong> ${escapeHtml(path)}</p>
        ${context.kind ? `<p><strong>Contexte :</strong> ${escapeHtml(context.kind)}</p>` : ""}
        <p><strong>Erreur :</strong> ${escapeHtml(err.name)} — ${escapeHtml(err.message)}</p>
        <pre style="white-space:pre-wrap;font-size:12px;background:#f4f4f5;padding:12px;border-radius:8px">${escapeHtml(stack)}</pre>
        <p style="color:#71717a;font-size:12px">Cette même erreur ne sera pas renotifiée avant une heure.</p>
      `,
    });
  } catch {
    // Silencieux et assumé : l'alerte est un confort, elle ne doit jamais
    // aggraver l'incident qu'elle signale.
  } finally {
    sending = false;
  }
}
