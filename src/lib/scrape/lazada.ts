/**
 * Lazada Indonesia adapter (best-effort).
 *
 * Lazada's storefront renders server-side but every listing page also answers
 * with JSON when `ajax=true` is appended — that is what the site's own
 * pagination calls. Akamai fronts it, so this route generally needs a
 * residential provider in the gateway chain.
 */

import type { RawProduct, RawStore, ScrapeContext, ScrapeResult, StoreRef } from "../types";
import { GatewayError, gatewayJson } from "./gateway.ts";

const ORIGIN = "https://www.lazada.co.id";
const PAGE_SIZE = 40;

interface LazadaAjaxResponse {
  mods?: {
    listItems?: {
      itemId?: string;
      name?: string;
      price?: string;
      originalPrice?: string;
      discount?: string;
      ratingScore?: string;
      review?: string;
      itemUrl?: string;
      image?: string;
      sellerName?: string;
      sellerId?: string;
      location?: string;
      itemSoldCntShow?: string;
    }[];
    paging?: { page?: number; pageSize?: number; totalResults?: number };
  };
  seller?: { name?: string; id?: string; followers?: number; positiveRate?: string };
}

/** Lazada prints prices as "Rp99.000" and sold counts as "1,2RB Terjual". */
function parsePrice(text: string | undefined): number {
  if (!text) return 0;
  const digits = text.replace(/[^\d]/g, "");
  return digits ? Number.parseInt(digits, 10) : 0;
}

function parseSold(text: string | undefined): number {
  if (!text) return 0;
  const match = text.replace(",", ".").match(/([\d.]+)\s*(RB|K|JT|M)?/i);
  if (!match) return 0;
  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value)) return 0;
  const unit = (match[2] ?? "").toUpperCase();
  if (unit === "RB" || unit === "K") return Math.round(value * 1_000);
  if (unit === "JT" || unit === "M") return Math.round(value * 1_000_000);
  return Math.round(value);
}

function absolute(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("http")) return url;
  return `${ORIGIN}${url}`;
}

export async function scrapeLazada(ref: StoreRef, ctx: ScrapeContext): Promise<ScrapeResult> {
  const log: string[] = [];
  ctx.emit({ stage: "store", message: "Opening Lazada storefront…", progress: 25 });

  const products: RawProduct[] = [];
  let sellerName = ref.handle;
  let followers: number | undefined;

  for (let page = 1; products.length < ctx.maxProducts; page++) {
    const url = `${ORIGIN}/shop/${encodeURIComponent(ref.handle)}/?ajax=true&isFirst=${page === 1}&page=${page}`;

    const { data } = await gatewayJson<LazadaAjaxResponse>({
      url,
      headers: { referer: ref.url, "x-requested-with": "XMLHttpRequest" },
      signal: ctx.signal,
    });

    if (data.seller?.name) sellerName = data.seller.name;
    if (data.seller?.followers) followers = data.seller.followers;

    const rows = data.mods?.listItems ?? [];
    for (const row of rows) {
      if (!row.itemId || !row.name) continue;
      const price = parsePrice(row.price);
      if (!price) continue;

      products.push({
        id: row.itemId,
        name: row.name,
        url: absolute(row.itemUrl),
        imageUrl: absolute(row.image),
        price,
        originalPrice: parsePrice(row.originalPrice) || undefined,
        // Lazada shows a rounded "sold" badge, not an exact counter; the
        // metrics layer falls back to review volume when it is absent.
        sold: parseSold(row.itemSoldCntShow),
        rating: row.ratingScore ? Number.parseFloat(row.ratingScore) : undefined,
        reviewCount: row.review ? Number.parseInt(row.review, 10) : undefined,
        ratingCount: row.review ? Number.parseInt(row.review, 10) : undefined,
      });
    }

    ctx.emit({
      stage: "products",
      message: `Pulled ${products.length} listings from Lazada…`,
      progress: Math.min(85, 30 + (products.length / ctx.maxProducts) * 55),
    });

    if (rows.length < PAGE_SIZE) break;
  }

  if (!products.length) {
    throw new GatewayError(`Lazada returned no listings for "${ref.handle}".`, [
      "shop ajax returned 0 items",
    ]);
  }

  log.push(`catalogue: ${products.length} listings`);
  const store: RawStore = {
    ...ref,
    name: sellerName,
    followers,
    productCount: products.length,
  };
  return { store, products, source: "internal-api", log };
}
