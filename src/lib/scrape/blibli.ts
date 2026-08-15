/**
 * Blibli adapter (best-effort).
 *
 * Blibli exposes a fairly conventional REST search backend, which makes it
 * the least hostile of the four. Sold counts are not published, so units are
 * inferred from review volume downstream in the metrics layer.
 */

import type { RawProduct, RawStore, ScrapeContext, ScrapeResult, StoreRef } from "../types";
import { GatewayError, gatewayJson } from "./gateway";

const SEARCH = "https://www.blibli.com/backend/search/products";
const PAGE_SIZE = 100;

interface BlibliSearchResponse {
  code?: number;
  status?: string;
  data?: {
    products?: {
      id?: string;
      sku?: string;
      itemSku?: string;
      name?: string;
      url?: string;
      images?: string[];
      price?: { offered?: number; list?: number; minPrice?: number };
      review?: { rating?: number; count?: number; absoluteRating?: number };
      merchantCode?: string;
      merchantName?: string;
      category?: { name?: string }[];
      sold?: number;
    }[];
    paging?: { totalItem?: number; itemPerPage?: number; page?: number };
  };
}

export async function scrapeBlibli(ref: StoreRef, ctx: ScrapeContext): Promise<ScrapeResult> {
  const log: string[] = [];
  const merchant = ref.storeId ?? ref.handle;

  ctx.emit({ stage: "store", message: "Reading Blibli merchant catalogue…", progress: 30 });

  const products: RawProduct[] = [];
  let merchantName = ref.handle;

  for (let page = 1; products.length < ctx.maxProducts; page++) {
    const url =
      `${SEARCH}?merchantCode=${encodeURIComponent(merchant)}` +
      `&page=${page}&start=${(page - 1) * PAGE_SIZE}&itemPerPage=${PAGE_SIZE}&sort=8&channelId=web`;

    const { data } = await gatewayJson<BlibliSearchResponse>({
      url,
      headers: { referer: ref.url },
      signal: ctx.signal,
    });

    const rows = data.data?.products ?? [];
    for (const row of rows) {
      const id = row.id ?? row.sku ?? row.itemSku;
      if (!id || !row.name) continue;
      if (row.merchantName) merchantName = row.merchantName;

      products.push({
        id,
        name: row.name,
        url: row.url ? `https://www.blibli.com${row.url}` : undefined,
        imageUrl: row.images?.[0],
        price: row.price?.offered ?? row.price?.minPrice ?? 0,
        originalPrice: row.price?.list,
        sold: row.sold ?? 0,
        rating: row.review?.absoluteRating ?? row.review?.rating,
        ratingCount: row.review?.count,
        reviewCount: row.review?.count,
        category: row.category?.at(-1)?.name,
      });
    }

    ctx.emit({
      stage: "products",
      message: `Pulled ${products.length} listings from Blibli…`,
      progress: Math.min(85, 30 + (products.length / ctx.maxProducts) * 55),
    });

    if (rows.length < PAGE_SIZE) break;
  }

  if (!products.length) {
    throw new GatewayError(`Blibli returned no listings for merchant "${merchant}".`, [
      "search returned 0 products",
    ]);
  }

  log.push(`catalogue: ${products.length} listings`);
  const store: RawStore = {
    ...ref,
    storeId: merchant,
    name: merchantName,
    productCount: products.length,
  };
  return { store, products, source: "internal-api", log };
}
