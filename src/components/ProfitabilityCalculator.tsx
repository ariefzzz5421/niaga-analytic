"use client";

import { ChevronDown, ExternalLink, Info } from "lucide-react";
import { useMemo, useState } from "react";
import { CATEGORY_OPTIONS, MARKETPLACE_FEES, MARKETPLACE_ORDER, type ProductCategory } from "@/data/marketplaceFees";
import { calculateProfit, findTargetPrice, type FeeRule } from "@/lib/profitability";

const TARGET_MARGIN = 0.2;
const PPH22_RATE = 0.005;
const money = (v: number) => `Rp${Math.round(v).toLocaleString("en-US")}`;
const formatInput = (raw: string) => raw ? Number(raw).toLocaleString("en-US") : "";

function sanitizeMoney(value: string, setter: (value: string) => void) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return setter("");
  setter(digits.replace(/^0+(?=\d)/, ""));
}

export function ProfitabilityCalculator() {
  const [costRaw, setCostRaw] = useState("100000");
  const [sellingPriceRaw, setSellingPriceRaw] = useState("150000");
  const [category, setCategory] = useState<ProductCategory>("general");
  const [simulatePph22, setSimulatePph22] = useState(false);

  const cost = Number(costRaw || 0);
  const sellingPrice = Number(sellingPriceRaw || 0);

  const rows = useMemo(() => MARKETPLACE_ORDER.map((id) => {
    const platform = MARKETPLACE_FEES[id];
    const rate = platform.rates[category] / 100;
    const rules: FeeRule[] = [{ label: platform.rateLabel, rate }];
    if (platform.fixedFee) rules.push({ label: platform.fixedFeeLabel ?? "Biaya tetap", fixed: platform.fixedFee });
    if (simulatePph22 && platform.pph22Eligible) rules.push({ label: "PPh 22 marketplace (simulasi)", rate: PPH22_RATE });

    const recommendedPrice = findTargetPrice({ hpp: cost, quantity: 1 }, rules, TARGET_MARGIN);
    const activePrice = sellingPrice > 0 ? sellingPrice : recommendedPrice;
    const result = calculateProfit({ hpp: cost, sellingPrice: activePrice, quantity: 1 }, rules);

    return { platform, rate, recommendedPrice, activePrice, result };
  }).sort((a, b) => b.result.netProfit - a.result.netProfit), [cost, sellingPrice, category, simulatePph22]);

  return <section className="mx-auto max-w-5xl">
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm sm:p-6">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">Simple mode</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Cek profit dari harga jualmu.</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">Masukkan HPP, harga jual, dan kategori. NIAGA menghitung fee seller, settlement, profit bersih, margin, serta harga jual rekomendasi untuk target margin 20%.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-medium text-[var(--text-secondary)]">HPP / Cost of Goods<div className="relative mt-2"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">Rp</span><input value={formatInput(costRaw)} onChange={(e) => sanitizeMoney(e.target.value, setCostRaw)} inputMode="numeric" type="text" placeholder="100,000" className="h-14 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] pl-11 pr-4 text-lg font-semibold tabular-nums outline-none focus:border-[var(--accent)]" /></div></label>

        <label className="text-xs font-medium text-[var(--text-secondary)]">Harga jual<div className="relative mt-2"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">Rp</span><input value={formatInput(sellingPriceRaw)} onChange={(e) => sanitizeMoney(e.target.value, setSellingPriceRaw)} inputMode="numeric" type="text" placeholder="150,000" className="h-14 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] pl-11 pr-4 text-lg font-semibold tabular-nums outline-none focus:border-[var(--accent)]" /></div></label>

        <label className="text-xs font-medium text-[var(--text-secondary)]">Kategori produk<div className="relative mt-2"><select value={category} onChange={(e) => setCategory(e.target.value as ProductCategory)} className="h-14 w-full appearance-none rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 pr-11 text-base font-medium outline-none focus:border-[var(--accent)]">{CATEGORY_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" /></div></label>
      </div>

      <p className="mt-2 text-[10px] text-[var(--text-muted)]">Kolom uang bisa dikosongkan penuh dan otomatis memakai format 100,000 / 1,000,000.</p>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3"><input type="checkbox" checked={simulatePph22} onChange={(e) => setSimulatePph22(e.target.checked)} className="mt-0.5 size-4 accent-[var(--accent)]" /><span className="text-[11px] leading-relaxed text-[var(--text-secondary)]"><strong className="text-[var(--text-primary)]">Simulasikan PPh 22 marketplace 0,5%</strong><br />Belum aktif per 14 Sep 2026. DJP menunda mulai pemungutan sampai 1 November 2026.</span></label>
    </div>

    <div className="mt-5 flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold">Profit per marketplace</h2><p className="mt-1 text-xs text-[var(--text-muted)]">Menggunakan harga jual yang kamu input · rekomendasi target margin 20%</p></div><span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1 text-[10px] text-[var(--text-muted)]">Verified 14 Sep 2026</span></div>

    <div className="mt-3 grid gap-3 md:grid-cols-2">
      {rows.map(({ platform, rate, recommendedPrice, activePrice, result }, index) => <article key={platform.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-1.5"><img src={platform.logo} alt={`${platform.label} logo`} className="size-full object-contain" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{platform.label}</h3>{index === 0 ? <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">Best profit</span> : null}</div><p className="mt-0.5 text-[11px] text-[var(--text-muted)]">Default {rate * 100}%{platform.fixedFee ? ` + ${money(platform.fixedFee)}` : ""}</p></div></div><div className="shrink-0 text-right"><p className="text-[9px] uppercase tracking-[0.12em] text-[var(--text-muted)]">Net profit</p><p className={`mt-1 text-lg font-semibold tabular-nums ${result.netProfit >= 0 ? "text-[var(--good)]" : "text-red-400"}`}>{money(result.netProfit)}</p></div></div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric label="Harga jual" value={money(activePrice)} /><Metric label="HPP" value={money(cost)} /><Metric label="Total fee" value={money(result.marketplaceFees)} /><Metric label="Net margin" value={`${result.netMargin.toFixed(1)}%`} /></div>

        <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3"><div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">Breakdown seller fee</p><span className={`rounded-full px-2 py-0.5 text-[9px] ${platform.confidence === "official" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-300"}`}>{platform.confidence === "official" ? "official" : "estimate"}</span></div><div className="space-y-1.5">{result.breakdown.map((item) => <div key={item.label} className="flex items-center justify-between gap-3 text-[11px]"><span className="text-[var(--text-secondary)]">{item.label}{item.label === platform.rateLabel ? ` · ${(rate * 100).toFixed(rate * 100 % 1 ? 1 : 0)}%` : item.label.startsWith("PPh 22") ? " · 0.5%" : ""}</span><span className="shrink-0 font-medium tabular-nums">{money(item.amount)}</span></div>)}</div><div className="mt-2 flex items-center justify-between border-t border-[var(--border)] pt-2 text-[11px]"><span className="font-medium text-[var(--text-secondary)]">Settlement setelah fee</span><span className="font-semibold tabular-nums">{money(result.netSettlement)}</span></div></div>

        <div className="mt-3 flex items-center justify-between rounded-xl bg-[var(--surface-2)] px-3 py-2.5"><div><p className="text-[9px] uppercase tracking-wide text-[var(--text-muted)]">Harga jual rekomendasi</p><p className="mt-1 text-xs font-semibold">Target margin 20%</p></div><p className="font-semibold tabular-nums text-[var(--good)]">{money(recommendedPrice)}</p></div>

        <div className="mt-3 flex items-start gap-2 rounded-xl bg-[var(--surface-2)] px-3 py-2.5"><Info className="mt-0.5 size-3.5 shrink-0 text-[var(--text-muted)]" /><p className="text-[10px] leading-relaxed text-[var(--text-muted)]">{platform.note}</p></div>{platform.sourceUrl ? <a href={platform.sourceUrl} target="_blank" rel="noreferrer noopener" className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-[11px] font-medium text-[var(--text-secondary)] hover:text-white">{platform.sourceLabel}<ExternalLink className="size-3" /></a> : null}
      </article>)}
    </div>

    <p className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 text-[10px] leading-relaxed text-[var(--text-muted)]">Fee Shopee dan Tokopedia memakai sumber resmi yang dipublikasikan dan tetap bergantung kategori/status seller. TikTok Shop, Lazada setelah masa promo, dan Blibli tidak mempublikasikan tabel kategori lengkap yang stabil secara terbuka, jadi default NIAGA untuk platform tersebut tetap ditandai sebagai estimate. PPh 22 0,5% belum berlaku per 14 Sep 2026 karena DJP menunda implementasinya sampai 1 Nov 2026.</p>
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="min-w-0 rounded-xl bg-[var(--surface-2)] p-2.5"><p className="text-[9px] uppercase tracking-wide text-[var(--text-muted)]">{label}</p><p className="mt-1 break-words text-xs font-semibold tabular-nums sm:text-sm">{value}</p></div>; }
