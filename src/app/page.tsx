"use client";

import { Activity, Github, Layers, Radio, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { BrandIcon } from "@/components/brand-icons";
import { CompareBoard } from "@/components/CompareBoard";
import { Dashboard } from "@/components/Dashboard";
import { PipelineConsole } from "@/components/PipelineConsole";
import { SetupPanel } from "@/components/SetupPanel";
import { StoreInput } from "@/components/StoreInput";
import { PLATFORM_LIST } from "@/lib/platform";
import { useAnalyze } from "@/lib/useAnalyze";

type Tab = "single" | "compare";

interface Health {
  live: boolean;
  demoMode: boolean;
  transports: string[];
  routes: { shopeeCookie: boolean; tiktokOfficialApi: boolean; apify: boolean };
}

/** Header status: live sources, demo figures, or nothing connected. */
function healthStatus(h: Health): { label: string; color: string } {
  if (h.demoMode) return { label: "Demo mode — sample figures", color: "var(--warning)" };
  if (h.live || h.routes.tiktokOfficialApi || h.routes.apify) {
    return { label: "Live data connected", color: "var(--good)" };
  }
  return { label: "No data source connected", color: "var(--critical)" };
}

function Header({ health }: { health: Health | null }) {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[color:var(--plane)]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-lg bg-[var(--accent)]">
            <Activity className="size-4 text-white" aria-hidden />
          </span>
          <span className="text-sm font-semibold tracking-tight">
            Niaga<span className="text-[var(--text-muted)]">Analytics</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {health ? (
            <span
              className="hidden items-center gap-1.5 text-[11px] text-[var(--text-secondary)] sm:inline-flex"
              title={`Transports: ${health.transports.join(", ")}`}
            >
              <span
                aria-hidden
                className="size-1.5 rounded-full"
                style={{ background: healthStatus(health).color }}
              />
              {healthStatus(health).label}
            </span>
          ) : null}
          <a
            href="https://github.com/ariefzzz5421/e-commerce-analyzer"
            target="_blank"
            rel="noreferrer noopener"
            className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            aria-label="Source on GitHub"
          >
            <Github className="size-4" aria-hidden />
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <span className="mono inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
        <Sparkles className="size-3 text-[var(--series-1)]" aria-hidden />
        Riset kompetitor marketplace
      </span>

      <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
        Paste a store link.
        <br />
        <span className="gradient-text">See what it actually earns.</span>
      </h1>

      <p className="mx-auto mt-4 max-w-xl text-pretty text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
        Revenue models, unit velocity and catalogue health for any official store on Shopee,
        TikTok Shop, Tokopedia, Blibli, Lazada or Bukalapak — built from the marketplace&apos;s own
        public listing data.
      </p>
    </div>
  );
}

const FEATURES = [
  {
    icon: Radio,
    title: "Live catalogue pull",
    detail:
      "Shopee's storefront API and TikTok Shop's Open API, behind a provider chain that survives geo-blocks and rate limits.",
  },
  {
    icon: Zap,
    title: "Revenue model, not a guess",
    detail:
      "Price x sold per listing, rolled into a monthly curve from listing ages — with a confidence score that shows its own assumptions.",
  },
  {
    icon: Layers,
    title: "Catalogue health",
    detail:
      "Hero-SKU concentration, dead stock, discount dependence and price-band mix — the parts a revenue number alone hides.",
  },
  {
    icon: ShieldCheck,
    title: "Every figure exportable",
    detail: "Table view on every chart, CSV export on the full catalogue, and a pipeline log for each run.",
  },
];

export default function Home() {
  const { loading, events, analysis, error, run } = useAnalyze();
  const [tab, setTab] = useState<Tab>("single");
  const [health, setHealth] = useState<Health | null>(null);
  const [lastUrl, setLastUrl] = useState("");

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const analyze = useCallback(
    (url: string) => {
      setLastUrl(url);
      void run(url);
    },
    [run],
  );

  const started = loading || events.length > 0 || Boolean(analysis) || Boolean(error);

  return (
    <>
      <Header health={health} />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
        <Hero />

        <div className="mx-auto mt-9 max-w-3xl">
          <div className="mb-4 flex justify-center">
            <div
              role="tablist"
              aria-label="Analysis mode"
              className="flex rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-1"
            >
              {(
                [
                  ["single", "Single store"],
                  ["compare", "Compare stores"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
                    tab === id
                      ? "bg-[var(--surface-3)] text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {tab === "single" ? (
            <StoreInput onSubmit={analyze} loading={loading} defaultValue={lastUrl} />
          ) : null}
        </div>

        <div className="mt-8 space-y-4">
          {tab === "compare" ? (
            <CompareBoard />
          ) : (
            <>
              {started ? <PipelineConsole events={events} error={error} /> : null}
              {error && (error.kind === "not-configured" || error.kind === "upstream-blocked") ? (
                <SetupPanel hint={error.hint} />
              ) : null}
              {analysis ? (
                <Dashboard analysis={analysis} onRefresh={() => run(lastUrl, { refresh: true })} />
              ) : null}
            </>
          )}
        </div>

        {!started && tab === "single" ? (
          <>
            <section className="mt-16 grid gap-3 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <div key={f.title} className="card p-5">
                  <f.icon className="size-4 text-[var(--series-1)]" aria-hidden />
                  <h3 className="mt-3 text-sm font-medium tracking-tight">{f.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">{f.detail}</p>
                </div>
              ))}
            </section>

            <section className="mt-4 card p-5">
              <h3 className="text-sm font-medium tracking-tight">Marketplace coverage</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {PLATFORM_LIST.map((p) => (
                  <div key={p.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                    <div className="flex items-center gap-2">
                      <BrandIcon platform={p.id} className="size-4" style={{ color: p.brand }} />
                      <span className="text-xs font-medium">{p.label}</span>
                      <span
                        className={`ml-auto rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${
                          p.flagship
                            ? "bg-[var(--accent-soft)] text-[#86b6ef]"
                            : "bg-[var(--surface-3)] text-[var(--text-muted)]"
                        }`}
                      >
                        {p.flagship ? "Full support" : "Best effort"}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-secondary)]">{p.hint}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </main>

      <footer className="border-t border-[var(--border)] px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-2 text-[11px] leading-relaxed text-[var(--text-muted)]">
          <p>
            Revenue figures are estimates derived from publicly listed prices and each marketplace&apos;s
            own published sold counters. They exclude returns, cancellations, shipping and fees, and
            are not audited seller financials.
          </p>
          <p>
            Collecting marketplace data can conflict with a platform&apos;s terms of service. Check the
            terms that apply to you, respect robots.txt and rate limits, and only analyse stores you
            have a legitimate business reason to research.
          </p>
        </div>
      </footer>
    </>
  );
}
