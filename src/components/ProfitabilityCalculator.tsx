"use client";

import { useMemo, useState } from "react";
import { MARKETPLACE_FEES, MARKETPLACE_ORDER } from "@/data/marketplaceFees";
import { calculateProfit, findTargetPrice } from "@/lib/profitability";

const rupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

export function ProfitabilityCalculator() {
  const [hpp, setHpp] = useState(100000);
  const [price, setPrice] = useState(150000);
  const [quantity, setQuantity] = useState(1);
  const [packaging, setPackaging] = useState(3000);
  const [ads, setAds] = useState(0);
  const [target, setTarget] = useState(20);

  const rows = useMemo(() => MARKETPLACE_ORDER.map((id) => {
    const platform = MARKETPLACE_FEES[id];
    const base = { hpp, sellingPrice: price, quantity, packaging, advertising: ads };
    const result = calculateProfit(base, platform.fees);
    const targetPrice = findTargetPrice({ hpp, quantity, packaging, advertising: ads }, platform.fees, target / 100);
    return { platform, result, targetPrice };
  }).sort((a, b) => b.result.netProfit - a.result.netProfit), [hpp, price, quantity, packaging, ads, target]);

  return (
    <section className="mt-10" id="profit-calculator">
      <div className="mb-5"><p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">Marketplace Profit Calculator</p><h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Hitung profit sebelum listing.</h2><p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">Masukkan economics produk sekali, lalu bandingkan settlement, profit, margin, dan harga jual target di setiap channel.</p></div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="card h-fit p-4 sm:p-5"><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <MoneyInput label="HPP / Cost of Goods" value={hpp} onChange={setHpp} /><MoneyInput label="Harga jual" value={price} onChange={setPrice} />
          <label className="text-xs text-[var(--text-secondary)]">Quantity<input className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-base outline-none" inputMode="numeric" type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))} /></label>
          <MoneyInput label="Packaging / order" value={packaging} onChange={setPackaging} /><MoneyInput label="Ads / CAC per order" value={ads} onChange={setAds} />
          <label className="text-xs text-[var(--text-secondary)]">Target margin<input className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-base outline-none" inputMode="decimal" type="number" min={0} max={95} value={target} onChange={(e) => setTarget(Number(e.target.value))} /><span className="mt-1 block text-[10px] text-[var(--text-muted)]">{target}% net margin</span></label>
        </div></div>
        <div className="min-w-0 space-y-3">{rows.map(({ platform, result, targetPrice }, index) => <article key={platform.id} className="card overflow-hidden p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-[var(--surface-3)] text-xs font-bold">{platform.label.slice(0, 1)}</span><h3 className="text-sm font-semibold">{platform.label}</h3>{index === 0 ? <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px]">Best profit</span> : null}</div><p className="mt-2 text-[11px] text-[var(--text-muted)]">{platform.note}</p></div><div className="text-right"><p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Net profit</p><p className={`mt-1 text-lg font-semibold ${result.netProfit >= 0 ? "text-[var(--good)]" : "text-red-400"}`}>{rupiah(result.netProfit)}</p></div></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric label="Platform fee" value={rupiah(result.marketplaceFees)} /><Metric label="Settlement" value={rupiah(result.netSettlement)} /><Metric label="Net margin" value={`${result.netMargin.toFixed(1)}%`} /><Metric label={`Target ${target}%`} value={rupiah(targetPrice)} /></div></article>)}</div>
      </div>
      <p className="mt-4 text-[11px] leading-relaxed text-[var(--text-muted)]">Biaya marketplace berubah menurut kategori, status seller, program promosi dan kebijakan platform. Konfigurasi fee sengaja tidak mengarang persentase yang belum diverifikasi; verifikasi biaya aktual di Seller Center sebelum mengambil keputusan harga.</p>
    </section>
  );
}

function MoneyInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label className="text-xs text-[var(--text-secondary)]">{label}<div className="relative mt-1.5"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">Rp</span><input className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-3 pl-9 pr-3 text-base outline-none" inputMode="numeric" type="number" min={0} value={value} onChange={(e) => onChange(Math.max(0, Number(e.target.value)))} /></div></label>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="min-w-0 rounded-xl bg-[var(--surface-2)] p-3"><p className="truncate text-[9px] uppercase tracking-wide text-[var(--text-muted)]">{label}</p><p className="mt-1 break-words text-xs font-semibold tabular-nums sm:text-sm">{value}</p></div>; }
