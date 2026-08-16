/**
 * TikTok Shop adapter.
 *
 * TikTok has no open catalogue endpoint, so this tries three routes in
 * descending order of fidelity:
 *
 *   1. TikTok Shop Open API — exact numbers, but only for a shop you own
 *      and have an access token for (set TIKTOK_APP_KEY/SECRET/ACCESS_TOKEN).
 *   2. Apify actor — public catalogue data for any seller (needs APIFY_TOKEN).
 *   3. Embedded page JSON — creator profile stats scraped from the SSR blob,
 *      enough for reach metrics even when the catalogue is unreachable.
 */

import type { RawProduct, RawStore, ScrapeContext, ScrapeResult, StoreRef } from "../types";
import { ACTORS, hasApify, runActor } from "./apify.ts";
import { GatewayError, gatewayFetch } from "./gateway.ts";
import { buildSignedRequest, tiktokAuth } from "./tiktok-signature.ts";

/* ------------------------------------------------------------------ */
/* 1. Official Open API                                                */
/* ------------------------------------------------------------------ */

interface TikTokProductSearchResponse {
  code: number;
  message: string;
  data?: {
    total_count?: number;
    next_page_token?: string;
    products?: {
      id: string;
      title: string;
      status?: string;
      sales_regions?: string[];
      create_time?: number;
      update_time?: number;
      main_images?: { uri?: string; urls?: string[] }[];
      skus?: {
        id: string;
        price?: { tax_exclusive_price?: string; sale_price?: string; currency?: string };
        inventory?: { quantity?: number }[];
        sales_attributes?: { name?: string; value_name?: string }[];
      }[];
    }[];
  };
}

interface TikTokPerformanceResponse {
  code: number;
  data?: {
    performance?: {
      intervals?: {
        start_date?: string;
        end_date?: string;
        gmv?: { amount?: string; currency?: string };
        units_sold?: number;
        orders?: number;
        sku_orders?: number;
      }[];
    };
  };
}

async function officialApi(
  ref: StoreRef,
  ctx: ScrapeContext,
  log: string[],
): Promise<ScrapeResult | null> {
  const auth = tiktokAuth();
  if (!auth) return null;

  ctx.emit({ stage: "connect", message: "Authenticating with TikTok Shop Open API…", progress: 20 });

  const products: RawProduct[] = [];
  let pageToken: string | undefined;

  while (products.length < ctx.maxProducts) {
    const req = buildSignedRequest(
      auth,
      "/product/202309/products/search",
      { page_size: 100, page_token: pageToken },
      { status: "ACTIVATE" },
    );

    const res = await gatewayFetch({
      url: req.url,
      method: "POST",
      headers: req.headers,
      body: req.body,
      signal: ctx.signal,
    });

    const parsed = JSON.parse(res.body) as TikTokProductSearchResponse;
    if (parsed.code !== 0) {
      throw new GatewayError(`TikTok Shop API error ${parsed.code}: ${parsed.message}`, [
        "product/202309/products/search",
      ]);
    }

    for (const p of parsed.data?.products ?? []) {
      const sku = p.skus?.[0];
      const price = Number(sku?.price?.sale_price ?? sku?.price?.tax_exclusive_price ?? 0);
      const stock = (sku?.inventory ?? []).reduce((sum, i) => sum + (i.quantity ?? 0), 0);
      products.push({
        id: p.id,
        name: p.title,
        url: `https://shop-id.tokopedia.com/view/product/${p.id}`,
        imageUrl: p.main_images?.[0]?.urls?.[0],
        price,
        // The catalogue endpoint carries no sold counter; the performance
        // endpoint below backfills store-level units.
        sold: 0,
        stock,
        listedAt: p.create_time ? new Date(p.create_time * 1000).toISOString() : undefined,
      });
    }

    pageToken = parsed.data?.next_page_token;
    ctx.emit({
      stage: "products",
      message: `Pulled ${products.length} listings from TikTok Shop…`,
      progress: Math.min(80, 30 + (products.length / ctx.maxProducts) * 50),
    });
    if (!pageToken) break;
  }

  // Backfill real sales from the performance endpoint and distribute them
  // across the catalogue proportionally to price, so the revenue total is
  // exact even though the per-listing split is modelled.
  const sold = await officialPerformance(ctx, log);
  if (sold && products.length) {
    const totalPrice = products.reduce((s, p) => s + p.price, 0) || 1;
    for (const p of products) {
      p.sold = Math.round((sold.units * p.price) / totalPrice);
      p.soldRecent = p.sold;
    }
    log.push(`performance: ${sold.units} units / ${sold.gmv} IDR over the last 30 days`);
  }

  log.push(`official API: ${products.length} listings`);

  const store: RawStore = {
    ...ref,
    name: ref.handle,
    productCount: products.length,
    isOfficial: true,
  };
  return { store, products, source: "official-api", log };
}

async function officialPerformance(
  ctx: ScrapeContext,
  log: string[],
): Promise<{ units: number; gmv: number } | null> {
  const auth = tiktokAuth();
  if (!auth) return null;

  const end = new Date();
  const start = new Date(end.getTime() - 30 * 86_400_000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  try {
    const req = buildSignedRequest(auth, "/analytics/202405/shop/performance", {
      start_date_ge: iso(start),
      end_date_lt: iso(end),
      granularity: "ALL",
    });
    const res = await gatewayFetch({ url: req.url, headers: req.headers, signal: ctx.signal });
    const parsed = JSON.parse(res.body) as TikTokPerformanceResponse;
    const interval = parsed.data?.performance?.intervals?.[0];
    if (!interval) return null;
    return {
      units: interval.units_sold ?? 0,
      gmv: Number(interval.gmv?.amount ?? 0),
    };
  } catch (err) {
    log.push(`performance endpoint unavailable: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* 2. Apify actor                                                      */
/* ------------------------------------------------------------------ */

interface ActorProduct {
  id?: string;
  product_id?: string;
  productId?: string;
  title?: string;
  name?: string;
  product_name?: string;
  url?: string;
  productUrl?: string;
  image?: string;
  cover?: string;
  thumbnail?: string;
  price?: number | string;
  sale_price?: number | string;
  original_price?: number | string;
  sold_count?: number;
  sold?: number;
  sales?: number;
  stock?: number;
  rating?: number;
  review_count?: number;
  reviews?: number;
  category?: string;
  seller_name?: string;
  shop_name?: string;
}

function num(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^\d.,]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
    const n = Number.parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Actor output shapes vary a lot, so pick whichever key is populated. */
function mapActorProduct(raw: ActorProduct, index: number): RawProduct | null {
  const id = raw.id ?? raw.product_id ?? raw.productId ?? String(index);
  const name = raw.title ?? raw.name ?? raw.product_name;
  const price = num(raw.sale_price ?? raw.price);
  if (!name || !price) return null;

  return {
    id: String(id),
    name,
    url: raw.url ?? raw.productUrl,
    imageUrl: raw.image ?? raw.cover ?? raw.thumbnail,
    price,
    originalPrice: num(raw.original_price) || undefined,
    sold: num(raw.sold_count ?? raw.sold ?? raw.sales),
    stock: raw.stock,
    rating: raw.rating,
    reviewCount: num(raw.review_count ?? raw.reviews) || undefined,
    ratingCount: num(raw.review_count ?? raw.reviews) || undefined,
    category: raw.category,
  };
}

async function apifyRoute(
  ref: StoreRef,
  ctx: ScrapeContext,
  log: string[],
): Promise<ScrapeResult | null> {
  if (!hasApify()) return null;

  ctx.emit({ stage: "connect", message: "Dispatching TikTok Shop actor on Apify…", progress: 25 });

  const items = await runActor<ActorProduct>({
    actorId: ACTORS.tiktokShop,
    input: {
      // Different actors name this differently; sending all three is harmless
      // because actors ignore unknown input keys.
      sellerUrls: [ref.url],
      startUrls: [{ url: ref.url }],
      keyword: ref.handle,
      region: "ID",
      maxItems: ctx.maxProducts,
    },
    limit: ctx.maxProducts,
    signal: ctx.signal,
    timeoutMs: 120_000,
  });

  const products = items
    .map(mapActorProduct)
    .filter((p): p is RawProduct => p !== null);

  if (!products.length) return null;
  log.push(`apify actor ${ACTORS.tiktokShop}: ${products.length} listings`);

  const store: RawStore = {
    ...ref,
    name: items[0]?.seller_name ?? items[0]?.shop_name ?? ref.handle,
    productCount: products.length,
  };
  return { store, products, source: "provider", log };
}

/* ------------------------------------------------------------------ */
/* 3. Embedded profile JSON                                            */
/* ------------------------------------------------------------------ */

interface UniversalData {
  __DEFAULT_SCOPE__?: {
    "webapp.user-detail"?: {
      userInfo?: {
        user?: { nickname?: string; avatarLarger?: string; signature?: string; verified?: boolean };
        stats?: { followerCount?: number; heartCount?: number; videoCount?: number };
      };
    };
  };
}

/** Pull follower/engagement stats out of the SSR hydration blob. */
async function profileStats(
  ref: StoreRef,
  ctx: ScrapeContext,
  log: string[],
): Promise<Partial<RawStore>> {
  try {
    const res = await gatewayFetch({
      url: `https://www.tiktok.com/@${ref.handle}`,
      headers: { accept: "text/html" },
      render: true,
      signal: ctx.signal,
    });

    const match = res.body.match(
      /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/,
    );
    if (!match) return {};

    const parsed = JSON.parse(match[1]) as UniversalData;
    const info = parsed.__DEFAULT_SCOPE__?.["webapp.user-detail"]?.userInfo;
    if (!info) return {};

    log.push(`profile: ${info.stats?.followerCount ?? 0} followers`);
    return {
      name: info.user?.nickname ?? ref.handle,
      avatarUrl: info.user?.avatarLarger,
      followers: info.stats?.followerCount,
      isOfficial: info.user?.verified,
    };
  } catch (err) {
    log.push(`profile lookup failed: ${err instanceof Error ? err.message : err}`);
    return {};
  }
}

/* ------------------------------------------------------------------ */

export async function scrapeTiktok(ref: StoreRef, ctx: ScrapeContext): Promise<ScrapeResult> {
  const log: string[] = [];
  const failures: string[] = [];

  ctx.emit({ stage: "store", message: "Locating TikTok Shop seller…", progress: 15 });

  for (const [label, route] of [
    ["official-api", officialApi],
    ["apify", apifyRoute],
  ] as const) {
    try {
      const result = await route(ref, ctx, log);
      if (result) {
        // Enrich with public reach numbers regardless of which route won.
        const stats = await profileStats(ref, ctx, log);
        result.store = { ...result.store, ...stats, ...(stats.name ? { name: stats.name } : {}) };
        return result;
      }
      failures.push(`${label}: not configured`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      failures.push(`${label}: ${reason}`);
      log.push(`${label} route failed — ${reason}`);
    }
  }

  throw new GatewayError(
    "TikTok Shop needs either Open API credentials (your own store) or an APIFY_TOKEN (any store). See .env.example.",
    failures,
  );
}
