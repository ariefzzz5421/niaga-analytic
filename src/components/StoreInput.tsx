"use client";

import { ArrowRight, Link2, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { Platform } from "@/lib/types";
import { PLATFORM_LIST, tryParseStoreUrl } from "@/lib/platform";
import { PlatformBadge } from "./ui";

const CHIP_META: Record<Platform, { logo: string; share: string }> = {
  shopee: { logo: "/marketplaces/shopee.svg", share: "54%" },
  tiktok: { logo: "/marketplaces/tiktok.png", share: "38%*" },
  tokopedia: { logo: "/marketplaces/tokopedia-icon.png", share: "38%*" },
  blibli: { logo: "https://www.blibli.com/favicon.ico", share: "3%" },
};

export function StoreInput({ onSubmit, loading, defaultValue = "" }: { onSubmit: (url: string) => void; loading: boolean; defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  const detected = useMemo(() => (value.trim() ? tryParseStoreUrl(value) : null), [value]);
  const invalid = value.trim().length > 6 && !detected;

  return (
    <div className="w-full">
      <form onSubmit={(e) => { e.preventDefault(); if (value.trim() && !loading) onSubmit(value.trim()); }}>
        <div className={`card-quiet flex items-center gap-2 p-2 transition-colors ${invalid ? "border-[color:var(--critical)]/50" : "focus-within:border-[var(--accent)]"}`}>
          <Link2 className="ml-2 size-4 shrink-0 text-[var(--text-muted)]" aria-hidden />
          <input type="text" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Paste an official store link — shopee.co.id/… or tiktok.com/@…" aria-label="Store URL" spellCheck={false} autoComplete="off" className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none" />
          {detected ? <span className="hidden shrink-0 sm:block"><PlatformBadge platform={detected.platform} size="sm" /></span> : null}
          <button type="submit" disabled={loading || !value.trim()} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">{loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ArrowRight className="size-4" aria-hidden />}{loading ? "Analyzing" : "Analyze"}</button>
        </div>
      </form>
      <div className="mt-2 min-h-5 px-1">{invalid ? <p className="text-xs text-[var(--critical)]">Not a recognised marketplace link. Supported: {PLATFORM_LIST.map((p) => p.label).join(", ")}.</p> : detected ? <p className="mono text-[11px] text-[var(--text-muted)]">→ {detected.platform}/{detected.handle}</p> : null}</div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-[var(--text-muted)]">Try:</span>
        {PLATFORM_LIST.map((meta) => <button key={meta.id} type="button" onClick={() => { setValue(meta.example); if (!loading) onSubmit(meta.example); }} disabled={loading} className="group inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:opacity-40" title={meta.hint}>
          <span className={`grid size-6 shrink-0 place-items-center overflow-hidden rounded-md p-0.5 ${meta.id === "tiktok" ? "bg-black" : "bg-white"}`}><img src={CHIP_META[meta.id].logo} alt={`${meta.label} logo`} className="size-full object-contain" /></span>
          <span>{meta.label}</span>
          <span className="rounded-full bg-[var(--surface-3)] px-1.5 py-0.5 text-[9px] tabular-nums text-[var(--text-muted)]">{CHIP_META[meta.id].share}</span>
          {meta.flagship ? <span className="rounded bg-[var(--accent-soft)] px-1 text-[9px] uppercase tracking-wide text-[#86b6ef]">full</span> : null}
        </button>)}
      </div>
      <p className="mt-2 text-[9px] leading-relaxed text-[var(--text-muted)]">2025 Indonesia GMV share. * TikTok Shop + Tokopedia are reported as a combined 38% by Momentum Works; this is not an individual-platform share.</p>
    </div>
  );
}
