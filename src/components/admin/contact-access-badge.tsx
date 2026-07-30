import { CheckCircle, Clock, User } from "@phosphor-icons/react/dist/ssr";
import { CONTACT_ACCESS_LABELS, type ContactAccessState } from "@/lib/clients";

// Les trois états d'un contact vis-à-vis de l'espace client. Volontairement
// distincts : "invitation à envoyer" (accès ouvert, mot de passe pas encore
// choisi) est un état intermédiaire réel, pas une variante de "actif" — sans
// ça, un contact invité et jamais connecté passerait pour opérationnel.
const STYLES: Record<ContactAccessState, string> = {
  none: "border-line text-ink-muted",
  pending: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  active: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

const ICONS: Record<ContactAccessState, React.ReactNode> = {
  none: <User size={12} weight="regular" />,
  pending: <Clock size={12} weight="fill" />,
  active: <CheckCircle size={12} weight="fill" />,
};

export function ContactAccessBadge({ state }: { state: ContactAccessState }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${STYLES[state]}`}
    >
      {ICONS[state]}
      {CONTACT_ACCESS_LABELS[state]}
    </span>
  );
}
