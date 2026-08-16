"use client";

import { BadgeCheck, Clock, Database, MapPin, RefreshCw, TriangleAlert } from "lucide-react";

import { relativeTime } from "@/lib/format";
import type { DataSource, StoreAnalysis } from "@/lib/types";

import { CategoryChart, PriceBandChart } from "./charts/DistributionCharts";
import { RevenueTrend } from "./charts/RevenueTrend";
import { TopProducts } from "./charts/TopProducts";
import { ConfidencePanel, InsightList } from "./Insights";
import { KpiRow } from "./KpiRow";
import { ProductTable } from "./ProductTable";
import { PlatformBadge, Pill } from "./ui";

const SOURCE_LABEL: Record<DataSource, string> = {
  "official-api": "Official partner API",
  "internal-api": "Live storefront API",
  html: "Rendered page",
  provider: "Scraping provider",
  sample: "Sample data",
};

function SampleBanner() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[color:var(--warning)]/35 bg-[color:var(--warning)]/8 p-4">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[var(--warning)]" aria-hidden />
      <div className="text-xs leading-relaxed">
        <p className="font-medium text-[var(--text-primary)]">
          Sample data — these are not this store&apos;s real numbers.
        </p>
        <p className="mt-1 text-[var(--text-secondary)]">
          No live route was reachable, so the dashboard is showing a deterministic mock catalogue
          seeded from the store handle. Add a scraping provider key or TikTok Shop credentials
          (see <code className="mono rounded bg-[var(--surface-2)] px-1">.env.example</code>) to pull
          real figures.
        </p>
      </div>
    </div>
  );
}

export function Dashboard({
  analysis,
  onRefresh,
}: {
  analysis: StoreAnalysis;
  onRefresh?: () => void;
}) {
  const { store, kpi } = analysis;

  return (
    <div className="animate-fade-up space-y-4">
      {analysis.sample ? <SampleBanner /> : null}

      {/* Store header */}
      <header className="card flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="flex min-w-0 items-start gap-4">
          {store.avatarUrl ? (
            // Marketplace CDNs rate-limit the Next image optimiser, so these
            // stay plain <img> tags.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={store.avatarUrl}
              alt=""
              className="size-12 shrink-0 rounded-xl border border-[var(--border)] object-cover"
            />
          ) : (
            <div className="grid size-12 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-lg font-semibold text-[var(--text-secondary)]">
              {store.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-semibold tracking-tight">{store.name}</h2>
              <PlatformBadge platform={store.platform} size="sm" />
              {store.isOfficial ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--series-1)]">
                  <BadgeCheck className="size-3.5" aria-hidden />
                  Official
                </span>
              ) : null}
            </div>

            <a
              href={store.url}
              target="_blank"
              rel="noreferrer noopener"
              className="mono mt-1 block truncate text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)]"
            >
              {store.url}
            </a>

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <Pill tone={analysis.sample ? "warning" : "accent"}>
                <Database className="size-3" aria-hidden />
                {SOURCE_LABEL[analysis.source]}
              </Pill>
              <Pill>
                <Clock className="size-3" aria-hidden />
                {(analysis.durationMs / 1000).toFixed(1)}s · {relativeTime(analysis.fetchedAt)}
              </Pill>
              {store.location ? (
                <Pill>
                  <MapPin className="size-3" aria-hidden />
                  {store.location}
                </Pill>
              ) : null}
              {store.ageMonths ? <Pill>{store.ageMonths} months on platform</Pill> : null}
            </div>
          </div>
        </div>

        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            Re-scrape
          </button>
        ) : null}
      </header>

      <KpiRow kpi={kpi} />

      <RevenueTrend data={analysis.timeline} />

      {/*
        Two stacked columns rather than a grid of single cards. Card heights
        vary a lot (a 12-bar chart against a 4-bar one), so a plain two-column
        grid leaves a hole under whichever card is shorter. Stacking several
        cards per column lets the two sides even out instead.
      */}
      <div className="grid items-start gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <TopProducts products={analysis.products} limit={12} />
          <InsightList insights={analysis.insights} />
        </div>

        <div className="space-y-4 lg:col-span-5">
          <PriceBandChart buckets={analysis.priceBands} />
          {analysis.categories.length > 1 ? <CategoryChart buckets={analysis.categories} /> : null}
          <ConfidencePanel confidence={analysis.confidence} log={analysis.log} />
        </div>
      </div>

      <ProductTable products={analysis.products} storeName={store.name} />
    </div>
  );
}
