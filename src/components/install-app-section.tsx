import { InstallPwaCta } from "@/components/install-pwa-cta";

export function InstallAppSection() {
  return (
    <section id="application" className="scroll-mt-16 border-t border-line py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-12 lg:items-center lg:px-8">
        <div className="lg:col-span-7">
          <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
            Votre espace client, comme une application
          </h2>
          <p className="mt-4 max-w-[55ch] text-base text-ink-muted">
            Installez l&apos;espace client Mikko Visuel sur votre téléphone
            (iPhone ou Android) pour y accéder en un tap, sans navigateur ni
            recherche : suivi de projet, validation des BAT, livrables et
            documents administratifs.
          </p>
        </div>

        <div className="flex lg:col-span-5 lg:justify-end">
          <InstallPwaCta />
        </div>
      </div>
    </section>
  );
}
