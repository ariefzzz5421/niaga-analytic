"use client";

import { ExternalLink, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type ViewMode = "share" | "gmv";
type MarketId = "shopee" | "tiktok-tokopedia" | "lazada" | "blibli";
type MarketRow = { id: MarketId; label: string; share: number; gmv: number; accent: string };

const MARKET: MarketRow[] = [
  { id: "shopee", label: "Shopee", share: 54, gmv: 31.16, accent: "#ee4d2d" },
  { id: "tiktok-tokopedia", label: "TikTok Shop + Tokopedia", share: 38, gmv: 21.93, accent: "#20c875" },
  { id: "lazada", label: "Lazada", share: 6, gmv: 3.46, accent: "#4854d8" },
  { id: "blibli", label: "Blibli", share: 3, gmv: 1.73, accent: "#159bd7" },
];

const LOGO: Partial<Record<MarketId, string>> = {
  shopee: "/marketplaces/shopee.svg",
  lazada: "https://www.lazada.co.id/favicon.ico",
  blibli: "https://www.blibli.com/favicon.ico",
};

function Logo({ id, label }: { id: MarketId; label: string }) {
  if (id === "tiktok-tokopedia") {
    return (
      <span className="flex items-center -space-x-1.5" aria-label="TikTok Shop and Tokopedia logos">
        <span className="grid size-9 place-items-center overflow-hidden rounded-xl bg-black p-1.5 ring-2 ring-[var(--surface-1)]">
          <img src="/marketplaces/tiktok.png" alt="TikTok Shop" className="size-full object-contain" />
        </span>
        <span className="grid size-9 place-items-center overflow-hidden rounded-xl bg-white p-1 ring-2 ring-[var(--surface-1)]">
          <img src="/marketplaces/tokopedia-icon.png" alt="Tokopedia" className="size-full object-contain" />
        </span>
      </span>
    );
  }
  return (
    <span className="grid size-10 place-items-center overflow-hidden rounded-xl bg-white p-1.5">
      <img src={LOGO[id]} alt={`${label} logo`} className="size-full object-contain" />
    </span>
  );
}

export function MarketOverview() {
  const [mode, setMode] = useState<ViewMode>("share");
  const [selected, setSelected] = useState<MarketId>("shopee");
  const active = useMemo(() => MARKET.find((row) => row.id === selected) ?? MARKET[0], [selected]);
  const maxGmv = MARKET[0].gmv;

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]">
      <div className="border-b border-[var(--border)] p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]"><TrendingUp className="size-3.5" />Indonesia market snapshot · 2025</div>
            <h2 className="mt-2 text-lg font-semibold sm:text-xl">Platform GMV share</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--text-secondary)]">Momentum Works&apos; Ecommerce in Southeast Asia 2026 estimate. TikTok Shop and Tokopedia are reported as one combined group, so their 38% must not be read as 38% each.</p>
          </div>
          <div className="inline-flex w-fit rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-1">
            <button type="button" onClick={() => setMode("share")} className={`rounded-lg px-3 py-2 text-[11px] font-medium ${mode === "share" ? "bg-[var(--surface-3)] text-white" : "text-[var(--text-muted)]"}`}>Share %</button>
            <button type="button" onClick={() => setMode("gmv")} className={`rounded-lg px-3 py-2 text-[11px] font-medium ${mode === "gmv" ? "bg-[var(--surface-3)] text-white" : "text-[var(--text-muted)]"}`}>GMV US$B</button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-[var(--surface-2)] p-3"><p className="text-[9px] uppercase tracking-wide text-[var(--text-muted)]">Indonesia GMV</p><p className="mt-1 text-base font-semibold sm:text-lg">US$57.7B</p></div>
          <div className="rounded-xl bg-[var(--surface-2)] p-3"><p className="text-[9px] uppercase tracking-wide text-[var(--text-muted)]">SEA share</p><p className="mt-1 text-base font-semibold sm:text-lg">36.6%</p></div>
          <div className="rounded-xl bg-[var(--surface-2)] p-3"><p className="text-[9px] uppercase tracking-wide text-[var(--text-muted)]">#1 platform</p><p className="mt-1 text-base font-semibold sm:text-lg">Shopee 54%</p></div>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.08fr_.92fr]">
        <div className="space-y-2 p-4 sm:p-5">
          {MARKET.map((row) => {
            const width = mode === "share" ? row.share : (row.gmv / maxGmv) * 100;
            const value = mode === "share" ? `${row.share}%` : `US$${row.gmv.toFixed(2)}B`;
            return (
              <button key={row.id} type="button" onClick={() => setSelected(row.id)} className={`w-full rounded-xl border p-3 text-left transition ${selected === row.id ? "border-[var(--border-strong)] bg-[var(--surface-2)]" : "border-transparent hover:bg-[var(--surface-2)]"}`}>
                <div className="flex items-center gap-3">
                  <Logo id={row.id} label={row.label} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3"><span className="truncate text-xs font-medium sm:text-sm">{row.label}</span><span className="shrink-0 text-sm font-semibold tabular-nums">{value}</span></div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-3)]"><div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.max(3, width)}%`, background: row.accent }} /></div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <aside className="border-t border-[var(--border)] bg-[var(--surface-2)] p-4 sm:p-5 lg:border-l lg:border-t-0">
          <div className="relative mx-auto h-[230px] max-w-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={MARKET} dataKey="share" nameKey="label" innerRadius={62} outerRadius={91} paddingAngle={2} stroke="none">
                  {MARKET.map((row) => <Cell key={row.id} fill={row.accent} opacity={selected === row.id ? 1 : 0.52} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#111216", border: "1px solid #2a2c33", borderRadius: 12, fontSize: 12 }} itemStyle={{ color: "#fff" }} formatter={(value) => [`${value}%`, "GMV share"]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><p className="text-[9px] uppercase tracking-[0.14em] text-[var(--text-muted)]">Indonesia GMV</p><p className="mt-1 text-xl font-semibold">US$57.7B</p><p className="text-[10px] text-[var(--text-muted)]">2025</p></div></div>
          </div>

          <div className="mt-1 flex items-center gap-3"><Logo id={active.id} label={active.label} /><div><p className="text-xs font-semibold">{active.label}</p><p className="text-[10px] text-[var(--text-muted)]">Indonesia 2025 estimate</p></div></div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-[var(--surface-1)] p-3"><p className="text-[9px] uppercase tracking-wide text-[var(--text-muted)]">GMV share</p><p className="mt-1 text-xl font-semibold">{active.share}%</p></div>
            <div className="rounded-xl bg-[var(--surface-1)] p-3"><p className="text-[9px] uppercase tracking-wide text-[var(--text-muted)]">Est. GMV</p><p className="mt-1 text-xl font-semibold">US${active.gmv.toFixed(2)}B</p></div>
          </div>
          <p className="mt-4 text-[10px] leading-relaxed text-[var(--text-muted)]">Indonesia represented about 36.6% of Southeast Asia&apos;s US$157.6B platform ecommerce GMV in 2025. Published platform percentages are rounded, so the displayed shares total 101%.</p>
          <a href="https://thelowdown.momentum.asia/new-report-southeast-asias-platform-ecommerce-reaches-us157-6b-in-2025-with-top-platforms-expanding-share-to-98-8/" target="_blank" rel="noreferrer noopener" className="mt-4 inline-flex min-h-10 items-center gap-1.5 text-[11px] font-medium text-[var(--text-secondary)] hover:text-white">Momentum Works source <ExternalLink className="size-3" /></a>
        </aside>
      </div>
    </section>
  );
}
