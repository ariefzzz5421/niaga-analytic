/**
 * Apify actor runner.
 *
 * TikTok Shop has no public catalogue endpoint, so the most reliable public
 * route is a maintained actor. Actor ids are configurable because the
 * marketplace of actors changes faster than this codebase does.
 */

const APIFY_BASE = "https://api.apify.com/v2";

export interface ApifyRunOptions {
  actorId: string;
  input: unknown;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Cap on dataset items pulled back. */
  limit?: number;
}

export class ApifyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApifyError";
  }
}

export function apifyToken(): string | undefined {
  const t = process.env.APIFY_TOKEN;
  return t && t.trim() ? t.trim() : undefined;
}

export function hasApify(): boolean {
  return Boolean(apifyToken());
}

/** Actor ids, overridable per deployment. */
export const ACTORS = {
  tiktokShop: process.env.APIFY_TIKTOK_SHOP_ACTOR ?? "novi~tiktok-shop-scraper",
  tiktokProfile: process.env.APIFY_TIKTOK_PROFILE_ACTOR ?? "clockworks~tiktok-scraper",
  shopee: process.env.APIFY_SHOPEE_ACTOR ?? "easyapi~shopee-product-scraper",
  tokopedia: process.env.APIFY_TOKOPEDIA_ACTOR ?? "easyapi~tokopedia-product-scraper",
};

/**
 * Run an actor synchronously and return its dataset items.
 * Uses the `run-sync-get-dataset-items` endpoint so we get results in one
 * round trip instead of polling a run id.
 */
export async function runActor<T>(opts: ApifyRunOptions): Promise<T[]> {
  const token = apifyToken();
  if (!token) throw new ApifyError("APIFY_TOKEN is not configured.");

  const url = new URL(`${APIFY_BASE}/acts/${opts.actorId}/run-sync-get-dataset-items`);
  url.searchParams.set("token", token);
  if (opts.limit) url.searchParams.set("limit", String(opts.limit));
  // Apify counts this in seconds and kills the run when it elapses.
  url.searchParams.set("timeout", String(Math.ceil((opts.timeoutMs ?? 90_000) / 1000)));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 90_000);
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(opts.input),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 200);
      throw new ApifyError(`Actor ${opts.actorId} returned HTTP ${res.status}: ${detail}`);
    }

    const items = (await res.json()) as T[];
    if (!Array.isArray(items)) {
      throw new ApifyError(`Actor ${opts.actorId} returned a non-array dataset.`);
    }
    return items;
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onAbort);
  }
}
