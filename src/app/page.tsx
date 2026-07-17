import { SiteHeader } from "@/components/site-header";
import { Hero } from "@/components/hero";
import { PortfolioSection } from "@/components/portfolio-section";
import { ContactSection } from "@/components/contact-section";
import { SalesTermsSection } from "@/components/sales-terms-section";
import { SiteFooter } from "@/components/site-footer";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <PortfolioSection />
        <ContactSection />
        <SalesTermsSection />
      </main>
      <SiteFooter />
    </>
  );
}
