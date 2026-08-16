/**
 * Tokopedia adapter (best-effort).
 *
 * Tokopedia is a GraphQL backend at gql.tokopedia.com. The shop queries are
 * unauthenticated but Akamai-fronted, so this route generally needs a
 * residential provider in the gateway chain.
 */

import type { RawProduct, RawStore, ScrapeContext, ScrapeResult, StoreRef } from "../types";
import { GatewayError, gatewayJson } from "./gateway.ts";

const GQL = "https://gql.tokopedia.com/graphql";
const PAGE_SIZE = 80;

function gqlHeaders(referer: string): Record<string, string> {
  return {
    "content-type": "application/json",
    accept: "*/*",
    origin: "https://www.tokopedia.com",
    referer,
    "x-source": "tokopedia-lite",
    "x-device": "desktop",
    "x-tkpd-lite-service": "zeus",
  };
}

interface ShopInfoResponse {
  data?: {
    shopInfoByID?: {
      result?: {
        shopCore?: { name?: string; domain?: string; description?: string; shopID?: string };
        shopAssets?: { avatar?: string };
        shopStats?: { productSold?: string; totalTxSuccess?: string };
        location?: string;
        favoriteData?: { totalFavorite?: number };
        shopLastActive?: string;
        createInfo?: { openSince?: string };
        goldOS?: { isOfficial?: number; isGold?: number };
        activeProduct?: number;
      }[];
    };
  };
}

interface ShopProductsResponse {
  data?: {
    GetShopProduct?: {
      totalData?: number;
      data?: {
        id?: string;
        name?: string;
        product_url?: string;
        primary_image?: { original?: string; thumbnail?: string };
        price?: { text_idr?: string };
        price_range?: string;
        flags?: { isSold?: boolean; isPreorder?: boolean };
        stats?: { countView?: string; countReview?: string; countTalk?: string };
        badge?: { title?: string }[];
        rating?: number;
        sold?: number;
        stock?: number;
      }[];
    };
  };
}

function parseIdr(text: string | undefined): number {
  if (!text) return 0;
  const digits = text.replace(/[^\d]/g, "");
  return digits ? Number.parseInt(digits, 10) : 0;
}

async function fetchShopId(ref: StoreRef, ctx: ScrapeContext): Promise<string> {
  const body = JSON.stringify([
    {
      operationName: "ShopInfoByDomain",
      variables: { domain: ref.handle },
      query: `query ShopInfoByDomain($domain: String!) {
        shopInfoByID(input: {domain: $domain, fields: ["core","assets","stats","location","favorite","active-product","create-info","goldos"]}) {
          result { shopCore { shopID name domain description } shopAssets { avatar }
            shopStats { productSold totalTxSuccess } location
            favoriteData { totalFavorite } createInfo { openSince }
            goldOS { isOfficial isGold } activeProduct }
        }
      }`,
    },
  ]);

  const { data } = await gatewayJson<ShopInfoResponse[]>({
    url: GQL,
    method: "POST",
    headers: gqlHeaders(ref.url),
    body,
    signal: ctx.signal,
  });

  const id = data?.[0]?.data?.shopInfoByID?.result?.[0]?.shopCore?.shopID;
  if (!id) throw new GatewayError(`Tokopedia has no shop called "${ref.handle}".`, ["shopInfoByID empty"]);
  return id;
}

export async function scrapeTokopedia(ref: StoreRef, ctx: ScrapeContext): Promise<ScrapeResult> {
  const log: string[] = [];

  ctx.emit({ stage: "store", message: "Resolving Tokopedia shop…", progress: 25 });
  const shopId = await fetchShopId(ref, ctx);
  log.push(`shop resolved → shopID ${shopId}`);

  ctx.emit({ stage: "products", message: "Reading Tokopedia catalogue…", progress: 45 });

  const products: RawProduct[] = [];
  for (let page = 1; products.length < ctx.maxProducts; page++) {
    const body = JSON.stringify([
      {
        operationName: "ShopProducts",
        variables: { sid: shopId, page, perPage: PAGE_SIZE, etalaseId: "etalase", sort: 8 },
        query: `query ShopProducts($sid: String!, $page: Int, $perPage: Int, $etalaseId: String, $sort: Int) {
          GetShopProduct(shopID: $sid, filter: {page: $page, perPage: $perPage, fkeyword: "", fmenu: $etalaseId, sort: $sort}) {
            totalData
            data { id name product_url primary_image { original thumbnail }
              price { text_idr } price_range flags { isSold isPreorder }
              stats { countView countReview countTalk } badge { title } rating sold stock }
          }
        }`,
      },
    ]);

    const { data } = await gatewayJson<ShopProductsResponse[]>({
      url: GQL,
      method: "POST",
      headers: gqlHeaders(ref.url),
      body,
      signal: ctx.signal,
    });

    const rows = data?.[0]?.data?.GetShopProduct?.data ?? [];
    for (const row of rows) {
      if (!row.id || !row.name) continue;
      products.push({
        id: row.id,
        name: row.name,
        url: row.product_url,
        imageUrl: row.primary_image?.original ?? row.primary_image?.thumbnail,
        price: parseIdr(row.price?.text_idr ?? row.price_range),
        sold: row.sold ?? 0,
        stock: row.stock,
        rating: row.rating,
        reviewCount: Number(row.stats?.countReview ?? 0) || undefined,
        ratingCount: Number(row.stats?.countReview ?? 0) || undefined,
      });
    }

    ctx.emit({
      stage: "products",
      message: `Pulled ${products.length} listings from Tokopedia…`,
      progress: Math.min(85, 45 + (products.length / ctx.maxProducts) * 40),
    });

    if (rows.length < PAGE_SIZE) break;
  }

  if (!products.length) {
    throw new GatewayError(`Tokopedia returned no listings for ${ref.handle}.`, ["GetShopProduct empty"]);
  }

  const store: RawStore = { ...ref, storeId: shopId, name: ref.handle, productCount: products.length };
  log.push(`catalogue: ${products.length} listings`);
  return { store, products, source: "internal-api", log };
}
