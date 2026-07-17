import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Mentions légales — Mikko Visuel",
};

export default function MentionsLegalesPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 py-20">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl font-medium tracking-tight text-ink">
            Mentions légales
          </h1>
          <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink-muted">
            <p>
              Contenu à renseigner : identité de la micro-entreprise (nom,
              statut, numéro SIRET), adresse, hébergeur du site, et directeur
              de la publication.
            </p>
            <p>
              Cette page est un espace réservé en attendant la rédaction
              définitive, à faire relire par un professionnel avant la mise
              en ligne (voir §10 du cahier des charges).
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
