"use client";

import { Check, Loader2, X } from "lucide-react";

import type { AnalyzeFailure } from "@/lib/useAnalyze";
import type { ProgressEvent, ProgressStage } from "@/lib/types";

const STAGES: { id: ProgressStage; label: string }[] = [
  { id: "resolve", label: "Resolve store URL" },
  { id: "connect", label: "Open marketplace session" },
  { id: "store", label: "Read seller profile" },
  { id: "products", label: "Pull catalogue" },
  { id: "analyze", label: "Model revenue" },
];

const ORDER = STAGES.map((s) => s.id);

/**
 * Live view of the scrape pipeline, driven by the SSE progress stream.
 * Doubles as the error surface — a failed run leaves the failing stage
 * marked rather than replacing the whole panel with a toast.
 */
export function PipelineConsole({
  events,
  error,
}: {
  events: ProgressEvent[];
  error?: AnalyzeFailure | null;
}) {
  const latest = events.at(-1);
  const currentIndex = latest ? ORDER.indexOf(latest.stage) : -1;
  const done = latest?.stage === "done";
  const progress = latest?.progress ?? 0;

  return (
    <div className="card animate-fade-up overflow-hidden">
      <div className="h-0.5 w-full bg-[var(--surface-3)]">
        <div
          className="h-full transition-[width] duration-300 ease-out"
          style={{
            width: `${done ? 100 : progress}%`,
            background: error ? "var(--critical)" : "var(--accent)",
          }}
        />
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-[minmax(0,240px)_1fr]">
        <ol className="space-y-2.5">
          {STAGES.map((stage, i) => {
            const complete = done || (currentIndex > -1 && i < currentIndex);
            const active = !done && !error && i === currentIndex;
            const failed = Boolean(error) && i === currentIndex;

            return (
              <li key={stage.id} className="flex items-center gap-2.5 text-xs">
                <span
                  className={`grid size-4 shrink-0 place-items-center rounded-full border ${
                    failed
                      ? "border-[var(--critical)] bg-[color:var(--critical)]/15"
                      : complete
                        ? "border-[var(--good)] bg-[color:var(--good)]/15"
                        : active
                          ? "pulse-ring border-[var(--accent)]"
                          : "border-[var(--border-strong)]"
                  }`}
                >
                  {failed ? (
                    <X className="size-2.5 text-[var(--critical)]" aria-hidden />
                  ) : complete ? (
                    <Check className="size-2.5 text-[var(--good)]" aria-hidden />
                  ) : active ? (
                    <Loader2 className="size-2.5 animate-spin text-[var(--accent)]" aria-hidden />
                  ) : null}
                </span>
                <span
                  className={
                    complete || active
                      ? "text-[var(--text-primary)]"
                      : "text-[var(--text-muted)]"
                  }
                >
                  {stage.label}
                </span>
              </li>
            );
          })}
        </ol>

        <div
          className="mono max-h-40 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--plane)] p-3 text-[11px] leading-relaxed"
          role="log"
          aria-live="polite"
          aria-label="Analysis progress"
        >
          {events.map((e, i) => (
            <p key={i} className="text-[var(--text-secondary)]">
              <span className="text-[var(--text-muted)]">
                {String(Math.round(e.progress)).padStart(3, " ")}%{" "}
              </span>
              {e.message}
            </p>
          ))}
          {error ? <p className="mt-1 text-[var(--critical)]">✕ {error.message}</p> : null}
        </div>
      </div>
    </div>
  );
}
