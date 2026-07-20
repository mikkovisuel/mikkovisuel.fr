import { Eye } from "@phosphor-icons/react/dist/ssr";

// Bandeau permanent de l'espace de démonstration public (Client.isDemo) —
// rappelle qu'on visualise un espace factice en lecture seule. Contrairement
// à `ImpersonationBanner`, il n'y a rien à "quitter" : se déconnecter suffit.
export function DemoModeBanner() {
  return (
    <div className="flex items-center gap-2 bg-accent px-4 py-2 text-sm text-accent-ink sm:px-6 lg:px-8">
      <Eye size={16} weight="regular" />
      <span>
        Espace de démonstration — consultation uniquement, aucune action n&apos;est enregistrée.
      </span>
    </div>
  );
}
