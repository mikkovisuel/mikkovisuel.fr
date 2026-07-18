import { SiteHeader } from "@/components/site-header";
import { Hero } from "@/components/hero";
import { PortfolioSection } from "@/components/portfolio-section";
import { ContactSection } from "@/components/contact-section";
import { InstallAppSection } from "@/components/install-app-section";
import { SalesTermsSection } from "@/components/sales-terms-section";
import { SiteFooter } from "@/components/site-footer";

// Contenu admin-éditable (Hero, piliers portfolio) : rendu dynamique plutôt
// que statique à la build, pour que les changements côté admin apparaissent
// sans reconstruire le site, et pour ne pas dépendre de la base de données
// au moment du build (celle-ci n'a pas encore de schéma lors du tout
// premier déploiement, avant la migration).
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <PortfolioSection />
        <ContactSection />
        <InstallAppSection />
        <SalesTermsSection />
      </main>
      <SiteFooter />
    </>
  );
}
