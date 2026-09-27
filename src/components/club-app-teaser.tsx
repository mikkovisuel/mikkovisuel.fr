import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

// Lien de l'accueil vers la page de l'offre application club. Présent dans
// le corps de page et pas seulement dans l'en-tête : sur téléphone, les
// liens de l'en-tête sont masqués.
export function ClubAppTeaser() {
  return (
    <section className="border-t border-line py-12 sm:py-16">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          <h2 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">
            Vous gérez un club ?
          </h2>
          <p className="mt-2 max-w-[55ch] text-base text-ink-muted">
            Une application à vos couleurs pour vos clients, et sa démo à
            essayer dans le navigateur.
          </p>
        </div>
        <Link
          href="/application-club"
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] sm:self-auto"
        >
          Découvrir l&apos;application
          <ArrowRight size={16} weight="bold" />
        </Link>
      </div>
    </section>
  );
}
