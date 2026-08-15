"use client";

import { Loader2, Plus, Swords, X } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { compactIdr, compactNumber, fullIdr, fullNumber, percent, truncate } from "@/lib/format";
import { tryParseStoreUrl } from "@/lib/platform";
import type { StoreAnalysis } from "@/lib/types";

import { ChartFrame, SingleLineTick, TooltipCard } from "./charts/ChartFrame";
import { PlatformBadge } from "./ui";

interface CompareRow {
  url: string;
  ok: boolean;
  analysis?: StoreAnalysis;
  error?: string;
}

/**
 * Four validated categorical slots, assigned by position in the compare list.
 * Colour follows the store, not its rank — removing a store never repaints
 * the survivors, because each row keeps the slot it was added with.
 */
const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)"];

export function CompareBoard() {
  const [urls, setUrls] = useState<string[]>(["", ""]);
  const [rows, setRows] = useState<CompareRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filled = urls.map((u) => u.trim()).filter(Boolean);
  const canRun = filled.length >= 2 && !loading;

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ urls: filled }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setRows(body.rows as CompareRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed.");
    } finally {
      setLoading(false);
    }
  }

  const ok = (rows ?? []).filter((r) => r.ok && r.analysis);
  const chartData = ok.map((r, i) => ({
    name: truncate(r.analysis!.store.name, 18),
    fullName: r.analysis!.store.name,
    platform: r.analysis!.store.platform,
    revenue: r.analysis!.kpi.estimatedRevenue,
    monthly: r.analysis!.kpi.estimatedMonthlyRevenue,
    units: r.analysis!.kpi.unitsSold,
    aov: r.analysis!.kpi.averageOrderValue,
    products: r.analysis!.kpi.productCount,
    color: SERIES[i % SERIES.length],
  }));

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Swords className="size-4 text-[var(--text-secondary)]" aria-hidden />
          <h3 className="text-sm font-semibold tracking-tight">Head-to-head</h3>
          <span className="text-xs text-[var(--text-secondary)]">
            Compare up to four stores across any mix of marketplaces.
          </span>
        </div>

        <div className="space-y-2">
          {urls.map((url, i) => {
            const detected = url.trim() ? tryParseStoreUrl(url) : null;
            return (
              <div key={i} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{ background: SERIES[i % SERIES.length] }}
                />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrls((u) => u.map((v, j) => (j === i ? e.target.value : v)))}
                  placeholder={`Store ${i + 1} URL`}
                  aria-label={`Store ${i + 1} URL`}
                  spellCheck={false}
                  className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
                />
                {detected ? <PlatformBadge platform={detected.platform} size="sm" /> : null}
                {urls.length > 2 ? (
                  <button
                    type="button"
                    onClick={() => setUrls((u) => u.filter((_, j) => j !== i))}
                    aria-label={`Remove store ${i + 1}`}
                    className="rounded-md p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-2">
          {urls.length < 4 ? (
            <button
              type="button"
              onClick={() => setUrls((u) => [...u, ""])}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            >
              <Plus className="size-3.5" aria-hidden />
              Add store
            </button>
          ) : null}

          <button
            type="button"
            onClick={run}
            disabled={!canRun}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
            {loading ? "Comparing…" : "Compare"}
          </button>
        </div>

        {error ? <p className="mt-3 text-xs text-[var(--critical)]">{error}</p> : null}
      </div>

      {rows?.some((r) => !r.ok) ? (
        <ul className="space-y-1">
          {rows
            .filter((r) => !r.ok)
            .map((r) => (
              <li key={r.url} className="text-xs text-[var(--critical)]">
                {r.url}: {r.error}
              </li>
            ))}
        </ul>
      ) : null}

      {chartData.length >= 2 ? (
        <>
          <ChartFrame
            title="Estimated lifetime revenue by store"
            subtitle="Every bar is directly labelled — colour is identity only, not the reading."
            columns={["Store", "Lifetime revenue", "Monthly", "Units", "AOV"]}
            rows={chartData.map((d) => [
              d.fullName,
              fullIdr(d.revenue),
              fullIdr(d.monthly),
              fullNumber(d.units),
              fullIdr(d.aov),
            ])}
            height={Math.max(240, chartData.length * 56 + 40)}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 4, right: 88, bottom: 4, left: 4 }}
                barCategoryGap={12}
              >
                <CartesianGrid strokeDasharray="0" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v: number) => compactIdr(v)}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={150}
                  tickLine={false}
                  axisLine={false}
                  tick={<SingleLineTick />}
                  interval={0}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as (typeof chartData)[number];
                    return (
                      <TooltipCard
                        label={d.fullName}
                        rows={[
                          { key: "Lifetime revenue", value: fullIdr(d.revenue), color: d.color },
                          { key: "Monthly run rate", value: fullIdr(d.monthly) },
                          { key: "Units sold", value: fullNumber(d.units) },
                          { key: "AOV", value: fullIdr(d.aov) },
                          { key: "Listings", value: String(d.products) },
                        ]}
                      />
                    );
                  }}
                />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]} maxBarSize={40} isAnimationActive={false}>
                  {chartData.map((d) => (
                    <Cell key={d.fullName} fill={d.color} stroke="var(--surface-1)" strokeWidth={2} />
                  ))}
                  <LabelList
                    dataKey="revenue"
                    position="right"
                    formatter={(v: React.ReactNode) => compactIdr(Number(v))}
                    style={{ fill: "var(--text-secondary)", fontSize: 11 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>

          <div className="card overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                  <th scope="col" className="px-4 py-2.5 font-medium text-[var(--text-secondary)]">
                    Store
                  </th>
                  {["Lifetime revenue", "Monthly", "Units", "AOV", "Listings", "Top-10 share"].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2.5 text-right font-medium text-[var(--text-secondary)]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ok.map((r, i) => {
                  const a = r.analysis!;
                  return (
                    <tr key={r.url} className="border-b border-[var(--border)]">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            aria-hidden
                            className="size-2.5 shrink-0 rounded-sm"
                            style={{ background: SERIES[i % SERIES.length] }}
                          />
                          <span className="text-[var(--text-primary)]">{a.store.name}</span>
                          <PlatformBadge platform={a.store.platform} size="sm" />
                          {a.sample ? (
                            <span className="text-[10px] text-[var(--warning)]">sample</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="tabular px-3 py-2.5 text-right">{compactIdr(a.kpi.estimatedRevenue)}</td>
                      <td className="tabular px-3 py-2.5 text-right">{compactIdr(a.kpi.estimatedMonthlyRevenue)}</td>
                      <td className="tabular px-3 py-2.5 text-right">{compactNumber(a.kpi.unitsSold)}</td>
                      <td className="tabular px-3 py-2.5 text-right">{compactIdr(a.kpi.averageOrderValue)}</td>
                      <td className="tabular px-3 py-2.5 text-right">{a.kpi.productCount}</td>
                      <td className="tabular px-3 py-2.5 text-right">{percent(a.kpi.top10Concentration)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
