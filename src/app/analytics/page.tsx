"use client";

import { useCallback, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { CompareBoard } from "@/components/CompareBoard";
import { Dashboard } from "@/components/Dashboard";
import { PipelineConsole } from "@/components/PipelineConsole";
import { StoreInput } from "@/components/StoreInput";
import { useAnalyze } from "@/lib/useAnalyze";

type Tab = "single" | "compare";

export default function AnalyticsPage() {
  const { loading, events, analysis, error, run } = useAnalyze();
  const [tab, setTab] = useState<Tab>("single");
  const [lastUrl, setLastUrl] = useState("");
  const analyze = useCallback((url: string) => { setLastUrl(url); void run(url); }, [run]);

  return (
    <div className="min-h-screen bg-[var(--plane)] text-[var(--text-primary)]">
      <AppNav />
      <main className="overflow-x-hidden px-4 pb-20 pt-6 sm:px-6 md:ml-60 md:px-8 md:pt-10">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">Analytics</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Store & competitor analytics</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">Analisa storefront marketplace yang sudah ada tanpa mencampurnya dengan kalkulator profit.</p>

          <div className="mt-6 flex overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-1 sm:w-fit">
            <button onClick={() => setTab("single")} className={`min-h-11 flex-1 whitespace-nowrap rounded-lg px-4 text-sm sm:flex-none ${tab === "single" ? "bg-[var(--surface-3)] text-white" : "text-[var(--text-secondary)]"}`}>Single store</button>
            <button onClick={() => setTab("compare")} className={`min-h-11 flex-1 whitespace-nowrap rounded-lg px-4 text-sm sm:flex-none ${tab === "compare" ? "bg-[var(--surface-3)] text-white" : "text-[var(--text-secondary)]"}`}>Compare stores</button>
          </div>

          <div className="mt-5">{tab === "single" ? <StoreInput onSubmit={analyze} loading={loading} defaultValue={lastUrl} /> : <CompareBoard />}</div>
          {tab === "single" ? <div className="mt-5 space-y-4">{loading || events.length || error ? <PipelineConsole events={events} error={error} /> : null}{analysis ? <Dashboard analysis={analysis} onRefresh={() => run(lastUrl, { refresh: true })} /> : null}</div> : null}
        </div>
      </main>
    </div>
  );
}
