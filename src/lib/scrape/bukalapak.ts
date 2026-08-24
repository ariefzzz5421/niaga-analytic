/**
 * Bukalapak adapter (best-effort).
 *
 * Bukalapak runs a public JSON API at api.bukalapak.com. Store lookup goes
 * username -> store id -> products; the product endpoint is paginated with
 * offset/limit and returns a `meta` block with the total.
 */

import type { RawProduct, RawStore, ScrapeContext, ScrapeResult, StoreRef } from "../types";
import { GatewayError, gatewayJson } from "./gateway.ts";

const API = "https://api.bukalapak.com";
const PAGE_SIZE = 50;

function headers(referer: string): Record<string, string> {
  return {
    accept: "application/json",
    referer,
    origin: "https://www.bukalapak.com",
  };
}

interface StoreResponse {
  data?: {
    id?: string | number;
    name?: string;
    slug?: string;
    url?: string;
    avatar?: { url?: string } | string;
    address?: { city?: string; province?: string };
    rating?: { positive?: number; average?: number; count?: number };
    products_count?: number;
    followers_count?: number;
    created_at?: string;
    is_official?: boolean;
    superseller?: boolean;
  };
  meta?: { http_status?: number; message?: string };
}

interface ProductsResponse {
  data?: {
    id?: string | number;
    name?: string;
    url?: string;
    price?: number;
    original_price?: number;
    stock?: number;
    sold_count?: number;
    images?: { small_urls?: string[]; large_urls?: string[] } | string[];
    rating?: { average_rate?: number; user_count?: number };
    category?: { name?: string };
    created_at?: string;
  }[];
  meta?: { total?: number; offset?: number; limit?: number };
}

function firstImage(images: unknown): string | undefined {
  if (Array.isArray(images)) return typeof images[0] === "string" ? images[0] : undefined;
  if (images && typeof images === "object") {
    const obj = images as { large_urls?: string[]; small_urls?: string[] };
    return obj.large_urls?.[0] ?? obj.small_urls?.[0];
  }
  return undefined;
}

async function fetchStore(ref: StoreRef, ctx: ScrapeContext): Promise<RawStore> {
  const { data } = await gatewayJson<StoreResponse>({
    url: `${API}/stores/${encodeURIComponent(ref.handle)}`,
    headers: headers(ref.url),
    signal: ctx.signal,
  });

  const d = data.data;
  if (!d?.id) {
    throw new GatewayError(`Bukalapak has no store called "${ref.handle}".`, [
      data.meta?.message ?? "store lookup returned no data",
    ]);
  }

  const ageMonths = d.created_at
    ? Math.max(1, Math.round((Date.now() - new Date(d.created_at).getTime()) / (86_400_000 * 30.44)))
    : undefined;

  return {
    ...ref,
    storeId: String(d.id),
    name: d.name ?? ref.handle,
    avatarUrl: typeof d.avatar === "string" ? d.avatar : d.avatar?.url,
    followers: d.followers_count,
    rating: d.rating?.average,
    ratingCount: d.rating?.count,
    productCount: d.products_count,
    ageMonths,
    location: d.address?.city ?? d.address?.province,
    isOfficial: d.is_official ?? d.superseller,
  };
}

export async function scrapeBukalapak(ref: StoreRef, ctx: ScrapeContext): Promise<ScrapeResult> {
  const log: string[] = [];

  ctx.emit({ stage: "store", message: "Resolving Bukalapak store…", progress: 25 });
  const store = await fetchStore(ref, ctx);
  log.push(`store resolved → id ${store.storeId}`);

  ctx.emit({ stage: "products", message: `Reading catalogue for ${store.name}…`, progress: 40 });

  const products: RawProduct[] = [];
  for (let offset = 0; offset < ctx.maxProducts; offset += PAGE_SIZE) {
    const url =
      `${API}/stores/${store.storeId}/products?offset=${offset}&limit=${PAGE_SIZE}` +
      `&sort=sold_desc`;

    const { data } = await gatewayJson<ProductsResponse>({
      url,
      headers: headers(ref.url),
      signal: ctx.signal,
    });

    const rows = data.data ?? [];
    for (const row of rows) {
      if (!row.id || !row.name || !row.price) continue;
      products.push({
        id: String(row.id),
        name: row.name,
        url: row.url,
        imageUrl: firstImage(row.images),
        price: row.price,
        originalPrice: row.original_price && row.original_price > row.price ? row.original_price : undefined,
        sold: row.sold_count ?? 0,
        stock: row.stock,
        rating: row.rating?.average_rate,
        ratingCount: row.rating?.user_count,
        reviewCount: row.rating?.user_count,
        category: row.category?.name,
        listedAt: row.created_at,
      });
    }

    ctx.emit({
      stage: "products",
      message: `Pulled ${products.length} listings from Bukalapak…`,
      progress: Math.min(85, 40 + (products.length / ctx.maxProducts) * 45),
    });

    if (rows.length < PAGE_SIZE) break;
  }

  if (!products.length) {
    throw new GatewayError(`Bukalapak returned no listings for ${store.name}.`, [
      "products endpoint returned 0 items",
    ]);
  }

  log.push(`catalogue: ${products.length} listings`);
  return { store, products, source: "internal-api", log };
}
