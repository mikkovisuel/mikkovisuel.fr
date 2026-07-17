const DEFAULT_HERO_TITLE = "Une direction artistique qui donne de l'allure à vos événements.";
const DEFAULT_HERO_SUBTITLE =
  "Flyers, motion design, photo et vidéo pour les clubs et les marques qui veulent sortir du lot.";
const DEFAULT_HERO_BUTTON_LABEL = "Voir le travail";
const DEFAULT_PORTFOLIO_TITLE = "Cinq façons de travailler une soirée";
const DEFAULT_PORTFOLIO_SUBTITLE =
  "Chaque pilier peut être filtré ou étendu depuis le backend, sans jamais toucher au code.";

interface HomepageContentRow {
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroButtonLabel: string | null;
  portfolioTitle: string | null;
  portfolioSubtitle: string | null;
}

export function resolveHomepageContent(content: HomepageContentRow | null) {
  return {
    heroTitle: content?.heroTitle || DEFAULT_HERO_TITLE,
    heroSubtitle: content?.heroSubtitle || DEFAULT_HERO_SUBTITLE,
    heroButtonLabel: content?.heroButtonLabel || DEFAULT_HERO_BUTTON_LABEL,
    portfolioTitle: content?.portfolioTitle || DEFAULT_PORTFOLIO_TITLE,
    portfolioSubtitle: content?.portfolioSubtitle || DEFAULT_PORTFOLIO_SUBTITLE,
  };
}
