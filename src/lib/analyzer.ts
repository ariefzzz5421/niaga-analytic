import { analyse } from "./metrics";
import { isShortLink, parseStoreUrl } from "./platform";
import { resolveShortLink } from "./scrape/shortlink";
import { scrapeBlibli } from "./scrape/blibli";
import { availableTransports, hasLiveTransport } from "./scrape/gateway";
import { sampleScrape } from "./scrape/sample";
import { scrapeShopee } from "./scrape/shopee";
import { scrapeTiktok } from "./scrape/tiktok";
import { scrapeTokopedia } from "./scrape/tokopedia";
import type { Platform, ProgressEvent, ScrapeContext, ScrapeResult, StoreAnalysis, StoreRef } from "./types";

const ADAPTERS: Record<Platform, (ref: StoreRef, ctx: ScrapeContext) => Promise<ScrapeResult>> = {
  shopee: scrapeShopee,
  tiktok: scrapeTiktok,
  tokopedia: scrapeTokopedia,
  blibli: scrapeBlibli,
};

const MAX_PRODUCTS = Number(process.env.MAX_PRODUCTS ?? 240);
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_SECONDS ?? 900) * 1000;

/**
 * Process-local cache. Good enough for a single node and for keeping a demo
 * from re-scraping on every reload; swap for Redis when running more than one
 * instance.
 */
const cache = new Map<string, { at: number; analysis: StoreAnalysis }>();

function cacheKey(ref: StoreRef): string {
  return `${ref.platform}:${ref.handle.toLowerCase()}`;
}

function readCache(ref: StoreRef): StoreAnalysis | null {
  const hit = cache.get(cacheKey(ref));
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(cacheKey(ref));
    return null;
  }
  return hit.analysis;
}

function writeCache(ref: StoreRef, analysis: StoreAnalysis): void {
  // Sample data is cheap to regenerate and shouldn't squat in the cache.
  if (analysis.sample) return;
  cache.set(cacheKey(ref), { at: Date.now(), analysis });
  if (cache.size > 200) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) cache.delete(oldest[0]);
  }
}

export interface AnalyzeOptions {
  url: string;
  onProgress?: (event: ProgressEvent) => void;
  signal?: AbortSignal;
  /** Skip the live attempt entirely and serve sample data. */
  forceSample?: boolean;
  /** Bypass the cache for this request. */
  refresh?: boolean;
}

export async function analyzeStore(opts: AnalyzeOptions): Promise<StoreAnalysis> {
  const started = Date.now();
  const emit = (event: ProgressEvent) => opts.onProgress?.(event);

  emit({ stage: "resolve", message: "Reading the store URL…", progress: 6 });

  // Share links (shp.ee, vt.tiktok.com, …) carry no seller id, so they have to
  // be followed before anything can be parsed out of them.
  let target = opts.url;
  if (isShortLink(target)) {
    emit({ stage: "resolve", message: "Following share link…", progress: 8 });
    target = await resolveShortLink(target, opts.signal);
    emit({ stage: "resolve", message: `Share link → ${target}`, progress: 10 });
  }

  const ref = parseStoreUrl(target);

  emit({
    stage: "resolve",
    message: `Detected ${ref.platform} store "${ref.handle}"`,
    progress: 12,
  });

  if (!opts.refresh && !opts.forceSample) {
    const cached = readCache(ref);
    if (cached) {
      emit({ stage: "done", message: "Served from cache", progress: 100 });
      return { ...cached, durationMs: Date.now() - started };
    }
  }

  const ctx: ScrapeContext = { emit, signal: opts.signal, maxProducts: MAX_PRODUCTS };

  let result: ScrapeResult;
  if (opts.forceSample) {
    emit({ stage: "connect", message: "Sample mode — skipping live fetch", progress: 30 });
    result = sampleScrape(ref);
  } else {
    emit({
      stage: "connect",
      message: `Opening ${ref.platform} via ${availableTransports().join(" → ")}…`,
      progress: 18,
    });
    try {
      result = await ADAPTERS[ref.platform](ref, ctx);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);

      // A hard failure with no live transport configured is the expected
      // first-run path, so fall back to samples instead of erroring out.
      if (!hasLiveTransport() || process.env.ALLOW_SAMPLE_FALLBACK !== "false") {
        emit({
          stage: "connect",
          message: "Live fetch unavailable — falling back to sample data",
          progress: 45,
        });
        result = sampleScrape(ref);
        result.log.unshift(`live fetch failed: ${reason}`);
      } else {
        throw err;
      }
    }
  }

  emit({ stage: "analyze", message: "Computing revenue model…", progress: 90 });
  const analysis = analyse(result, Date.now() - started);
  writeCache(ref, analysis);

  emit({ stage: "done", message: "Analysis ready", progress: 100 });
  return analysis;
}
