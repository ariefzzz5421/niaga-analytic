"use client";

import { Activity, Github, Sparkles } from "lucide-react";
import { ProfitabilityCalculator } from "@/components/ProfitabilityCalculator";

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[color:var(--plane)]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-lg bg-[var(--accent)]"><Activity className="size-4 text-white" /></span><span className="text-sm font-semibold">Niaga<span className="text-[var(--text-muted)]">Analytics</span></span></div>
          <a href="https://github.com/ariefzzz5421/niaga-analytic" target="_blank" rel="noreferrer noopener" className="grid size-10 place-items-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-2)]" aria-label="GitHub repository"><Github className="size-4" /></a>
        </div>
      </header>
      <main className="mx-auto max-w-6xl overflow-x-hidden px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
        <section className="mx-auto max-w-3xl text-center">
          <span className="mono inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]"><Sparkles className="size-3" />Profitability intelligence</span>
          <h1 className="mt-5 text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">Satu produk. <span className="gradient-text">Marketplace mana paling untung?</span></h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">Ketahui berapa keuntungan bersih produkmu setelah biaya marketplace — sebelum menentukan harga dan tempat listing.</p>
        </section>
        <ProfitabilityCalculator />
      </main>
      <footer className="border-t border-[var(--border)] px-4 py-7 sm:px-6"><p className="mx-auto max-w-6xl text-[10px] leading-relaxed text-[var(--text-muted)]">NIAGA ANALYTIC memberikan estimasi, bukan laporan settlement resmi. Marketplace dapat mengubah biaya berdasarkan kategori, seller tier dan program. Selalu verifikasi fee terbaru di Seller Center.</p></footer>
    </>
  );
}
