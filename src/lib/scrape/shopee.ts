/**
 * Shopee Indonesia adapter.
 *
 * Shopee's storefront is a SPA driven by an undocumented `/api/v4` JSON API.
 * Those endpoints answer without auth but do check for browser-ish headers
 * and rate-limit hard by IP, which is what the gateway's provider chain is
 * for. Prices come back in micro units (IDR x 100000).
 */

import type { RawProduct, RawStore, ScrapeContext, ScrapeResult, StoreRef } from "../types";
import { GatewayError, gatewayJson } from "./gateway.ts";

const ORIGIN = "https://shopee.co.id";
const MICRO = 100_000;
const PAGE_SIZE = 60;

/** Shopee rejects requests that do not look like its own web client. */
function shopeeHeaders(referer: string): Record<string, string> {
  const headers: Record<string, string> = {
    accept: "application/json",
    referer,
    "x-api-source": "pc",
    "x-requested-with": "XMLHttpRequest",
    "x-shopee-language": "id",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    // Present on every request the real client makes; absent it, some
    // endpoints answer with an empty `data` object.
    "af-ac-enc-dat": "null",
  };
  // A logged-out session cookie lifts several of the stricter rate limits.
  // Grab one from a browser devtools Network tab and set SHOPEE_COOKIE.
  const cookie = process.env.SHOPEE_COOKIE?.trim();
  if (cookie) headers.cookie = cookie;
  return headers;
}

/* ------------------------------------------------------------------ */
/* Wire shapes (only the fields we consume)                            */
/* ------------------------------------------------------------------ */

interface ShopeeShopDetail {
  data?: {
    shopid?: number;
    userid?: number;
    name?: string;
    account?: { username?: string; portrait?: string };
    place?: string;
    item_count?: number;
    follower_count?: number;
    rating_star?: number;
    rating_normal?: number;
    rating_bad?: number;
    rating_good?: number;
    response_rate?: number;
    ctime?: number;
    is_official_shop?: boolean;
    shop_location?: string;
  };
  error?: number;
  error_msg?: string;
}

interface ShopeeItemBasic {
  itemid: number;
  shopid: number;
  name: string;
  image?: string;
  images?: string[];
  currency?: string;
  stock?: number;
  sold?: number;
  historical_sold?: number;
  liked_count?: number;
  price?: number;
  price_min?: number;
  price_max?: number;
  price_before_discount?: number;
  raw_discount?: number;
  cmt_count?: number;
  ctime?: number;
  item_rating?: { rating_star?: number; rating_count?: number[] };
  categories?: { catid: number; display_name: string; no_sub?: boolean }[];
}

interface ShopeeSearchResponse {
  items?: { item_basic?: ShopeeItemBasic }[];
  total_count?: number;
  nomore?: boolean;
  error?: number;
}

/* ------------------------------------------------------------------ */
/* Mapping                                                             */
/* ------------------------------------------------------------------ */

function fromMicro(v: number | undefined): number {
  if (!v || v <= 0) return 0;
  return Math.round(v / MICRO);
}

function imageUrl(id: string | undefined): string | undefined {
  return id ? `https://down-id.img.susercontent.com/file/${id}` : undefined;
}

function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function mapProduct(raw: ShopeeItemBasic): RawProduct {
  // `price` is 0 on multi-variant listings; price_min is the honest floor.
  const price = fromMicro(raw.price || raw.price_min || raw.price_max);
  const original = fromMicro(raw.price_before_discount);
  const sold = raw.historical_sold ?? raw.sold ?? 0;

  return {
    id: String(raw.itemid),
    name: raw.name,
    url: `${ORIGIN}/${slugify(raw.name)}-i.${raw.shopid}.${raw.itemid}`,
    imageUrl: imageUrl(raw.image ?? raw.images?.[0]),
    price,
    originalPrice: original > price ? original : undefined,
    sold,
    // Shopee's `sold` is a 30-day counter while `historical_sold` is lifetime.
    soldRecent: raw.historical_sold != null && raw.sold != null ? raw.sold : undefined,
    stock: raw.stock,
    rating: raw.item_rating?.rating_star,
    ratingCount: raw.item_rating?.rating_count?.[0],
    reviewCount: raw.cmt_count,
    category: raw.categories?.at(-1)?.display_name ?? raw.categories?.[0]?.display_name,
    listedAt: raw.ctime ? new Date(raw.ctime * 1000).toISOString() : undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Steps                                                               */
/* ------------------------------------------------------------------ */

async function fetchShop(ref: StoreRef, ctx: ScrapeContext, log: string[]): Promise<RawStore> {
  const isNumeric = /^\d+$/.test(ref.handle);
  const endpoint = isNumeric
    ? `${ORIGIN}/api/v4/shop/get_shop_base?shopid=${ref.handle}`
    : `${ORIGIN}/api/v4/shop/get_shop_detail?username=${encodeURIComponent(ref.handle)}`;

  const { data, transport } = await gatewayJson<ShopeeShopDetail>({
    url: endpoint,
    headers: shopeeHeaders(ref.url),
    signal: ctx.signal,
  });

  if (!data.data?.shopid) {
    throw new GatewayError(
      data.error_msg
        ? `Shopee: ${data.error_msg}`
        : `Shopee has no shop called "${ref.handle}".`,
      [`shop lookup returned error ${data.error ?? "unknown"}`],
    );
  }

  const d = data.data;
  log.push(`shop resolved via ${transport} → shopid ${d.shopid}`);

  const goodBadNormal = (d.rating_good ?? 0) + (d.rating_normal ?? 0) + (d.rating_bad ?? 0);
  const ageMonths = d.ctime
    ? Math.max(1, Math.round((Date.now() / 1000 - d.ctime) / (60 * 60 * 24 * 30.44)))
    : undefined;

  return {
    ...ref,
    storeId: String(d.shopid),
    name: d.name ?? d.account?.username ?? ref.handle,
    avatarUrl: imageUrl(d.account?.portrait),
    followers: d.follower_count,
    rating: d.rating_star,
    ratingCount: goodBadNormal || undefined,
    productCount: d.item_count,
    ageMonths,
    location: d.shop_location ?? d.place,
    isOfficial: d.is_official_shop,
    responseRate: d.response_rate,
  };
}

async function fetchProducts(
  shopId: string,
  referer: string,
  ctx: ScrapeContext,
  log: string[],
): Promise<RawProduct[]> {
  const products: RawProduct[] = [];
  const seen = new Set<string>();

  for (let offset = 0; offset < ctx.maxProducts; offset += PAGE_SIZE) {
    const url =
      `${ORIGIN}/api/v4/search/search_items?by=sales&limit=${PAGE_SIZE}` +
      `&match_id=${shopId}&newest=${offset}&order=desc&page_type=shop&scenario=PAGE_OTHERS&version=2`;

    const { data } = await gatewayJson<ShopeeSearchResponse>({
      url,
      headers: shopeeHeaders(referer),
      signal: ctx.signal,
    });

    const page = (data.items ?? [])
      .map((i) => i.item_basic)
      .filter((i): i is ShopeeItemBasic => Boolean(i?.itemid))
      .map(mapProduct);

    for (const p of page) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      products.push(p);
    }

    ctx.emit({
      stage: "products",
      message: `Pulled ${products.length} listings from Shopee…`,
      progress: Math.min(85, 40 + (products.length / ctx.maxProducts) * 45),
    });

    if (data.nomore || page.length < PAGE_SIZE) break;
  }

  log.push(`catalogue: ${products.length} listings`);
  return products;
}

export async function scrapeShopee(ref: StoreRef, ctx: ScrapeContext): Promise<ScrapeResult> {
  const log: string[] = [];

  ctx.emit({ stage: "store", message: "Resolving Shopee seller profile…", progress: 25 });
  const store = await fetchShop(ref, ctx, log);

  ctx.emit({ stage: "products", message: `Reading catalogue for ${store.name}…`, progress: 40 });
  const products = await fetchProducts(store.storeId!, store.url, ctx, log);

  if (!products.length) {
    throw new GatewayError(
      `Shopee returned no listings for ${store.name}. The shop may be empty or region-locked.`,
      ["search_items returned 0 items"],
    );
  }

  return { store, products, source: "internal-api", log };
}
