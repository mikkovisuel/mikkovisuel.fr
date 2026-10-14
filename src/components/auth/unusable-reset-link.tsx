import Link from "next/link";
import type { ResetLinkStatus } from "@/lib/password-reset-token";

// Affiché à la place du formulaire quand le lien « choisir votre mot de
// passe » ne peut plus servir (2026-10-14). Avant, le formulaire s'affichait
// quand même et l'erreur n'apparaissait qu'une fois le mot de passe saisi,
// sans rien proposer : un invité dont le lien avait expiré restait bloqué.

const MESSAGES: Record<Exclude<ResetLinkStatus, "valid">, string> = {
  expired: "Ce lien a expiré.",
  used: "Ce lien a déjà servi : le mot de passe a été choisi.",
  unknown: "Ce lien n'est pas valide — il est peut-être incomplet, ou un lien plus récent l'a remplacé.",
};

export function UnusableResetLink({
  status,
  space,
}: {
  status: Exclude<ResetLinkStatus, "valid">;
  space: "admin" | "espace-client";
}) {
  const base = space === "admin" ? "/admin" : "/espace-client";
  return (
    <div className="grid gap-5 text-sm">
      <p className="rounded-xl border border-line bg-surface-elevated px-4 py-3 text-ink">{MESSAGES[status]}</p>
      {status === "used" ? (
        <Link
          href={`${base}/connexion`}
          className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 font-medium text-accent-ink transition-transform active:scale-[0.98]"
        >
          Se connecter
        </Link>
      ) : (
        <>
          <Link
            href={`${base}/mot-de-passe-oublie`}
            className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 font-medium text-accent-ink transition-transform active:scale-[0.98]"
          >
            Recevoir un nouveau lien
          </Link>
          <p className="text-center text-ink-muted">
            {space === "admin"
              ? "Vous venez d'être invité ? Saisissez la même adresse : vous recevrez un nouveau lien pour choisir votre mot de passe. Vous pouvez aussi demander à la personne qui vous a invité de renvoyer l'invitation."
              : "Saisissez votre adresse : vous recevrez un nouveau lien pour choisir votre mot de passe."}
          </p>
        </>
      )}
    </div>
  );
}
