import type { ReactNode } from "react";

import { PLATFORM_META } from "@/lib/platform";
import type { Platform } from "@/lib/types";

import { BrandIcon } from "./brand-icons";

export function Card({
  children,
  className = "",
  quiet = false,
}: {
  children: ReactNode;
  className?: string;
  quiet?: boolean;
}) {
  return <div className={`${quiet ? "card-quiet" : "card"} ${className}`}>{children}</div>;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5">
      {eyebrow ? (
        <p className="mono mb-2 text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">{title}</h2>
      {description ? (
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
          {description}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Platform identity chip. The brand colour lives here and nowhere else —
 * it is always paired with the platform name, never carrying meaning alone.
 */
export function PlatformBadge({ platform, size = "md" }: { platform: Platform; size?: "sm" | "md" }) {
  const meta = PLATFORM_META[platform];
  const pad = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${pad}`}
      style={{
        borderColor: `${meta.brand}55`,
        background: `${meta.brand}1a`,
        color: "var(--text-primary)",
      }}
    >
      <BrandIcon
        platform={platform}
        className={size === "sm" ? "size-3.5" : "size-4"}
        style={{ color: meta.brand }}
      />
      {meta.label}
    </span>
  );
}

const SEVERITY_STYLE = {
  good: { color: "var(--good)", label: "Good" },
  warning: { color: "var(--warning)", label: "Watch" },
  serious: { color: "var(--serious)", label: "Serious" },
  critical: { color: "var(--critical)", label: "Critical" },
  neutral: { color: "var(--text-secondary)", label: "Note" },
} as const;

export function SeverityDot({ severity }: { severity: keyof typeof SEVERITY_STYLE }) {
  const s = SEVERITY_STYLE[severity];
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium" style={{ color: s.color }}>
      <span aria-hidden className="size-2 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

export function Pill({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "accent" | "warning";
}) {
  const tones = {
    default: "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)]",
    accent: "border-[color:var(--accent)]/40 bg-[var(--accent-soft)] text-[#86b6ef]",
    warning: "border-[color:var(--warning)]/35 bg-[color:var(--warning)]/10 text-[var(--warning)]",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`shimmer rounded-lg bg-[var(--surface-2)] ${className}`} />;
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] px-6 py-12 text-center">
      <p className="text-sm font-medium text-[var(--text-primary)]">{title}</p>
      <p className="max-w-sm text-xs leading-relaxed text-[var(--text-muted)]">{detail}</p>
    </div>
  );
}
