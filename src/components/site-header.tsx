import Link from "next/link";
import { BrandLogo } from "./brand-logo";
import { ThemeToggle } from "./theme-toggle";

// Ancres préfixées par « / » : l'en-tête est aussi affiché sur d'autres pages
// (mentions légales, application club), où « #contact » seul ne mènerait
// nulle part.
const navLinks = [
  { href: "/#portfolio", label: "Portfolio" },
  { href: "/application-club", label: "App club" },
  { href: "/#contact", label: "Contact" },
  { href: "/#application", label: "Application" },
  { href: "/#conditions", label: "Conditions" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/">
          <BrandLogo className="h-8" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-ink-muted transition-colors hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/espace-client/connexion"
            className="inline-flex items-center rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
          >
            Espace client
          </Link>
        </div>
      </div>
    </header>
  );
}
