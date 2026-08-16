"use client";

import { ArrowUpRight, KeyRound, TriangleAlert } from "lucide-react";

/**
 * Shown when an analysis fails because no live data source is reachable.
 *
 * The app deliberately refuses to invent numbers, so this panel has to carry
 * the whole recovery path: what is missing, and the shortest route to fixing
 * it. Anything less and the failure reads as "the tool is broken".
 */

interface Provider {
  name: string;
  env: string;
  free: string;
  url: string;
  covers: string;
}

const PROVIDERS: Provider[] = [
  {
    name: "ScraperAPI",
    env: "SCRAPERAPI_KEY",
    free: "5,000 requests free",
    url: "https://www.scraperapi.com",
    covers: "Shopee, Tokopedia, Blibli, TikTok",
  },
  {
    name: "ScrapingBee",
    env: "SCRAPINGBEE_KEY",
    free: "1,000 requests free",
    url: "https://www.scrapingbee.com",
    covers: "Shopee, Tokopedia, Blibli, TikTok",
  },
  {
    name: "Apify",
    env: "APIFY_TOKEN",
    free: "$5/month free credit",
    url: "https://console.apify.com/account/integrations",
    covers: "TikTok Shop (any seller)",
  },
  {
    name: "TikTok Shop Open API",
    env: "TIKTOK_ACCESS_TOKEN",
    free: "free, your own shop only",
    url: "https://partner.tiktokshop.com",
    covers: "TikTok Shop (exact GMV)",
  },
];

export function SetupPanel({ hint }: { hint?: string }) {
  return (
    <section className="card animate-fade-up overflow-hidden">
      <header className="flex items-start gap-3 border-b border-[var(--border)] bg-[color:var(--warning)]/8 p-5">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[var(--warning)]" aria-hidden />
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
            No live data source connected
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
            {hint ??
              "This analyzer reads the marketplace's own listing data. Without a way through their bot protection there is nothing real to report — and it will not invent numbers to fill the gap."}
          </p>
        </div>
      </header>

      <div className="p-5">
        <p className="mb-3 flex items-center gap-2 text-xs font-medium text-[var(--text-primary)]">
          <KeyRound className="size-3.5 text-[var(--series-1)]" aria-hidden />
          Connect one of these, then redeploy
        </p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {["Provider", "Environment variable", "Cost", "Covers"].map((h) => (
                  <th key={h} scope="col" className="pb-2 font-medium text-[var(--text-secondary)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PROVIDERS.map((p) => (
                <tr key={p.env} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-2.5">
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 text-[var(--text-primary)] hover:text-[var(--accent)]"
                    >
                      {p.name}
                      <ArrowUpRight className="size-3" aria-hidden />
                    </a>
                  </td>
                  <td className="py-2.5">
                    <code className="mono rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] text-[#86b6ef]">
                      {p.env}
                    </code>
                  </td>
                  <td className="py-2.5 text-[var(--text-secondary)]">{p.free}</td>
                  <td className="py-2.5 text-[var(--text-secondary)]">{p.covers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--plane)] p-3">
          <p className="mb-1.5 text-[11px] font-medium text-[var(--text-secondary)]">
            On Vercel — Project → Settings → Environment Variables:
          </p>
          <pre className="mono overflow-x-auto text-[11px] leading-relaxed text-[var(--text-muted)]">
{`SCRAPERAPI_KEY=your_key_here
SCRAPE_PROVIDER=direct,scraperapi
SCRAPE_COUNTRY=id`}
          </pre>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-muted)]">
          Want to browse the interface before committing to a provider? Add{" "}
          <code className="mono rounded bg-[var(--surface-2)] px-1 text-[10px]">DEMO_MODE=true</code>{" "}
          to serve clearly-labelled sample figures instead. Never set that on an instance anyone
          makes decisions from.
        </p>
      </div>
    </section>
  );
}
