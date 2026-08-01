import { CheckCircle, WarningCircle, WarningOctagon } from "@phosphor-icons/react/dist/ssr";

// Palette de statut validée (skill dataviz, palette.md) : good/warning/critical,
// mêmes teintes en clair et en sombre (contraste vérifié sur les deux
// surfaces) — partagée par tous les graphiques du Planning plutôt que
// redéfinie à chaque composant.
export type ChartStatus = "good" | "warning" | "critical";

export const STATUS_VARS = {
  "--status-good": "#0ca30c",
  "--status-warning": "#fab219",
  "--status-critical": "#d03b3b",
} as React.CSSProperties;

export const STATUS_BAR: Record<ChartStatus, string> = {
  good: "bg-(--status-good)",
  warning: "bg-(--status-warning)",
  critical: "bg-(--status-critical)",
};

export const STATUS_TEXT: Record<ChartStatus, string> = {
  good: "text-(--status-good)",
  warning: "text-(--status-warning)",
  critical: "text-(--status-critical)",
};

export const STATUS_ICON: Record<ChartStatus, React.ReactNode> = {
  good: <CheckCircle size={13} weight="fill" />,
  warning: <WarningCircle size={13} weight="fill" />,
  critical: <WarningOctagon size={13} weight="fill" />,
};
