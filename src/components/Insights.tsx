"use client";

import { AlertTriangle, CheckCircle2, CircleAlert, Info, ShieldAlert } from "lucide-react";

import type { Confidence, Insight } from "@/lib/types";

/** Status colour never travels alone — every one of these ships with an icon. */
const SEVERITY = {
  good: { icon: CheckCircle2, color: "var(--good)", label: "Strength" },
  warning: { icon: AlertTriangle, color: "var(--warning)", label: "Watch" },
  serious: { icon: CircleAlert, color: "var(--serious)", label: "Risk" },
  critical: { icon: ShieldAlert, color: "var(--critical)", label: "Critical" },
  neutral: { icon: Info, color: "var(--text-secondary)", label: "Context" },
} as const;

export function InsightList({ insights }: { insights: Insight[] }) {
  if (!insights.length) return null;

  return (
    <section className="card p-5">
      <h3 className="mb-4 text-sm font-semibold tracking-tight">What the numbers say</h3>
      <ul className="space-y-3">
        {insights.map((insight) => {
          const s = SEVERITY[insight.severity];
          const Icon = s.icon;
          return (
            <li key={insight.id} className="flex gap-3">
              <Icon className="mt-0.5 size-4 shrink-0" style={{ color: s.color }} aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug text-[var(--text-primary)]">
                  <span className="sr-only">{s.label}: </span>
                  {insight.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">{insight.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ConfidencePanel({ confidence, log }: { confidence: Confidence; log: string[] }) {
  const tone =
    confidence.level === "high"
      ? "var(--good)"
      : confidence.level === "medium"
        ? "var(--warning)"
        : "var(--critical)";

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold tracking-tight">Data confidence</h3>
        <span className="text-xs font-medium capitalize" style={{ color: tone }}>
          {confidence.level} · {confidence.score}/100
        </span>
      </div>

      <div
        className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-3)]"
        role="meter"
        aria-valuenow={confidence.score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Data confidence score"
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${confidence.score}%`, background: tone }}
        />
      </div>

      <ul className="space-y-2">
        {confidence.reasons.map((reason) => (
          <li key={reason} className="flex gap-2 text-xs leading-relaxed text-[var(--text-secondary)]">
            <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-[var(--text-muted)]" />
            {reason}
          </li>
        ))}
      </ul>

      {log.length ? (
        <details className="mt-4 border-t border-[var(--border)] pt-3">
          <summary className="cursor-pointer text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Pipeline log
          </summary>
          <pre className="mono mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[10px] leading-relaxed text-[var(--text-muted)]">
            {log.join("\n")}
          </pre>
        </details>
      ) : null}
    </section>
  );
}
