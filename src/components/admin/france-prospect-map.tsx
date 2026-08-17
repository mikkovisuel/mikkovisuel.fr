"use client";

import { useState } from "react";
import type { RegionStat } from "@/lib/prospects";
import { FRANCE_REGION_GEOMETRY, FRANCE_MAP_VIEWBOX } from "@/lib/france-map-geometry";
import { PALETTE_SWATCH_CLASSES, type PaletteColor } from "@/lib/dropdown-lists";

function bubbleRadius(total: number): number {
  if (total === 0) return 4;
  return Math.min(34, 8 + Math.sqrt(total) * 5.5);
}

// Carte de France par bulles (demande du 2026-08-17) : une bulle par région,
// dimensionnée selon le nombre de prospects (régions devinées depuis la
// ville, voir src/lib/france-regions.ts — approximatif par choix explicite,
// pas de champ région à saisir en plus). Tracé des régions = vraie
// géométrie (src/lib/france-map-geometry.ts), pas un schéma dessiné à la
// main : un premier essai en silhouette stylisée a été jugé "ne ressemble
// à rien" par le client, corrigé en régénérant les contours depuis un vrai
// GeoJSON. Survol/tap = infobulle avec le détail par statut ; les 13
// régions restent visibles même à 0 prospect (petit point discret), pour
// que la carte reste "toutes les régions définies", pas seulement celles
// qui ont déjà des prospects.
export function FranceProspectMap({ regions }: { regions: RegionStat[] }) {
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);

  const statsBySlug = new Map(regions.map((region) => [region.slug, region]));
  const hoveredGeometry = FRANCE_REGION_GEOMETRY.find((region) => region.slug === hoveredSlug) ?? null;
  const hoveredStats = hoveredSlug ? statsBySlug.get(hoveredSlug) : undefined;

  return (
    <div className="rounded-2xl border border-line p-5">
      <div className="relative mx-auto max-w-md">
        <svg
          viewBox={`0 0 ${FRANCE_MAP_VIEWBOX.width} ${FRANCE_MAP_VIEWBOX.height}`}
          className="w-full h-auto"
          role="img"
          aria-label="Carte de France du nombre de prospects par région"
        >
          {FRANCE_REGION_GEOMETRY.map((geometry) => {
            const isHovered = hoveredSlug === geometry.slug;
            return (
              <path
                key={geometry.slug}
                d={geometry.path}
                onMouseEnter={() => setHoveredSlug(geometry.slug)}
                onMouseLeave={() => setHoveredSlug((current) => (current === geometry.slug ? null : current))}
                onClick={() => setHoveredSlug((current) => (current === geometry.slug ? null : geometry.slug))}
                className={
                  isHovered
                    ? "cursor-pointer fill-accent/10 stroke-accent"
                    : "cursor-pointer fill-surface-elevated stroke-line"
                }
                strokeWidth={isHovered ? 1.5 : 1}
              />
            );
          })}
          {FRANCE_REGION_GEOMETRY.map((geometry) => {
            const stats = statsBySlug.get(geometry.slug);
            const total = stats?.total ?? 0;
            const radius = bubbleRadius(total);
            const isHovered = hoveredSlug === geometry.slug;
            return (
              <g
                key={`bubble-${geometry.slug}`}
                onMouseEnter={() => setHoveredSlug(geometry.slug)}
                onMouseLeave={() => setHoveredSlug((current) => (current === geometry.slug ? null : current))}
                onClick={() => setHoveredSlug((current) => (current === geometry.slug ? null : geometry.slug))}
                className="cursor-pointer"
              >
                <circle
                  cx={geometry.cx}
                  cy={geometry.cy}
                  r={radius}
                  className={total === 0 ? "fill-ink-muted/25" : isHovered ? "fill-accent" : "fill-accent/75"}
                  stroke="var(--color-surface)"
                  strokeWidth={1.5}
                />
                {total > 0 && (
                  <text
                    x={geometry.cx}
                    y={geometry.cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="pointer-events-none select-none fill-accent-ink text-[13px] font-medium"
                  >
                    {total}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {hoveredGeometry && hoveredStats && (
          <div
            className="pointer-events-none absolute z-10 w-56 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-xl border border-line bg-surface-elevated p-3 text-xs shadow-lg"
            style={{
              left: `${(hoveredGeometry.cx / FRANCE_MAP_VIEWBOX.width) * 100}%`,
              top: `${(hoveredGeometry.cy / FRANCE_MAP_VIEWBOX.height) * 100}%`,
            }}
          >
            <p className="font-medium text-ink">{hoveredGeometry.label}</p>
            <p className="mt-0.5 text-ink-muted">
              {hoveredStats.total} prospect{hoveredStats.total > 1 ? "s" : ""}
            </p>
            {hoveredStats.byStatus.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1">
                {hoveredStats.byStatus.map((status) => (
                  <li key={status.slug} className="flex items-center justify-between gap-2 text-ink-muted">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          PALETTE_SWATCH_CLASSES[status.color as PaletteColor] ?? PALETTE_SWATCH_CLASSES.slate
                        }`}
                      />
                      {status.label}
                    </span>
                    <span className="font-medium text-ink">{status.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      <p className="mt-3 text-center text-xs text-ink-muted">
        Région devinée depuis la ville renseignée — approximatif, une ville non reconnue
        n&apos;apparaît pas sur la carte.
      </p>
    </div>
  );
}
