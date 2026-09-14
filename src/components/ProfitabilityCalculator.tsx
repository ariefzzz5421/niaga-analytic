"use client";

import { ChevronDown, ExternalLink, Info } from "lucide-react";
import { useMemo, useState } from "react";
import { CATEGORY_OPTIONS, MARKETPLACE_FEES, MARKETPLACE_ORDER, type ProductCategory } from "@/data/marketplaceFees";
import { calculateProfit, findTargetPrice } from "@/lib/profitability";

const rupiah = (v: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);
const TARGET_MARGIN = 0.2;

export function ProfitabilityCalculator() {
  const [cost, setCost] = useState(100000);
  const [category, setCategory] = useState<ProductCategory>("general");

  const rows = useMemo(() => MARKETPLACE_ORDER.map((id) => {
    const platform = MARKETPLACE_FEES[id];
    const rate = platform.rates[category] / 100;
    const fees = [{ label: "Marketplace fee", rate, fixed: platform.fixedFee ?? 0 }];
    const recommendedPrice = findTargetPrice({ hpp: cost, quantity: 1 }, fees, TARGET_MARGIN);
    const result = calculateProfit({ hpp: cost, sellingPrice: recommendedPrice, quantity: 1 }, fees);
    return { platform, rate, recommendedPrice, result };
  }).sort((a, b) => b.result.netProfit - a.result.netProfit), [cost, category]);

  return (
    <section className="mx-auto max-w-5xl">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-1"><p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">Simple mode</p><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Berapa harga jual yang aman?</h1><p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">Cukup masukkan HPP. NIAGA menghitung harga jual rekomendasi dengan target margin bersih 20% dan fee marketplace default berdasarkan kategori.</p></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium text-[var(--text-secondary)]">HPP / Cost of Goods<div className="relative mt-2"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">Rp</span><input value={cost} onChange={(e) => setCost(Math.max(0, Number(e.target.value)))} inputMode="numeric" type="number" min={0} className="h-14 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] pl-11 pr-4 text-lg font-semibold tabular-nums outline-none focus:border-[var(--accent)]" /></div></label>
          <label className="text-xs font-medium text-[var(--text-secondary)]">Kategori produk<div className="relative mt-2"><select value={category} onChange={(e) => setCategory(e.target.value as ProductCategory)} className="h-14 w-full appearance-none rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 pr-11 text-base font-medium outline-none focus:border-[var(--accent)]">{CATEGORY_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" /></div></label>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between"><div><h2 className="text-base font-semibold">Rekomendasi harga jual</h2><p className="mt-1 text-xs text-[var(--text-muted)]">Target margin bersih 20% · qty 1</p></div><span className="rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1 text-[10px] text-[var(--text-muted)]">Updated 14 Sep 2026</span></div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {rows.map(({ platform, rate, recommendedPrice, result }, index) => (
          <article key={platform.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/95 p-2"><img src={platform.logo} alt={`${platform.label} logo`} className="max-h-full max-w-full object-contain" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{platform.label}</h3>{index === 0 ? <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">Lowest price</span> : null}</div><p className="mt-0.5 text-[11px] text-[var(--text-muted)]">Default fee {rate * 100}%{platform.fixedFee ? ` + ${rupiah(platform.fixedFee)}` : ""}</p></div></div>
              <div className="shrink-0 text-right"><p className="text-[9px] uppercase tracking-[0.12em] text-[var(--text-muted)]">Jual mulai</p><p className="mt-1 text-lg font-semibold tabular-nums text-[var(--good)]">{rupiah(recommendedPrice)}</p></div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2"><Metric label="HPP" value={rupiah(cost)} /><Metric label="Fee" value={rupiah(result.marketplaceFees)} /><Metric label="Profit" value={rupiah(result.netProfit)} /></div>
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-[var(--surface-2)] px-3 py-2.5"><Info className="mt-0.5 size-3.5 shrink-0 text-[var(--text-muted)]" /><p className="text-[10px] leading-relaxed text-[var(--text-muted)]">{platform.note}</p></div>
            {platform.sourceUrl ? <a href={platform.sourceUrl} target="_blank" rel="noreferrer noopener" className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-[11px] font-medium text-[var(--text-secondary)] hover:text-white">{platform.sourceLabel}<ExternalLink className="size-3" /></a> : null}
          </article>
        ))}
      </div>

      <p className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 text-[10px] leading-relaxed text-[var(--text-muted)]">Default fee adalah alat planning, bukan settlement resmi. Shopee dan Tokopedia memiliki struktur kategori/tier yang dipublikasikan; TikTok Shop, Lazada, dan Blibli tetap dapat berbeda menurut subkategori, status seller, program, dan promo. Gunakan angka Seller Center untuk keputusan final.</p>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="min-w-0 rounded-xl bg-[var(--surface-2)] p-2.5"><p className="text-[9px] uppercase tracking-wide text-[var(--text-muted)]">{label}</p><p className="mt-1 break-words text-xs font-semibold tabular-nums sm:text-sm">{value}</p></div>; }
