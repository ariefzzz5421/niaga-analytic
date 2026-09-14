"use client";

import { AppNav } from "@/components/AppNav";
import { ProfitabilityCalculator } from "@/components/ProfitabilityCalculator";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--plane)] text-[var(--text-primary)]">
      <AppNav />
      <main className="overflow-x-hidden px-4 pb-20 pt-6 sm:px-6 md:ml-60 md:px-8 md:pt-10">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 hidden md:block">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">NIAGA ANALYTIC</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Marketplace Profit Calculator</h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">Hitung harga jual minimum dari HPP dengan fee marketplace yang sudah dipreset.</p>
          </div>
          <ProfitabilityCalculator />
        </div>
      </main>
    </div>
  );
}
