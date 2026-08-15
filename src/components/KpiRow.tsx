"use client";

import { compactIdr, compactNumber, fullIdr, fullNumber, percent } from "@/lib/format";
import type { Kpi } from "@/lib/types";

interface Tile {
  label: string;
  value: string;
  /** Full-precision value, shown on hover and to screen readers. */
  title?: string;
  detail?: string;
  hero?: boolean;
}

function StatTile({ tile }: { tile: Tile }) {
  return (
    <div
      className={`card flex flex-col justify-between p-4 ${
        tile.hero ? "sm:col-span-2 sm:row-span-1" : ""
      }`}
      title={tile.title}
    >
      <p className="mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
        {tile.label}
      </p>
      <p
        className={`mt-2 font-semibold tracking-tight text-[var(--text-primary)] ${
          tile.hero ? "text-3xl sm:text-4xl" : "text-xl"
        }`}
      >
        {tile.value}
      </p>
      {tile.detail ? (
        <p className="mt-1.5 text-[11px] leading-snug text-[var(--text-secondary)]">{tile.detail}</p>
      ) : null}
    </div>
  );
}

export function KpiRow({ kpi }: { kpi: Kpi }) {
  const tiles: Tile[] = [
    {
      label: "Estimated lifetime revenue",
      value: compactIdr(kpi.estimatedRevenue),
      title: fullIdr(kpi.estimatedRevenue),
      detail: `${fullNumber(kpi.unitsSold)} units across ${kpi.productCount} listings`,
      hero: true,
    },
    {
      label: "Monthly run rate",
      value: compactIdr(kpi.estimatedMonthlyRevenue),
      title: fullIdr(kpi.estimatedMonthlyRevenue),
      detail: `${compactNumber(kpi.unitsSoldRecent)} units / 30 days`,
    },
    {
      label: "Average order value",
      value: compactIdr(kpi.averageOrderValue),
      title: fullIdr(kpi.averageOrderValue),
      detail: `Median listing ${compactIdr(kpi.medianPrice)}`,
    },
    {
      label: "Active listings",
      value: fullNumber(kpi.activeProductCount),
      detail: `${percent(kpi.deadStockRate)} with no recorded sales`,
    },
    {
      label: "Top-10 concentration",
      value: percent(kpi.top10Concentration),
      detail: "Share of revenue in the ten biggest listings",
    },
    {
      label: "Store rating",
      value: kpi.rating ? kpi.rating.toFixed(2) : "—",
      detail: kpi.ratingCount ? `${compactNumber(kpi.ratingCount)} ratings` : "Not published",
    },
    {
      label: "Followers",
      value: kpi.followers ? compactNumber(kpi.followers) : "—",
      detail: kpi.followers ? fullNumber(kpi.followers) : "Not published",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((t) => (
        <StatTile key={t.label} tile={t} />
      ))}
    </div>
  );
}
