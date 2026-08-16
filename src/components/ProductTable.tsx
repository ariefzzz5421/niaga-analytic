"use client";

import { ArrowDown, ArrowUp, Download, ExternalLink, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { compactIdr, fullIdr, fullNumber, percent, truncate } from "@/lib/format";
import type { ProductMetrics } from "@/lib/types";

type SortKey = "revenue" | "sold" | "price" | "rating" | "stock" | "discountPct";

const COLUMNS: { key: SortKey; label: string; format: (p: ProductMetrics) => string }[] = [
  { key: "revenue", label: "Est. revenue", format: (p) => compactIdr(p.revenue) },
  { key: "sold", label: "Units", format: (p) => fullNumber(p.sold) },
  { key: "price", label: "Price", format: (p) => compactIdr(p.price) },
  { key: "discountPct", label: "Disc.", format: (p) => (p.discountPct ? `${p.discountPct}%` : "—") },
  { key: "rating", label: "Rating", format: (p) => (p.rating ? p.rating.toFixed(2) : "—") },
  { key: "stock", label: "Stock", format: (p) => (p.stock != null ? fullNumber(p.stock) : "—") },
];

function toCsv(products: ProductMetrics[]): string {
  const header = [
    "id",
    "name",
    "url",
    "price_idr",
    "original_price_idr",
    "discount_pct",
    "units_sold",
    "units_sold_recent",
    "estimated_revenue_idr",
    "revenue_share",
    "stock",
    "rating",
    "review_count",
    "category",
  ];

  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = products.map((p) =>
    [
      p.id,
      p.name,
      p.url ?? "",
      p.price,
      p.originalPrice ?? "",
      p.discountPct ?? "",
      p.sold,
      p.soldRecent ?? "",
      p.revenue,
      p.revenueShare.toFixed(6),
      p.stock ?? "",
      p.rating ?? "",
      p.reviewCount ?? "",
      p.category ?? "",
    ]
      .map(escape)
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}

export function ProductTable({ products, storeName }: { products: ProductMetrics[]; storeName: string }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [desc, setDesc] = useState(true);
  const [limit, setLimit] = useState(25);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? products.filter(
          (p) => p.name.toLowerCase().includes(q) || (p.category ?? "").toLowerCase().includes(q),
        )
      : products;

    return [...matched].sort((a, b) => {
      const av = (a[sortKey] as number | undefined) ?? -1;
      const bv = (b[sortKey] as number | undefined) ?? -1;
      return desc ? bv - av : av - bv;
    });
  }, [products, query, sortKey, desc]);

  const visible = filtered.slice(0, limit);

  function download() {
    const blob = new Blob([toCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${storeName.replace(/\s+/g, "-").toLowerCase()}-listings.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setDesc((d) => !d);
    } else {
      setSortKey(key);
      setDesc(true);
    }
  }

  return (
    <section className="card overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-4">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Full catalogue</h3>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            {fullNumber(filtered.length)} listings
            {query ? ` matching "${query}"` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-muted)]"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter listings…"
              aria-label="Filter listings"
              className="w-44 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] py-1.5 pl-8 pr-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none sm:w-56"
            />
          </div>
          <button
            type="button"
            onClick={download}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          >
            <Download className="size-3.5" aria-hidden />
            CSV
          </button>
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
              <th scope="col" className="px-4 py-2.5 font-medium text-[var(--text-secondary)]">
                Listing
              </th>
              {COLUMNS.map((c) => (
                <th key={c.key} scope="col" className="px-3 py-2.5 text-right font-medium">
                  <button
                    type="button"
                    onClick={() => toggleSort(c.key)}
                    className={`inline-flex items-center gap-1 transition-colors ${
                      sortKey === c.key
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                    aria-sort={sortKey === c.key ? (desc ? "descending" : "ascending") : "none"}
                  >
                    {c.label}
                    {sortKey === c.key ? (
                      desc ? (
                        <ArrowDown className="size-3" aria-hidden />
                      ) : (
                        <ArrowUp className="size-3" aria-hidden />
                      )
                    ) : null}
                  </button>
                </th>
              ))}
              <th scope="col" className="px-3 py-2.5 text-right font-medium text-[var(--text-secondary)]">
                Share
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => (
              <tr key={p.id} className="border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-2)]">
                <td className="max-w-[320px] px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[var(--text-primary)]" title={p.name}>
                      {truncate(p.name, 54)}
                    </span>
                    {p.url ? (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="shrink-0 text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
                        aria-label={`Open ${p.name} on the marketplace`}
                      >
                        <ExternalLink className="size-3" aria-hidden />
                      </a>
                    ) : null}
                  </div>
                  {p.category ? (
                    <span className="mt-0.5 block text-[10px] text-[var(--text-muted)]">{p.category}</span>
                  ) : null}
                </td>
                {COLUMNS.map((c) => (
                  <td
                    key={c.key}
                    className="tabular px-3 py-2.5 text-right text-[var(--text-primary)]"
                    title={c.key === "revenue" ? fullIdr(p.revenue) : undefined}
                  >
                    {c.format(p)}
                  </td>
                ))}
                <td className="tabular px-3 py-2.5 text-right text-[var(--text-secondary)]">
                  {percent(p.revenueShare, 1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visible.length < filtered.length ? (
        <div className="border-t border-[var(--border)] p-3 text-center">
          <button
            type="button"
            onClick={() => setLimit((l) => l + 50)}
            className="rounded-lg px-4 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
          >
            Show 50 more ({fullNumber(filtered.length - visible.length)} remaining)
          </button>
        </div>
      ) : null}
    </section>
  );
}
