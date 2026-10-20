"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Info, Plus } from "@phosphor-icons/react/dist/ssr";
import { ReorderableList } from "@/components/admin/reorderable-list";
import { resetAdminPreferences, saveAdminPreferences } from "@/lib/actions/admin-preferences";
import {
  ACCENT_PRESETS,
  DASHBOARD_BLOCKS,
  DEFAULT_ACCENT,
  DENSITY_OPTIONS,
  LIST_COLUMNS,
  LIST_KEYS,
  NAV_ITEMS,
  SORT_OPTIONS,
  TEXT_SIZE_OPTIONS,
  THEME_OPTIONS,
  VIEW_OPTIONS,
  VIEW_PAGE_KEYS,
  accentInkFor,
  defaultAdminPreferences,
  isHexColor,
  type AdminPreferences,
  type ListKey,
  type NavKey,
  type SortListKey,
  type ThemeChoice,
} from "@/lib/admin-preferences";

// Écran « Mon affichage » (maquette validée le 2026-10-20) : réglages propres
// à l'admin connecté, rangés en onglets comme les paramètres de Gmail, avec un
// aperçu en direct. Rien n'est appliqué avant « Enregistrer ».

const TABS = [
  { key: "apparence", label: "Apparence" },
  { key: "navigation", label: "Navigation" },
  { key: "listes", label: "Listes et colonnes" },
  { key: "tableau", label: "Tableau de bord" },
  { key: "vues", label: "Vues par défaut" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const PRIMARY_COLUMN: Record<ListKey, string> = {
  taches: "Tâche",
  clients: "Nom",
  prospects: "Nom",
  contacts: "Nom",
};

const SELECT =
  "h-9 rounded-lg border border-[var(--color-outline)] bg-surface px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/40";

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-3 border-b border-line py-5 last:border-b-0 md:grid-cols-[14rem_1fr] md:gap-6">
      <div>
        <p className="font-medium text-ink">{title}</p>
        {hint && <p className="mt-1 text-xs leading-relaxed text-ink-muted">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="segmented">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function CheckLine({ checked, onChange, children }: { checked: boolean; onChange: (value: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex min-h-9 cursor-pointer items-center gap-3 text-sm text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[var(--color-ink)]"
      />
      {children}
    </label>
  );
}

/** Aperçu : quelques tâches fictives avec la couleur, la densité et les
 * colonnes choisies. */
function Preview({ preferences }: { preferences: AdminPreferences }) {
  const accent = preferences.accent ?? DEFAULT_ACCENT;
  const rowHeight = DENSITY_OPTIONS.find((option) => option.value === preferences.density)?.rowHeight ?? 32;
  const columns = preferences.columns.taches.order
    .filter((key) => !preferences.columns.taches.hidden.includes(key))
    .slice(0, 3);
  const labels = Object.fromEntries(LIST_COLUMNS.taches.columns.map((column) => [column.key, column.label]));
  const samples: Record<string, string>[] = [
    { tache: "Affiche soirée jazz", client: "Boulangerie M.", echeance: "17/10", evenement: "30/10", statut: "Bloqué", temps: "1h 20", type: "Print", formats: "A3" },
    { tache: "Logo refonte", client: "Studio Lumière", echeance: "20/10", evenement: "04/11", statut: "En cours", temps: "3h 05", type: "Identité", formats: "SVG" },
    { tache: "Flyer menu automne", client: "Café des Arts", echeance: "23/10", evenement: "09/11", statut: "À valider", temps: "45 min", type: "Print", formats: "A5" },
  ];

  return (
    <div
      className="overflow-hidden rounded-2xl border border-line"
      style={{ "--color-accent": accent, "--color-accent-ink": accentInkFor(accent) } as React.CSSProperties}
    >
      <p className="border-b border-line bg-surface-elevated px-4 py-3 text-xs font-medium text-ink-muted">Aperçu en direct</p>
      <div className="flex border-b border-line text-xs text-ink-muted">
        <span className="relative px-4 py-2 font-medium text-ink">
          À traiter
          <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-[3px]" style={{ background: `color-mix(in srgb, ${accent} 82%, #000)` }} />
        </span>
        <span className="px-4 py-2">Nouveau</span>
        <span className="px-4 py-2">En cours</span>
      </div>
      <table className="w-full table-fixed text-[13px]">
        <thead>
          <tr className="border-b border-line text-left text-xs text-ink-muted">
            <th className="w-8" />
            <th className="py-1.5 pr-2 font-medium">Tâche</th>
            {columns.map((key) => (
              <th key={key} className="py-1.5 pr-3 font-medium">
                {labels[key]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {samples.map((sample, index) => (
            <tr
              key={sample.tache}
              className="border-b border-line last:border-b-0"
              style={{
                height: rowHeight,
                background: index === 1 ? `color-mix(in srgb, ${accent} 32%, var(--color-surface))` : undefined,
              }}
            >
              <td className="pl-3">
                <span className={`block h-3.5 w-3.5 rounded-[3px] border-2 ${index === 1 ? "border-ink bg-ink" : "border-ink-muted"}`} />
              </td>
              <td className="truncate pr-2 font-medium text-ink">{sample.tache}</td>
              {columns.map((key) => (
                <td key={key} className="truncate pr-3 text-ink-muted">
                  {sample[key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-accent px-4 text-xs font-medium text-accent-ink">
          <Plus size={14} weight="bold" /> Nouvelle tâche
        </span>
        <span className="text-xs text-ink-muted">bouton principal</span>
      </div>
    </div>
  );
}

export function MonAffichageForm({
  initialPreferences,
  initialTheme,
  email,
}: {
  initialPreferences: AdminPreferences;
  initialTheme: ThemeChoice;
  email: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("apparence");
  const [preferences, setPreferences] = useState(initialPreferences);
  const [theme, setTheme] = useState<ThemeChoice>(initialTheme);
  const [list, setList] = useState<ListKey>("taches");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(preferences) !== JSON.stringify(initialPreferences) || theme !== initialTheme;

  const update = (patch: Partial<AdminPreferences>) => {
    setMessage(null);
    setPreferences((current) => ({ ...current, ...patch }));
  };

  /** Le thème s'applique tout de suite dans ce navigateur, comme le bouton
   * lune/soleil, une fois enregistré. */
  function applyThemeLocally(choice: ThemeChoice) {
    try {
      if (choice === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", choice);
    } catch {
      /* stockage indisponible : le cookie suffit */
    }
    const dark = choice === "dark" || (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  }

  function save() {
    startTransition(async () => {
      const result = await saveAdminPreferences({ preferences, theme });
      if (result.error) {
        setMessage({ tone: "error", text: result.error });
        return;
      }
      applyThemeLocally(theme);
      setMessage({ tone: "ok", text: "Réglages enregistrés." });
      router.refresh();
    });
  }

  function reset() {
    if (!window.confirm("Rétablir tous les réglages d'affichage par défaut ?")) return;
    startTransition(async () => {
      await resetAdminPreferences();
      setPreferences(defaultAdminPreferences());
      setTheme("system");
      applyThemeLocally("system");
      try {
        localStorage.removeItem("admin-drawer-rail");
      } catch {
        /* rien à faire */
      }
      setMessage({ tone: "ok", text: "Réglages par défaut rétablis." });
      router.refresh();
    });
  }

  const customAccent = preferences.accent && !(ACCENT_PRESETS as readonly string[]).includes(preferences.accent);

  return (
    <div>
      <p className="px-4 pt-3 text-sm text-ink-muted sm:px-6 lg:px-8 2xl:px-12">
        Réglages propres à {email} — les autres admins gardent les leurs.
      </p>
      <div
        role="tablist"
        aria-label="Rubriques"
        className="mt-2 flex overflow-x-auto border-b border-line px-2 [scrollbar-width:none] sm:px-4 lg:px-6 2xl:px-10"
      >
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={`relative h-12 shrink-0 px-4 text-sm transition-colors hover:bg-ink/[0.04] ${
              tab === item.key ? "font-medium text-ink" : "text-ink-muted"
            }`}
          >
            {item.label}
            {tab === item.key && (
              <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-[3px] bg-[var(--color-accent-strong)]" />
            )}
          </button>
        ))}
      </div>

      <div className="grid gap-8 px-4 pb-6 sm:px-6 lg:px-8 xl:grid-cols-[minmax(0,1fr)_26rem] 2xl:px-12">
        <div className="min-w-0">
          {tab === "apparence" && (
            <>
              <Row
                title="Couleur d'accent"
                hint="Boutons principaux, sélection, onglet courant. Le texte posé dessus passe en noir ou en blanc selon le contraste."
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  {ACCENT_PRESETS.map((color) => {
                    const selected = (preferences.accent ?? DEFAULT_ACCENT) === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => update({ accent: color === DEFAULT_ACCENT ? null : color })}
                        aria-label={`Couleur ${color}${color === DEFAULT_ACCENT ? " (jaune Mikko)" : ""}`}
                        aria-pressed={selected}
                        className={`flex h-9 w-9 items-center justify-center rounded-full transition-shadow ${
                          selected ? "shadow-[0_0_0_2px_var(--color-surface),0_0_0_4px_var(--color-ink)]" : ""
                        }`}
                        style={{ background: color, color: accentInkFor(color) }}
                      >
                        {selected && <Check size={16} weight="bold" />}
                      </button>
                    );
                  })}
                  <label
                    title="Autre couleur"
                    className={`relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-dashed border-[var(--color-outline)] text-ink-muted ${
                      customAccent ? "shadow-[0_0_0_2px_var(--color-surface),0_0_0_4px_var(--color-ink)]" : ""
                    }`}
                    style={customAccent ? { background: preferences.accent ?? undefined, borderStyle: "solid" } : undefined}
                  >
                    {!customAccent && <Plus size={16} />}
                    <input
                      type="color"
                      aria-label="Choisir une autre couleur"
                      value={preferences.accent ?? DEFAULT_ACCENT}
                      onChange={(event) => isHexColor(event.target.value) && update({ accent: event.target.value.toLowerCase() })}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </label>
                </div>
              </Row>
              <Row title="Thème">
                <Segmented label="Thème" options={THEME_OPTIONS} value={theme} onChange={(value) => { setMessage(null); setTheme(value); }} />
              </Row>
              <Row title="Densité des listes" hint="Hauteur des lignes des tâches, clients, prospects, contacts et notes.">
                <Segmented label="Densité" options={DENSITY_OPTIONS} value={preferences.density} onChange={(density) => update({ density })} />
              </Row>
              <Row title="Taille du texte">
                <Segmented label="Taille du texte" options={TEXT_SIZE_OPTIONS} value={preferences.textSize} onChange={(textSize) => update({ textSize })} />
              </Row>
              <Row title="Tiroir de navigation">
                <CheckLine
                  checked={preferences.drawer.expanded}
                  onChange={(expanded) => update({ drawer: { ...preferences.drawer, expanded } })}
                >
                  Déplié au démarrage (sinon colonne d&apos;icônes)
                </CheckLine>
                <CheckLine
                  checked={preferences.drawer.counters}
                  onChange={(counters) => update({ drawer: { ...preferences.drawer, counters } })}
                >
                  Afficher les compteurs (tâches, relances, publications)
                </CheckLine>
                <CheckLine
                  checked={!preferences.drawer.clientShortcuts}
                  onChange={(hide) => update({ drawer: { ...preferences.drawer, clientShortcuts: !hide } })}
                >
                  Masquer les raccourcis clients sous « Tâches »
                </CheckLine>
              </Row>
            </>
          )}

          {tab === "navigation" && (
            <>
              <Row title="Page d'accueil" hint="Ouverte par le logo et après la connexion.">
                <select
                  value={preferences.home}
                  onChange={(event) => update({ home: event.target.value as NavKey })}
                  className={SELECT}
                  aria-label="Page d'accueil"
                >
                  {NAV_ITEMS.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Row>
              <Row
                title="Rubriques du tiroir"
                hint="Cocher = visible, glisser ⋮⋮ = ordre, à l'intérieur de chaque groupe. Une rubrique masquée reste accessible par son adresse."
              >
                {[null, "Relation client", "Production", "Gestion"].map((group) => {
                  const items = NAV_ITEMS.filter((item) => item.group === group);
                  return (
                    <div key={group ?? "accueil"} className="mb-3">
                      {group && <p className="mb-1 px-2 text-xs font-medium text-ink-muted">{group}</p>}
                      <ReorderableList
                        items={items}
                        order={preferences.nav.order}
                        hidden={preferences.nav.hidden}
                        onChange={(next) =>
                          update({ nav: { order: next.order as NavKey[], hidden: next.hidden as NavKey[] } })
                        }
                      />
                    </div>
                  );
                })}
              </Row>
            </>
          )}

          {tab === "listes" && (
            <>
              <Row title="Liste">
                <select value={list} onChange={(event) => setList(event.target.value as ListKey)} className={SELECT} aria-label="Liste">
                  {LIST_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {LIST_COLUMNS[key].label}
                    </option>
                  ))}
                </select>
              </Row>
              <Row
                title="Colonnes"
                hint="Cocher = colonne visible, glisser ⋮⋮ = ordre. La colonne principale ne peut pas être masquée."
              >
                <ReorderableList
                  items={LIST_COLUMNS[list].columns}
                  order={preferences.columns[list].order}
                  hidden={preferences.columns[list].hidden}
                  lockedLabel={PRIMARY_COLUMN[list]}
                  onChange={(next) => update({ columns: { ...preferences.columns, [list]: next } })}
                />
              </Row>
              {list in SORT_OPTIONS && (
                <Row title="Tri par défaut" hint="Quand la page s'ouvre sans tri choisi.">
                  <SortControls
                    list={list as SortListKey}
                    preferences={preferences}
                    onChange={(sorts) => update({ sorts })}
                  />
                </Row>
              )}
            </>
          )}

          {tab === "tableau" && (
            <Row title="Blocs affichés" hint="Cocher = visible, glisser ⋮⋮ = ordre. Un bloc sans contenu du jour reste masqué.">
              <ReorderableList
                items={DASHBOARD_BLOCKS}
                order={preferences.dashboard.order}
                hidden={preferences.dashboard.hidden}
                onChange={(next) => update({ dashboard: next as AdminPreferences["dashboard"] })}
              />
            </Row>
          )}

          {tab === "vues" &&
            VIEW_PAGE_KEYS.map((page) => (
              <Row key={page} title={VIEW_OPTIONS[page].label} hint="Vue ouverte en arrivant sur la page.">
                <Segmented
                  label={`Vue par défaut — ${VIEW_OPTIONS[page].label}`}
                  options={VIEW_OPTIONS[page].options}
                  value={preferences.views[page]}
                  onChange={(value) => update({ views: { ...preferences.views, [page]: value } })}
                />
              </Row>
            ))}

          <div className="mt-4 flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-ink">
            <Info size={18} weight="fill" className="mt-0.5 shrink-0 text-amber-600" />
            <p>
              <strong>Masquer n&apos;est pas interdire.</strong> Ces réglages changent ce que <em>vous</em> voyez.
              Ils n&apos;empêchent pas un autre admin d&apos;ouvrir une rubrique ou une colonne : pour réserver les
              factures à un seul admin, il faudrait des droits d&apos;accès, un chantier distinct.
            </p>
          </div>
        </div>

        <aside className="xl:sticky xl:top-4 xl:mt-5 xl:self-start">
          <Preview preferences={preferences} />
        </aside>
      </div>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface px-4 py-3 sm:px-6 lg:rounded-b-2xl lg:px-8 2xl:px-12">
        {message && (
          <p role="status" className={`mr-auto text-sm ${message.tone === "error" ? "text-danger" : "text-ink-muted"}`}>
            {message.text}
          </p>
        )}
        <button
          type="button"
          onClick={reset}
          disabled={pending}
          className="h-10 rounded-full px-4 text-sm font-medium text-ink-muted transition-colors hover:bg-ink/[0.06] hover:text-ink disabled:opacity-50"
        >
          Rétablir les réglages par défaut
        </button>
        <button
          type="button"
          onClick={() => {
            setPreferences(initialPreferences);
            setTheme(initialTheme);
            setMessage(null);
          }}
          disabled={!dirty || pending}
          className="h-10 rounded-full px-4 text-sm font-medium text-ink-muted transition-colors hover:bg-ink/[0.06] hover:text-ink disabled:opacity-40"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || pending}
          className="h-10 rounded-full bg-accent px-6 text-sm font-medium text-accent-ink disabled:opacity-50"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}

function SortControls({
  list,
  preferences,
  onChange,
}: {
  list: SortListKey;
  preferences: AdminPreferences;
  onChange: (sorts: AdminPreferences["sorts"]) => void;
}) {
  const current = preferences.sorts[list];
  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={current.field}
        onChange={(event) => onChange({ ...preferences.sorts, [list]: { ...current, field: event.target.value } })}
        className={SELECT}
        aria-label="Champ de tri"
      >
        {SORT_OPTIONS[list].map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {"dir" in current && (
        <select
          value={current.dir}
          onChange={(event) =>
            onChange({ ...preferences.sorts, [list]: { ...current, dir: event.target.value as "asc" | "desc" } })
          }
          className={SELECT}
          aria-label="Sens du tri"
        >
          <option value="asc">Croissant</option>
          <option value="desc">Décroissant</option>
        </select>
      )}
    </div>
  );
}
