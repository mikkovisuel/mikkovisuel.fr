// Profil d'affichage d'un admin, stocké dans `Admin.preferences` (JSON).
//
// 2026-10-20 (livraison 2) : densité des listes. 2026-10-20 (« Mon
// affichage », maquette validée — « tout ok, code tout ») : couleur
// d'accent, taille du texte, tiroir, rubriques visibles et leur ordre, page
// d'accueil, colonnes visibles et leur ordre par liste, tris par défaut,
// blocs du tableau de bord, vues par défaut. Le thème reste dans sa colonne
// historique `Admin.themePreference`, qui accepte désormais « system ».
//
// Point d'entrée unique : tout réglage lu par l'interface passe par
// `parseAdminPreferences`, qui ignore une valeur inconnue ou abîmée et
// retombe sur le défaut — une préférence corrompue ne doit jamais casser
// l'admin. Ces réglages changent ce que l'admin VOIT, jamais ce à quoi il a
// droit : masquer n'est pas interdire.
//
// Fichier sans dépendance serveur : il est importé aussi par l'écran de
// réglages (composant client).

// ---------------------------------------------------------------------------
// Listes de valeurs
// ---------------------------------------------------------------------------

export const DENSITIES = ["compact", "standard", "confortable"] as const;
export type Density = (typeof DENSITIES)[number];

/** Libellés et hauteur de ligne, comme le réglage « Densité » de Gmail. */
export const DENSITY_OPTIONS: { value: Density; label: string; rowHeight: number }[] = [
  { value: "compact", label: "Compacte", rowHeight: 32 },
  { value: "standard", label: "Par défaut", rowHeight: 40 },
  { value: "confortable", label: "Confortable", rowHeight: 48 },
];

export const TEXT_SIZES = ["petite", "normale", "grande"] as const;
export type TextSize = (typeof TEXT_SIZES)[number];
export const TEXT_SIZE_OPTIONS: { value: TextSize; label: string; rootPercent: number }[] = [
  { value: "petite", label: "Petite", rootPercent: 93.75 },
  { value: "normale", label: "Normale", rootPercent: 100 },
  { value: "grande", label: "Grande", rootPercent: 112.5 },
];

export const THEMES = ["light", "dark", "system"] as const;
export type ThemeChoice = (typeof THEMES)[number];
export const THEME_OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: "light", label: "Clair" },
  { value: "dark", label: "Sombre" },
  { value: "system", label: "Selon l'appareil" },
];

/** Couleurs proposées. `null` = jaune Mikko, la couleur de la marque. */
export const ACCENT_PRESETS = [
  "#dded2e",
  "#8ab4f8",
  "#81c995",
  "#f6aea9",
  "#fdd663",
  "#d7aefb",
  "#78d9ec",
  "#1f1f1f",
] as const;
export const DEFAULT_ACCENT = "#dded2e";

/** Rubriques du tiroir, dans leur groupe. L'ordre ne change qu'à
 * l'intérieur d'un groupe : les groupes restent dans cet ordre. */
export const NAV_ITEMS = [
  { key: "dashboard", href: "/admin", label: "Tableau de bord", group: null },
  { key: "clients", href: "/admin/clients", label: "Clients", group: "Relation client" },
  { key: "contacts", href: "/admin/contacts", label: "Contacts", group: "Relation client" },
  { key: "prospection", href: "/admin/prospection", label: "Prospection", group: "Relation client" },
  { key: "taches", href: "/admin/taches", label: "Tâches", group: "Production" },
  { key: "reseaux", href: "/admin/reseaux", label: "Réseaux", group: "Production" },
  { key: "planning", href: "/admin/planning", label: "Planning", group: "Production" },
  { key: "administratif", href: "/admin/administratif", label: "Administratif", group: "Gestion" },
  { key: "notes", href: "/admin/notes", label: "Notes", group: "Gestion" },
  { key: "portfolio", href: "/admin/portfolio", label: "Portfolio", group: "Gestion" },
] as const;
export type NavKey = (typeof NAV_ITEMS)[number]["key"];
export const NAV_KEYS = NAV_ITEMS.map((item) => item.key) as NavKey[];

/** Colonnes configurables par liste. La colonne principale (titre, nom) est
 * toujours affichée et n'apparaît donc pas ici. */
export const LIST_COLUMNS = {
  taches: {
    label: "Tâches",
    columns: [
      { key: "client", label: "Client" },
      { key: "echeance", label: "Échéance" },
      { key: "evenement", label: "Évènement" },
      { key: "statut", label: "Statut" },
      { key: "temps", label: "Temps" },
      { key: "type", label: "Type" },
      { key: "formats", label: "Formats" },
    ],
    hiddenByDefault: ["type", "formats"],
  },
  clients: {
    label: "Clients",
    columns: [
      { key: "categorie", label: "Catégorie" },
      { key: "ajoute", label: "Ajouté le" },
    ],
    hiddenByDefault: ["ajoute"],
  },
  prospects: {
    label: "Prospection",
    columns: [
      { key: "ville", label: "Ville" },
      { key: "telephone", label: "Téléphone" },
      { key: "email", label: "Email" },
      { key: "instagram", label: "Instagram" },
      { key: "whatsapp", label: "WhatsApp" },
      { key: "activite", label: "Activité" },
      { key: "relance", label: "Relance" },
      { key: "statut", label: "Statut" },
    ],
    hiddenByDefault: [],
  },
  contacts: {
    label: "Contacts",
    columns: [
      { key: "email", label: "Email" },
      { key: "telephone", label: "Téléphone" },
      { key: "client", label: "Client" },
      { key: "acces", label: "Accès" },
    ],
    hiddenByDefault: [],
  },
} as const;
export type ListKey = keyof typeof LIST_COLUMNS;
export const LIST_KEYS = Object.keys(LIST_COLUMNS) as ListKey[];

/** Tris par défaut proposés (mêmes champs que les tris des pages). */
export const SORT_OPTIONS = {
  taches: [
    { value: "evenement", label: "Évènement" },
    { value: "echeance", label: "Échéance" },
    { value: "client", label: "Client" },
    { value: "tache", label: "Titre" },
    { value: "statut", label: "Statut" },
  ],
  clients: [
    { value: "nom", label: "Nom" },
    { value: "date_ajout", label: "Date d'ajout" },
  ],
  contacts: [
    { value: "nom", label: "Nom" },
    { value: "date_ajout", label: "Date d'ajout" },
  ],
} as const;
export type SortListKey = keyof typeof SORT_OPTIONS;

/** Blocs du tableau de bord, dans l'ordre d'origine. */
export const DASHBOARD_BLOCKS = [
  { key: "chiffres", label: "Chiffres clés (clients, tâches, factures)" },
  { key: "activite", label: "Depuis votre dernière connexion" },
  { key: "reseaux", label: "Réseaux du jour" },
  { key: "epinglees", label: "Tâches épinglées" },
  { key: "evenements", label: "Prochains évènements" },
  { key: "statuts", label: "Tâches par statut" },
  { key: "inactifs", label: "Clients sans activité récente" },
  { key: "connexions", label: "Journal de connexion" },
  { key: "installer", label: "Installer le tableau de bord" },
] as const;
export type DashboardBlockKey = (typeof DASHBOARD_BLOCKS)[number]["key"];

/** Vue ouverte quand on arrive sur une page sans en avoir choisi une. */
export const VIEW_OPTIONS = {
  taches: {
    label: "Tâches",
    options: [
      { value: "liste", label: "Liste" },
      { value: "kanban", label: "Kanban" },
      { value: "calendrier", label: "Calendrier" },
    ],
  },
  reseaux: {
    label: "Réseaux",
    options: [
      { value: "liste", label: "Liste" },
      { value: "calendrier", label: "Calendrier" },
      { value: "grille", label: "Grille Instagram" },
      { value: "afaire", label: "À faire" },
    ],
  },
  prospection: {
    label: "Prospection",
    options: [
      { value: "liste", label: "Liste" },
      { value: "kanban", label: "Kanban" },
    ],
  },
  administratif: {
    label: "Administratif",
    options: [
      { value: "detaille", label: "Détaillé" },
      { value: "bacs", label: "Bacs" },
    ],
  },
  planning: {
    label: "Planning",
    options: [
      { value: "semaine", label: "Semaine" },
      { value: "jour", label: "Jour" },
    ],
  },
} as const;
export type ViewPageKey = keyof typeof VIEW_OPTIONS;
export const VIEW_PAGE_KEYS = Object.keys(VIEW_OPTIONS) as ViewPageKey[];

// ---------------------------------------------------------------------------
// Forme du profil
// ---------------------------------------------------------------------------

export interface OrderedSet<K extends string = string> {
  /** Toutes les clés, dans l'ordre choisi. */
  order: K[];
  /** Clés masquées. */
  hidden: K[];
}

export interface AdminPreferences {
  density: Density;
  /** Couleur d'accent en `#rrggbb`, `null` = jaune Mikko. */
  accent: string | null;
  textSize: TextSize;
  drawer: {
    /** Tiroir déplié au démarrage (sinon colonne d'icônes). */
    expanded: boolean;
    counters: boolean;
    clientShortcuts: boolean;
  };
  nav: OrderedSet<NavKey>;
  /** Page ouverte par le logo et après la connexion. */
  home: NavKey;
  columns: Record<ListKey, OrderedSet>;
  sorts: {
    taches: { field: string; dir: "asc" | "desc" };
    clients: { field: string; dir: "asc" | "desc" };
    contacts: { field: string };
  };
  dashboard: OrderedSet<DashboardBlockKey>;
  views: Record<ViewPageKey, string>;
}

export function defaultAdminPreferences(): AdminPreferences {
  return {
    // Choix du client du 2026-10-20 : compact par défaut.
    density: "compact",
    accent: null,
    textSize: "normale",
    drawer: { expanded: true, counters: true, clientShortcuts: true },
    nav: { order: [...NAV_KEYS], hidden: [] },
    home: "dashboard",
    columns: Object.fromEntries(
      LIST_KEYS.map((list) => [
        list,
        {
          order: LIST_COLUMNS[list].columns.map((column) => column.key),
          hidden: [...LIST_COLUMNS[list].hiddenByDefault],
        },
      ]),
    ) as Record<ListKey, OrderedSet>,
    sorts: {
      taches: { field: "evenement", dir: "asc" },
      clients: { field: "nom", dir: "asc" },
      contacts: { field: "nom" },
    },
    dashboard: { order: DASHBOARD_BLOCKS.map((block) => block.key), hidden: [] },
    views: Object.fromEntries(
      VIEW_PAGE_KEYS.map((page) => [page, VIEW_OPTIONS[page].options[0].value]),
    ) as Record<ViewPageKey, string>,
  };
}

// ---------------------------------------------------------------------------
// Lecture tolérante
// ---------------------------------------------------------------------------

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export function isDensity(value: unknown): value is Density {
  return typeof value === "string" && (DENSITIES as readonly string[]).includes(value);
}

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function bool(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

/** Ordre + masquage : clés inconnues ignorées, doublons retirés, clés
 * manquantes (nouvelle colonne ajoutée depuis) remises à leur place
 * d'origine en fin de liste, visibles ou non selon le défaut. */
function orderedSet<K extends string>(raw: unknown, allKeys: readonly K[], fallback: OrderedSet<K>): OrderedSet<K> {
  if (!isRecord(raw)) return { order: [...fallback.order], hidden: [...fallback.hidden] };
  const known = new Set<string>(allKeys);
  const order: K[] = [];
  if (Array.isArray(raw.order)) {
    for (const key of raw.order) if (typeof key === "string" && known.has(key) && !order.includes(key as K)) order.push(key as K);
  }
  const missing = allKeys.filter((key) => !order.includes(key));
  order.push(...missing);
  const hidden = Array.isArray(raw.hidden)
    ? (raw.hidden.filter((key) => typeof key === "string" && known.has(key)) as K[])
    : [];
  // Une clé arrivée depuis l'enregistrement suit le défaut.
  for (const key of missing) if (fallback.hidden.includes(key) && !hidden.includes(key)) hidden.push(key);
  return { order, hidden: [...new Set(hidden)] };
}

export function parseAdminPreferences(raw: unknown): AdminPreferences {
  const defaults = defaultAdminPreferences();
  const source = isRecord(raw) ? raw : {};
  const drawer = isRecord(source.drawer) ? source.drawer : {};
  const columns = isRecord(source.columns) ? source.columns : {};
  const sorts = isRecord(source.sorts) ? source.sorts : {};
  const views = isRecord(source.views) ? source.views : {};

  const sortOf = (list: "taches" | "clients") => {
    const value = isRecord(sorts[list]) ? sorts[list] : {};
    return {
      field: pick(value.field, SORT_OPTIONS[list].map((option) => option.value), defaults.sorts[list].field),
      dir: pick(value.dir, ["asc", "desc"] as const, defaults.sorts[list].dir),
    };
  };
  const contactSort = isRecord(sorts.contacts) ? sorts.contacts : {};

  return {
    density: isDensity(source.density) ? source.density : defaults.density,
    accent: isHexColor(source.accent) ? source.accent.toLowerCase() : null,
    textSize: pick(source.textSize, TEXT_SIZES, defaults.textSize),
    drawer: {
      expanded: bool(drawer.expanded, defaults.drawer.expanded),
      counters: bool(drawer.counters, defaults.drawer.counters),
      clientShortcuts: bool(drawer.clientShortcuts, defaults.drawer.clientShortcuts),
    },
    nav: orderedSet(source.nav, NAV_KEYS, defaults.nav),
    home: pick(source.home, NAV_KEYS, defaults.home),
    columns: Object.fromEntries(
      LIST_KEYS.map((list) => [
        list,
        orderedSet(
          columns[list],
          LIST_COLUMNS[list].columns.map((column) => column.key),
          defaults.columns[list],
        ),
      ]),
    ) as Record<ListKey, OrderedSet>,
    sorts: {
      taches: sortOf("taches"),
      clients: sortOf("clients"),
      contacts: {
        field: pick(contactSort.field, SORT_OPTIONS.contacts.map((option) => option.value), defaults.sorts.contacts.field),
      },
    },
    dashboard: orderedSet(
      source.dashboard,
      DASHBOARD_BLOCKS.map((block) => block.key),
      defaults.dashboard,
    ),
    views: Object.fromEntries(
      VIEW_PAGE_KEYS.map((page) => [
        page,
        pick(views[page], VIEW_OPTIONS[page].options.map((option) => option.value), defaults.views[page]),
      ]),
    ) as Record<ViewPageKey, string>,
  };
}

// ---------------------------------------------------------------------------
// Aides d'affichage
// ---------------------------------------------------------------------------

/** Colonnes visibles d'une liste, dans l'ordre choisi. */
export function visibleColumns(preferences: AdminPreferences, list: ListKey): string[] {
  const { order, hidden } = preferences.columns[list];
  return order.filter((key) => !hidden.includes(key));
}

/** Texte posé sur la couleur d'accent : noir ou blanc selon le contraste
 * (luminance relative WCAG). */
export function accentInkFor(hex: string): string {
  const channel = (index: number) => {
    const value = Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
  // Contraste avec le noir (#1f1f1f ≈ 0.0137) contre le blanc (1).
  const withDark = (luminance + 0.05) / (0.0137 + 0.05);
  const withLight = 1.05 / (luminance + 0.05);
  return withDark >= withLight ? "#1f1f1f" : "#ffffff";
}

/** Variables CSS posées sur la racine de l'admin pour une couleur choisie. */
export function accentStyle(accent: string | null): Record<string, string> | undefined {
  if (!accent) return undefined;
  return { "--color-accent": accent, "--color-accent-ink": accentInkFor(accent) };
}
