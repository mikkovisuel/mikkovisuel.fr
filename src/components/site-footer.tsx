import Link from "next/link";
import { BrandLogo } from "./brand-logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-line py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <BrandLogo className="h-9" />

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-muted">
          <a href="#portfolio" className="transition-colors hover:text-ink">
            Portfolio
          </a>
          <a href="#contact" className="transition-colors hover:text-ink">
            Contact
          </a>
          <a href="#conditions" className="transition-colors hover:text-ink">
            Conditions
          </a>
          <Link href="/mentions-legales" className="transition-colors hover:text-ink">
            Mentions légales
          </Link>
          <Link href="/admin/connexion" className="transition-colors hover:text-ink">
            Admin
          </Link>
        </nav>

        <p className="text-sm text-ink-muted">
          © 2026 Mikko Visuel. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}
