import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Armchair,
  Buildings,
  CalendarBlank,
  Camera,
  ChartBar,
  Crown,
  Gift,
  Heart,
  Megaphone,
  QrCode,
  ShieldCheck,
  Star,
  Users,
} from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Application pour clubs — Mikko Visuel",
  description:
    "Une application iPhone et Android aux couleurs de votre club : agenda, réservation de tables, fidélité, coupons, galerie. Essayez la démo dans votre navigateur.",
};

// La démo est une application web à part, servie sous /demo (voir
// next.config.ts). Elle tourne sur un club et des données fictifs. Lien
// <a> et non <Link> : ce n'est pas une page de ce site, le navigateur doit
// la charger entièrement.
const DEMO_HREF = "/demo";

// Uniquement ce que la démo montre réellement aujourd'hui : billetterie,
// paiement et cashless ne sont pas encore livrés dans l'application.
const clientFeatures = [
  {
    icon: CalendarBlank,
    title: "Agenda des soirées",
    text: "Programmation, line-up, ajout au calendrier du téléphone. Plusieurs établissements, un seul agenda.",
  },
  {
    icon: Armchair,
    title: "Réservation de table",
    text: "Le client choisit sa table sur le plan de salle, le club confirme.",
  },
  {
    icon: Crown,
    title: "Fidélité et VIP",
    text: "Points, paliers, et un badge coupe-file à présenter à l'entrée.",
  },
  {
    icon: Gift,
    title: "Coupons et parrainage",
    text: "Des offres à présenter au bar, et un code pour faire venir ses amis.",
  },
  {
    icon: QrCode,
    title: "Invitations",
    text: "Des pass nominatifs avec QR code, contrôlés à l'entrée.",
  },
  {
    icon: Camera,
    title: "Galerie photo et vidéo",
    text: "Les souvenirs de soirée, déposés par les clients et validés par le club.",
  },
  {
    icon: Heart,
    title: "Trouve ton crush",
    text: "Le mur des rencontres manquées, anonyme et modéré par le club.",
  },
  {
    icon: Star,
    title: "Sondages et avis",
    text: "L'avis de vos clients en quelques questions, et votre note publique mise en avant.",
  },
];

const clubFeatures = [
  { icon: Megaphone, text: "Notifications et e-mails ciblés : anniversaires, VIP, habitués, absents depuis un mois…" },
  { icon: QrCode, text: "Réservations, guest list et contrôle des pass à l'entrée" },
  { icon: ShieldCheck, text: "Modération des photos et des annonces avant publication" },
  { icon: ChartBar, text: "Tableau de bord : réservations, membres, fidélité" },
  { icon: Buildings, text: "Plusieurs établissements réunis en un groupe, avantages partagés ou non" },
  { icon: Users, text: "Un accès par rôle : gérant, accueil, community manager" },
];

export default function ApplicationClubPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-20 sm:pt-20 sm:pb-28">
          <div className="mx-auto grid max-w-7xl gap-16 px-4 sm:px-6 lg:grid-cols-12 lg:items-center lg:gap-8 lg:px-8">
            <div className="lg:col-span-7">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-ink-muted">
                Clubs et discothèques
              </p>
              <h1 className="mt-4 font-display text-4xl font-medium leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
                L&apos;application de votre club, à vos couleurs
              </h1>
              <p className="mt-6 max-w-[52ch] text-base leading-relaxed text-ink-muted">
                Une application iPhone et Android au nom de votre établissement.
                Vos clients y retrouvent l&apos;agenda, réservent leur table,
                cumulent leurs points et reçoivent vos offres. Vous pilotez tout
                depuis un back-office.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href={DEMO_HREF}
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
                >
                  Essayer la démo
                  <ArrowRight size={16} weight="bold" />
                </a>
                <Link
                  href="/#contact"
                  className="text-sm font-medium text-ink underline underline-offset-2 transition-colors hover:text-accent"
                >
                  Parler de votre club
                </Link>
              </div>
              <p className="mt-4 text-sm text-ink-muted">
                Démo interactive sur un club fictif, directement dans le
                navigateur. Rien à installer.
              </p>
            </div>

            <div className="flex justify-center lg:col-span-5 lg:justify-end">
              <div className="w-full max-w-[300px] overflow-hidden rounded-[2.5rem] border border-line bg-black shadow-2xl">
                <Image
                  src="/application-club/accueil.webp"
                  width={804}
                  height={1748}
                  alt="Écran d'accueil de l'application : prochaine soirée, bouton de réservation et raccourcis"
                  sizes="300px"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-line py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
              Ce que vos clients y trouvent
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {clientFeatures.map(({ icon: Icon, title, text }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-line bg-surface-elevated p-6"
                >
                  <Icon size={24} className="text-ink" />
                  <h3 className="mt-4 font-display text-lg font-medium text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-line py-20 sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
            <div className="lg:col-span-5">
              <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
                Ce que vous pilotez
              </h2>
              <p className="mt-4 max-w-[45ch] text-base text-ink-muted">
                Un back-office pour l&apos;équipe du club, accessible depuis
                n&apos;importe quel navigateur.
              </p>
            </div>
            <ul className="grid gap-4 lg:col-span-7">
              {clubFeatures.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-4">
                  <Icon size={22} className="mt-0.5 shrink-0 text-ink" />
                  <span className="text-base text-ink">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-line py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-line bg-surface-elevated p-8 sm:p-12">
              <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
                À votre image, à votre rythme
              </h2>
              <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-ink-muted">
                Chaque club a sa propre application : son nom sous l&apos;icône,
                ses couleurs, son logo. Vous choisissez les modules dont vous avez
                besoin ; changer vos couleurs ou en activer un nouveau ne demande
                aucune mise à jour sur les stores.
              </p>
              <div className="mt-8">
                <a
                  href={DEMO_HREF}
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
                >
                  Voir la démo
                  <ArrowRight size={16} weight="bold" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
