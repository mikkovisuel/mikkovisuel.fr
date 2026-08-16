import { SiteHeader } from "@/components/site-header";
import { Hero } from "@/components/hero";
import { PortfolioSection } from "@/components/portfolio-section";
import { ContactSection } from "@/components/contact-section";
import { InstallAppSection } from "@/components/install-app-section";
import { SalesTermsSection } from "@/components/sales-terms-section";
import { SiteFooter } from "@/components/site-footer";
import { getHomepageHero, getHomepageContent, getPortfolioPillars } from "@/lib/homepage-data";

// Contenu admin-éditable (Hero, piliers portfolio) : rendu dynamique plutôt
// que statique à la build, pour que les changements côté admin apparaissent
// sans reconstruire le site, et pour ne pas dépendre de la base de données
// au moment du build (celle-ci n'a pas encore de schéma lors du tout
// premier déploiement, avant la migration).
export const dynamic = "force-dynamic";

export default function Home() {
  // Perf : lance les 3 requêtes utilisées par `Hero`/`PortfolioSection`
  // avant même de rendre ces composants, plutôt que de les laisser chacun
  // découvrir son besoin en données au fil du rendu (ce qui les enchaînerait
  // au lieu de les paralléliser). `cache()` (voir src/lib/homepage-data.ts)
  // fait qu'un appel identique plus bas dans l'arbre réutilise cette même
  // requête déjà en vol plutôt que d'en relancer une.
  void getHomepageHero();
  void getHomepageContent();
  void getPortfolioPillars();

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
