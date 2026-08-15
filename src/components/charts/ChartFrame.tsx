"use client";

import { Table2, BarChart3 } from "lucide-react";
import { useState, type ReactNode } from "react";

/**
 * Shared shell for every chart on the page.
 *
 * Carries the title, the optional footnote, and the chart/table toggle —
 * the table view is the accessibility fallback, so it is present on every
 * chart rather than being decided case by case.
 */
export function ChartFrame({
  title,
  subtitle,
  footnote,
  columns,
  rows,
  action,
  children,
  height = 280,
}: {
  title: string;
  subtitle?: string;
  footnote?: string;
  /** Column headers for the table view. */
  columns: string[];
  /** Row cells for the table view, already formatted. */
  rows: (string | number)[][];
  action?: ReactNode;
  children: ReactNode;
  height?: number;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");

  return (
    <section className="card flex flex-col p-5">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">{title}</h3>
          {subtitle ? (
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">{subtitle}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {action}
          <div
            role="group"
            aria-label={`${title} view`}
            className="flex rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5"
          >
            <button
              type="button"
              onClick={() => setView("chart")}
              aria-pressed={view === "chart"}
              title="Chart view"
              className={`rounded-md p-1.5 transition-colors ${
                view === "chart"
                  ? "bg-[var(--surface-3)] text-[var(--text-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              <BarChart3 className="size-3.5" aria-hidden />
              <span className="sr-only">Chart</span>
            </button>
            <button
              type="button"
              onClick={() => setView("table")}
              aria-pressed={view === "table"}
              title="Table view"
              className={`rounded-md p-1.5 transition-colors ${
                view === "table"
                  ? "bg-[var(--surface-3)] text-[var(--text-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              <Table2 className="size-3.5" aria-hidden />
              <span className="sr-only">Table</span>
            </button>
          </div>
        </div>
      </header>

      {view === "chart" ? (
        <div style={{ height }} className="min-w-0">
          {children}
        </div>
      ) : (
        <div style={{ height }} className="overflow-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-[var(--surface-2)]">
              <tr>
                {columns.map((c, i) => (
                  <th
                    key={c}
                    scope="col"
                    className={`px-3 py-2 font-medium text-[var(--text-secondary)] ${i > 0 ? "text-right" : ""}`}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="border-t border-[var(--border)]">
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`px-3 py-2 ${
                        ci > 0 ? "tabular text-right text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {footnote ? (
        <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-muted)]">{footnote}</p>
      ) : null}
    </section>
  );
}

/**
 * Single-line category tick.
 *
 * Recharts' default tick wraps long category labels onto a second line, which
 * collides with the neighbouring bar on a dense vertical chart. A plain
 * `<text>` never wraps — callers truncate the label instead.
 */
export function SingleLineTick({
  x,
  y,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string | number };
}) {
  return (
    <text
      x={x}
      y={y}
      dy={4}
      dx={-4}
      textAnchor="end"
      fill="var(--text-muted)"
      fontSize={11}
    >
      {payload?.value}
    </text>
  );
}

/** Consistent tooltip surface for every Recharts chart in the app. */
export function TooltipCard({
  label,
  rows,
}: {
  label: string;
  rows: { key: string; value: string; color?: string }[];
}) {
  return (
    <div className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 py-2 shadow-xl">
      <p className="mb-1.5 text-xs font-medium text-[var(--text-primary)]">{label}</p>
      <dl className="space-y-1">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-3 text-[11px]">
            {r.color ? (
              <span aria-hidden className="size-2 shrink-0 rounded-sm" style={{ background: r.color }} />
            ) : null}
            <dt className="text-[var(--text-secondary)]">{r.key}</dt>
            <dd className="tabular ml-auto font-medium text-[var(--text-primary)]">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
