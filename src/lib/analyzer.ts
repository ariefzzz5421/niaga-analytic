import { analyse } from "./metrics.ts";
import { isShortLink, parseStoreUrl } from "./platform.ts";
import { hasApify } from "./scrape/apify.ts";
import { resolveShortLink } from "./scrape/shortlink.ts";
import { tiktokAuth } from "./scrape/tiktok-signature.ts";
import { scrapeBlibli } from "./scrape/blibli.ts";
import { scrapeBukalapak } from "./scrape/bukalapak.ts";
import { scrapeLazada } from "./scrape/lazada.ts";
import { availableTransports, hasLiveTransport } from "./scrape/gateway.ts";
import { sampleScrape } from "./scrape/sample.ts";
import { scrapeShopee } from "./scrape/shopee.ts";
import { scrapeTiktok } from "./scrape/tiktok.ts";
import { scrapeTokopedia } from "./scrape/tokopedia.ts";
import type { Platform, ProgressEvent, ScrapeContext, ScrapeResult, StoreAnalysis, StoreRef } from "./types";

const ADAPTERS: Record<Platform, (ref: StoreRef, ctx: ScrapeContext) => Promise<ScrapeResult>> = {
  shopee: scrapeShopee,
  tiktok: scrapeTiktok,
  tokopedia: scrapeTokopedia,
  blibli: scrapeBlibli,
  lazada: scrapeLazada,
  bukalapak: scrapeBukalapak,
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

/**
 * Whether a platform has any route that can return live data right now.
 * Shopee/Tokopedia/Blibli need a proxy transport; TikTok can also go through
 * its own Open API or an Apify actor.
 */
export function isPlatformConfigured(platform: Platform): boolean {
  if (platform === "tiktok") {
    return Boolean(tiktokAuth()) || hasApify() || hasLiveTransport();
  }
  return hasLiveTransport();
}

/** What the operator has to set up for this platform, in plain language. */
export function setupHint(platform: Platform): string {
  if (platform === "tiktok") {
    return (
      "TikTok Shop needs one of: TIKTOK_APP_KEY + TIKTOK_APP_SECRET + TIKTOK_ACCESS_TOKEN " +
      "(your own shop, exact numbers), APIFY_TOKEN (any public seller), or a scraping " +
      "provider key such as SCRAPERAPI_KEY."
    );
  }
  const label = platform.charAt(0).toUpperCase() + platform.slice(1);
  return (
    `${label} blocks datacentre IPs, so it needs a residential scraping provider. ` +
    "Set one of SCRAPERAPI_KEY, SCRAPINGBEE_KEY, ZENROWS_KEY or BRIGHTDATA_PROXY_URL " +
    "and redeploy. See .env.example."
  );
}

export class NotConfiguredError extends Error {
  readonly platform: Platform;
  readonly hint: string;

  constructor(platform: Platform) {
    super(
      `No live data source is configured for ${platform}, so there is nothing real to report.`,
    );
    this.name = "NotConfiguredError";
    this.platform = platform;
    this.hint = setupHint(platform);
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
    // Fail before spending 20s on transports that cannot possibly work, and
    // say exactly what is missing instead of reporting a generic timeout.
    if (!isPlatformConfigured(ref.platform) && process.env.DEMO_MODE !== "true") {
      throw new NotConfiguredError(ref.platform);
    }

    emit({
      stage: "connect",
      message: `Opening ${ref.platform} via ${availableTransports().join(" → ")}…`,
      progress: 18,
    });
    try {
      result = await ADAPTERS[ref.platform](ref, ctx);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);

      // Substituting invented numbers for a failed scrape is worse than
      // failing: the dashboard looks identical either way, so a silent
      // fallback quietly turns fiction into a business decision. Samples are
      // opt-in only — DEMO_MODE for a public demo deploy, or `sample: true`
      // on the request.
      if (process.env.DEMO_MODE === "true") {
        emit({
          stage: "connect",
          message: "DEMO_MODE — live fetch failed, serving sample data",
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
