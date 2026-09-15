"use client";

import { ExternalLink, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TOP10_ECOMMERCE_TRAFFIC, TOP10_TRAFFIC_TOTAL_M, TOP4_TRAFFIC_SHARE, type TrafficSite } from "@/data/ecommerceTraffic";

type ViewMode = "share" | "gmv";
type TrafficMode = "traffic" | "share";
type MarketId = "shopee" | "tiktok-tokopedia" | "lazada" | "blibli";
type MarketMember = { id: string; label: string; logo: string; dark?: boolean };
type MarketRow = { id: MarketId; label: string; share: number; gmv: number; accent: string; members: MarketMember[] };

const MARKET: MarketRow[] = [
  { id: "shopee", label: "Shopee", share: 54, gmv: 31.16, accent: "#ee4d2d", members: [{ id: "shopee", label: "Shopee", logo: "/marketplaces/shopee.svg" }] },
  { id: "tiktok-tokopedia", label: "TikTok Shop + Tokopedia", share: 38, gmv: 21.93, accent: "#20c875", members: [{ id: "tiktok", label: "TikTok Shop", logo: "/marketplaces/tiktok.png", dark: true }, { id: "tokopedia", label: "Tokopedia", logo: "/marketplaces/tokopedia-icon.png" }] },
  { id: "lazada", label: "Lazada", share: 6, gmv: 3.46, accent: "#4854d8", members: [{ id: "lazada", label: "Lazada", logo: "https://www.lazada.co.id/favicon.ico" }] },
  { id: "blibli", label: "Blibli", share: 3, gmv: 1.73, accent: "#159bd7", members: [{ id: "blibli", label: "Blibli", logo: "https://www.blibli.com/favicon.ico" }] },
];

const GMV_PLATFORM_CHIPS: Array<MarketMember & { context: string; group: MarketId }> = [
  { id: "shopee", label: "Shopee", logo: "/marketplaces/shopee.svg", context: "54%", group: "shopee" },
  { id: "tiktok", label: "TikTok Shop", logo: "/marketplaces/tiktok.png", dark: true, context: "combined 38%", group: "tiktok-tokopedia" },
  { id: "tokopedia", label: "Tokopedia", logo: "/marketplaces/tokopedia-icon.png", context: "combined 38%", group: "tiktok-tokopedia" },
  { id: "lazada", label: "Lazada", logo: "https://www.lazada.co.id/favicon.ico", context: "6%", group: "lazada" },
  { id: "blibli", label: "Blibli", logo: "https://www.blibli.com/favicon.ico", context: "3%", group: "blibli" },
];

function MemberIcon({ member, compact = false }: { member: MarketMember; compact?: boolean }) {
  const size = compact ? "size-7" : "size-9";
  return (
    <span className={`${size} grid shrink-0 place-items-center overflow-hidden rounded-xl ${member.dark ? "bg-black" : "bg-white"} p-1 ring-1 ring-[var(--border)]`}>
      <img src={member.logo} alt={`${member.label} logo`} className="size-full object-contain" />
    </span>
  );
}

function Logo({ row, compact = false }: { row: MarketRow; compact?: boolean }) {
  if (row.members.length === 1) return <MemberIcon member={row.members[0]} compact={compact} />;
  return (
    <span className="flex items-center -space-x-1.5" aria-label={`${row.label} logos`}>
      {row.members.map((member) => <span key={member.id} className="ring-2 ring-[var(--surface-1)] rounded-xl"><MemberIcon member={member} compact={compact} /></span>)}
    </span>
  );
}

function TrafficLogo({ site, compact = false }: { site: TrafficSite; compact?: boolean }) {
  const box = compact ? "size-7" : "size-10";
  const initials = site.label.slice(0, 2).toUpperCase();
  return (
    <span className={`${box} relative grid shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-1`}>
      <span className="absolute inset-0 grid place-items-center text-[9px] font-bold text-black/60">{initials}</span>
      <img src={site.logo} alt={`${site.label} logo`} className="relative z-10 size-full object-contain" onError={(event) => { event.currentTarget.style.display = "none"; }} />
    </span>
  );
}

export function MarketOverview() {
  const [mode, setMode] = useState<ViewMode>("share");
  const [selected, setSelected] = useState<MarketId>("shopee");
  const [trafficMode, setTrafficMode] = useState<TrafficMode>("traffic");
  const [selectedTrafficId, setSelectedTrafficId] = useState("shopee");

  const active = useMemo(() => MARKET.find((row) => row.id === selected) ?? MARKET[0], [selected]);
  const activeTraffic = useMemo(() => TOP10_ECOMMERCE_TRAFFIC.find((site) => site.id === selectedTrafficId) ?? TOP10_ECOMMERCE_TRAFFIC[0], [selectedTrafficId]);
  const maxGmv = MARKET[0].gmv;
  const maxTraffic = TOP10_ECOMMERCE_TRAFFIC[0].trafficM;

  const selectByIndex = (index: number) => {
    const row = MARKET[index];
    if (row) setSelected(row.id);
  };

  return (
    <div className="mt-6 space-y-6">
      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]">
        <div className="border-b border-[var(--border)] p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]"><TrendingUp className="size-3.5" />Indonesia E-Commerce market snapshot · 2025</div>
              <h2 className="mt-2 text-lg font-semibold sm:text-xl">Platform GMV share</h2>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--text-secondary)]">Momentum Works&apos; Ecommerce in Southeast Asia 2026 estimate. TikTok Shop and Tokopedia are reported as one combined group, so their 38% must not be read as 38% each.</p>
            </div>
            <div className="inline-flex w-fit rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-1">
              <button type="button" onClick={() => setMode("share")} className={`rounded-lg px-3 py-2 text-[11px] font-medium ${mode === "share" ? "bg-[var(--surface-3)] text-white" : "text-[var(--text-muted)]"}`}>Share %</button>
              <button type="button" onClick={() => setMode("gmv")} className={`rounded-lg px-3 py-2 text-[11px] font-medium ${mode === "gmv" ? "bg-[var(--surface-3)] text-white" : "text-[var(--text-muted)]"}`}>GMV US$B</button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-xl bg-[var(--surface-2)] p-3"><p className="text-[9px] uppercase tracking-wide text-[var(--text-muted)]">Indonesia GMV</p><p className="mt-1 text-base font-semibold sm:text-lg">US$57.7B</p></div>
            <div className="rounded-xl bg-[var(--surface-2)] p-3"><p className="text-[9px] uppercase tracking-wide text-[var(--text-muted)]">SEA share</p><p className="mt-1 text-base font-semibold sm:text-lg">36.6%</p></div>
            <div className="rounded-xl bg-[var(--surface-2)] p-3"><p className="text-[9px] uppercase tracking-wide text-[var(--text-muted)]">#1 platform</p><p className="mt-1 text-base font-semibold sm:text-lg">Shopee 54%</p></div>
          </div>

          <div className="mt-3">
            <p className="mb-2 text-[9px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">Platforms covered by this GMV snapshot</p>
            <div className="flex flex-wrap gap-2">
              {GMV_PLATFORM_CHIPS.map((platform) => (
                <button key={platform.id} type="button" onClick={() => setSelected(platform.group)} className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-[10px] transition ${selected === platform.group ? "border-[var(--border-strong)] bg-[var(--surface-2)]" : "border-[var(--border)] hover:bg-[var(--surface-2)]"}`}>
                  <MemberIcon member={platform} compact />
                  <span className="font-medium">{platform.label}</span>
                  <span className="text-[var(--text-muted)]">{platform.context}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.08fr_.92fr]">
          <div className="space-y-2 p-4 sm:p-5">
            {MARKET.map((row) => {
              const width = mode === "share" ? row.share : (row.gmv / maxGmv) * 100;
              const value = mode === "share" ? `${row.share}%` : `US$${row.gmv.toFixed(2)}B`;
              const isActive = selected === row.id;
              return (
                <button key={row.id} type="button" onClick={() => setSelected(row.id)} onMouseEnter={() => setSelected(row.id)} className={`w-full rounded-xl border p-3 text-left transition-all ${isActive ? "border-[var(--border-strong)] bg-[var(--surface-2)] shadow-sm" : "border-transparent hover:bg-[var(--surface-2)]"}`}>
                  <div className="flex items-center gap-3">
                    <Logo row={row} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3"><span className="truncate text-xs font-medium sm:text-sm">{row.label}</span><span className="shrink-0 text-sm font-semibold tabular-nums">{value}</span></div>
                      {row.members.length > 1 ? <p className="mt-0.5 text-[9px] text-[var(--text-muted)]">Includes TikTok Shop + Tokopedia</p> : null}
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-3)]"><div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.max(3, width)}%`, background: row.accent }} /></div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <aside className="border-t border-[var(--border)] bg-[var(--surface-2)] p-4 sm:p-5 lg:border-l lg:border-t-0">
            <div className="relative mx-auto h-[250px] max-w-[320px] select-none">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={MARKET} dataKey="share" nameKey="label" innerRadius={66} outerRadius={96} paddingAngle={2} stroke="none" onMouseEnter={(_, index) => selectByIndex(index)} onClick={(_, index) => selectByIndex(index)}>
                    {MARKET.map((row) => <Cell key={row.id} fill={row.accent} opacity={selected === row.id ? 1 : 0.48} stroke={selected === row.id ? "#ffffff" : "transparent"} strokeWidth={selected === row.id ? 2 : 0} style={{ cursor: "pointer", outline: "none" }} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#111216", border: "1px solid #2a2c33", borderRadius: 12, fontSize: 12 }} itemStyle={{ color: "#fff" }} formatter={(value, _name, item) => { const row = item?.payload as MarketRow | undefined; return [`${value}% · US$${row?.gmv.toFixed(2) ?? "0.00"}B`, row?.label ?? "GMV share"]; }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div className="max-w-[126px]"><p className="line-clamp-2 text-[9px] uppercase tracking-[0.12em] text-[var(--text-muted)]">{active.label}</p><p className="mt-1 text-2xl font-semibold" style={{ color: active.accent }}>{active.share}%</p><p className="text-[10px] text-[var(--text-muted)]">US${active.gmv.toFixed(2)}B</p></div></div>
            </div>

            <p className="mb-3 text-center text-[10px] text-[var(--text-muted)]">Hover, tap, or click any slice / marketplace to inspect it.</p>

            <div className="flex items-center gap-3"><Logo row={active} /><div><p className="text-xs font-semibold">{active.label}</p><p className="text-[10px] text-[var(--text-muted)]">Indonesia E-Commerce · 2025 estimate</p></div></div>
            <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl bg-[var(--surface-1)] p-3"><p className="text-[9px] uppercase tracking-wide text-[var(--text-muted)]">GMV share</p><p className="mt-1 text-xl font-semibold">{active.share}%</p></div><div className="rounded-xl bg-[var(--surface-1)] p-3"><p className="text-[9px] uppercase tracking-wide text-[var(--text-muted)]">Est. GMV</p><p className="mt-1 text-xl font-semibold">US${active.gmv.toFixed(2)}B</p></div></div>

            <div className="mt-4 rounded-xl bg-[var(--surface-1)] p-3">
              <p className="text-[9px] uppercase tracking-wide text-[var(--text-muted)]">Included platform{active.members.length > 1 ? "s" : ""}</p>
              <div className="mt-2 flex flex-wrap gap-2">{active.members.map((member) => <span key={member.id} className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1"><MemberIcon member={member} compact /><span className="text-[10px] font-medium">{member.label}</span></span>)}</div>
              {active.id === "tiktok-tokopedia" ? <p className="mt-2 text-[9px] leading-relaxed text-[var(--text-muted)]">Momentum Works reports TikTok Shop and Tokopedia together at 38%; no separate 2025 GMV split is published in this dataset.</p> : null}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">{MARKET.map((row) => <button key={row.id} type="button" onClick={() => setSelected(row.id)} onMouseEnter={() => setSelected(row.id)} className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition ${selected === row.id ? "border-[var(--border-strong)] bg-[var(--surface-1)]" : "border-transparent hover:bg-[var(--surface-1)]"}`}><Logo row={row} compact /><span className="min-w-0"><span className="block truncate text-[10px] font-medium">{row.label}</span><span className="block text-[9px] tabular-nums text-[var(--text-muted)]">{row.share}%</span></span></button>)}</div>

            <p className="mt-4 text-[10px] leading-relaxed text-[var(--text-muted)]">Indonesia represented about 36.6% of Southeast Asia&apos;s US$157.6B platform ecommerce GMV in 2025. Published platform percentages are rounded, so the displayed shares total 101%.</p>
            <a href="https://thelowdown.momentum.asia/new-report-southeast-asias-platform-ecommerce-reaches-us157-6b-in-2025-with-top-platforms-expanding-share-to-98-8/" target="_blank" rel="noreferrer noopener" className="mt-4 inline-flex min-h-10 items-center gap-1.5 text-[11px] font-medium text-[var(--text-secondary)] hover:text-white">Momentum Works source <ExternalLink className="size-3" /></a>
          </aside>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]">
        <div className="border-b border-[var(--border)] p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div><div className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Indonesia E-Commerce traffic snapshot</div><h2 className="mt-2 text-lg font-semibold sm:text-xl">Top-10 e-commerce / shopping traffic</h2><p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--text-secondary)]">Organic-traffic estimates for the top-10 sites in the supplied snapshot. This is a traffic comparison, not GMV market share.</p></div>
            <div className="inline-flex w-fit rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-1"><button type="button" onClick={() => setTrafficMode("traffic")} className={`rounded-lg px-3 py-2 text-[11px] font-medium ${trafficMode === "traffic" ? "bg-[var(--surface-3)] text-white" : "text-[var(--text-muted)]"}`}>Traffic</button><button type="button" onClick={() => setTrafficMode("share")} className={`rounded-lg px-3 py-2 text-[11px] font-medium ${trafficMode === "share" ? "bg-[var(--surface-3)] text-white" : "text-[var(--text-muted)]"}`}>Top-10 share %</button></div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3"><div className="rounded-xl bg-[var(--surface-2)] p-3"><p className="text-[9px] uppercase tracking-wide text-[var(--text-muted)]">Top-10 organic traffic</p><p className="mt-1 text-base font-semibold sm:text-lg">{TOP10_TRAFFIC_TOTAL_M.toFixed(1)}M</p></div><div className="rounded-xl bg-[var(--surface-2)] p-3"><p className="text-[9px] uppercase tracking-wide text-[var(--text-muted)]">Top 4 share</p><p className="mt-1 text-base font-semibold sm:text-lg">{TOP4_TRAFFIC_SHARE.toFixed(1)}%</p></div><div className="rounded-xl bg-[var(--surface-2)] p-3"><p className="text-[9px] uppercase tracking-wide text-[var(--text-muted)]">#1 traffic</p><p className="mt-1 text-base font-semibold sm:text-lg">Shopee 53.0M</p></div></div>
        </div>

        <div className="grid gap-0 xl:grid-cols-[1.05fr_.95fr]">
          <div className="divide-y divide-[var(--border)] p-3 sm:p-4">
            <div className="hidden grid-cols-[44px_minmax(160px,1fr)_110px_110px] gap-3 px-3 pb-2 text-[9px] font-medium uppercase tracking-wide text-[var(--text-muted)] sm:grid"><span>Rank</span><span>Site</span><span className="text-right">Traffic est.</span><span className="text-right">Top-10 share</span></div>
            {TOP10_ECOMMERCE_TRAFFIC.map((site) => {
              const isActive = selectedTrafficId === site.id;
              const width = trafficMode === "traffic" ? (site.trafficM / maxTraffic) * 100 : (site.share / TOP10_ECOMMERCE_TRAFFIC[0].share) * 100;
              return (
                <button key={site.id} type="button" onClick={() => setSelectedTrafficId(site.id)} onMouseEnter={() => setSelectedTrafficId(site.id)} className={`w-full rounded-xl px-3 py-3 text-left transition ${isActive ? "bg-[var(--surface-2)]" : "hover:bg-[var(--surface-2)]/70"}`}>
                  <div className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[44px_minmax(160px,1fr)_110px_110px]">
                    <span className="text-xs font-semibold tabular-nums text-[var(--text-muted)]">#{site.rank}</span>
                    <span className="flex min-w-0 items-center gap-3"><TrafficLogo site={site} compact /><span className="truncate text-xs font-medium sm:text-sm">{site.label}</span></span>
                    <span className="text-right sm:hidden"><span className="block text-xs font-semibold tabular-nums">{trafficMode === "traffic" ? `${site.trafficM.toFixed(1)}M` : `${site.share.toFixed(1)}%`}</span><span className="text-[9px] text-[var(--text-muted)]">{trafficMode === "traffic" ? "traffic" : "share"}</span></span>
                    <span className="hidden text-right text-xs font-semibold tabular-nums sm:block">{site.trafficM.toFixed(1)}M</span><span className="hidden text-right text-xs font-semibold tabular-nums sm:block">{site.share.toFixed(1)}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]"><div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.max(2, width)}%`, background: site.accent }} /></div>
                </button>
              );
            })}
          </div>

          <aside className="border-t border-[var(--border)] bg-[var(--surface-2)] p-4 sm:p-5 xl:border-l xl:border-t-0">
            <div className="h-[430px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={TOP10_ECOMMERCE_TRAFFIC} layout="vertical" margin={{ top: 8, right: 12, left: 8, bottom: 8 }}><CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} /><XAxis type="number" tick={{ fill: "#7f818a", fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="label" width={76} tick={{ fill: "#a5a7af", fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "#111216", border: "1px solid #2a2c33", borderRadius: 12, fontSize: 12 }} itemStyle={{ color: "#fff" }} formatter={(value, _name, item) => { const site = item?.payload as TrafficSite | undefined; return [trafficMode === "traffic" ? `${Number(value).toFixed(1)}M visits` : `${Number(value).toFixed(1)}%`, site?.label ?? "Traffic"]; }} /><Bar dataKey={trafficMode === "traffic" ? "trafficM" : "share"} radius={[0, 7, 7, 0]}>{TOP10_ECOMMERCE_TRAFFIC.map((site) => <Cell key={site.id} fill={site.accent} opacity={selectedTrafficId === site.id ? 1 : 0.5} />)}</Bar></BarChart></ResponsiveContainer></div>
            <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4"><div className="flex items-center gap-3"><TrafficLogo site={activeTraffic} /><div className="min-w-0"><p className="truncate text-sm font-semibold">#{activeTraffic.rank} {activeTraffic.label}</p><p className="text-[10px] text-[var(--text-muted)]">Organic traffic snapshot</p></div></div><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl bg-[var(--surface-2)] p-3"><p className="text-[9px] uppercase tracking-wide text-[var(--text-muted)]">Traffic est.</p><p className="mt-1 text-lg font-semibold">{activeTraffic.trafficM.toFixed(1)}M</p></div><div className="rounded-xl bg-[var(--surface-2)] p-3"><p className="text-[9px] uppercase tracking-wide text-[var(--text-muted)]">Top-10 share</p><p className="mt-1 text-lg font-semibold">{activeTraffic.share.toFixed(1)}%</p></div></div></div>
            <p className="mt-4 text-[10px] leading-relaxed text-[var(--text-muted)]">Traffic share is normalized only within these ten listed sites. It is not the same metric as platform GMV share above. The supplied percentages sum to 99.9% because of rounding.</p>
          </aside>
        </div>
      </section>
    </div>
  );
}
