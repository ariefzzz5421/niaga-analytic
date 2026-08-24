import type { Platform, StoreRef } from "./types";

export interface PlatformMeta {
  id: Platform;
  label: string;
  /** Brand colour — used for badges and icons only, never as a chart series colour. */
  brand: string;
  domains: string[];
  example: string;
  /** Marked false for the platforms we ship as best-effort rather than flagship. */
  flagship: boolean;
  hint: string;
}

export const PLATFORM_META: Record<Platform, PlatformMeta> = {
  shopee: {
    id: "shopee",
    label: "Shopee",
    brand: "#ee4d2d",
    domains: ["shopee.co.id", "shope.ee", "shp.ee", "id.shp.ee"],
    example: "https://shopee.co.id/erigo.official",
    flagship: true,
    hint: "Seller page, product link or a shp.ee share link",
  },
  tiktok: {
    id: "tiktok",
    label: "TikTok Shop",
    brand: "#fe2c55",
    domains: ["tiktok.com", "shop.tiktok.com", "vt.tiktok.com", "vm.tiktok.com", "shop-id.tokopedia.com"],
    example: "https://www.tiktok.com/@erigo.official",
    flagship: true,
    hint: "Creator profile (@handle), a shop link, or a vt.tiktok.com share link",
  },
  tokopedia: {
    id: "tokopedia",
    label: "Tokopedia",
    brand: "#03ac0e",
    domains: ["tokopedia.com", "tokopedia.link"],
    example: "https://www.tokopedia.com/erigo",
    flagship: false,
    hint: "tokopedia.com/<shop-slug> or a tokopedia.link share link",
  },
  blibli: {
    id: "blibli",
    label: "Blibli",
    brand: "#0095da",
    domains: ["blibli.com"],
    example: "https://www.blibli.com/merchant/erigo-official-store/ERI-60002",
    flagship: false,
    hint: "blibli.com/merchant/<slug>/<code>",
  },
  lazada: {
    id: "lazada",
    label: "Lazada",
    brand: "#f57224",
    domains: ["lazada.co.id", "lazada.com"],
    example: "https://www.lazada.co.id/shop/erigo-official",
    flagship: false,
    hint: "lazada.co.id/shop/<slug>",
  },
  bukalapak: {
    id: "bukalapak",
    label: "Bukalapak",
    brand: "#e31e52",
    domains: ["bukalapak.com"],
    example: "https://www.bukalapak.com/u/erigo-official",
    flagship: false,
    hint: "bukalapak.com/u/<username>",
  },
};

export const PLATFORM_LIST = Object.values(PLATFORM_META);

function parseLazada(url: URL): StoreRef {
  const seg = segments(url);

  // /shop/<slug> and /shop/<slug>/<anything>
  const shopIdx = seg.indexOf("shop");
  if (shopIdx !== -1 && seg[shopIdx + 1]) {
    const slug = seg[shopIdx + 1];
    return {
      platform: "lazada",
      handle: slug,
      url: `https://www.lazada.co.id/shop/${slug}`,
    };
  }

  // Product pages carry the seller behind ?sellerId=
  const sellerId = url.searchParams.get("sellerId") ?? url.searchParams.get("seller_id");
  if (sellerId) {
    return {
      platform: "lazada",
      handle: sellerId,
      storeId: sellerId,
      url: `https://www.lazada.co.id/shop/?sellerId=${sellerId}`,
    };
  }

  throw new UnsupportedUrlError(
    "That Lazada link has no seller in it. Use lazada.co.id/shop/<slug> or a link with sellerId.",
  );
}

function parseBukalapak(url: URL): StoreRef {
  const seg = segments(url);

  // /u/<username> is the store page; /<username> also resolves for legacy links.
  const uIdx = seg.indexOf("u");
  const handle = uIdx !== -1 ? seg[uIdx + 1] : seg[0];
  const reserved = new Set(["p", "products", "c", "search", "promo", "bantuan", "login"]);

  if (!handle || reserved.has(handle.toLowerCase())) {
    throw new UnsupportedUrlError(
      "That Bukalapak link has no seller in it. Use bukalapak.com/u/<username>.",
    );
  }

  return {
    platform: "bukalapak",
    handle,
    url: `https://www.bukalapak.com/u/${handle}`,
  };
}

/**
 * Hosts that serve nothing but a redirect to the real storefront. These are
 * what the marketplace apps' share sheets produce, so users paste them
 * constantly — but the short code carries no seller information, which means
 * they can only be parsed after following the redirect.
 */
const SHORT_LINK_HOSTS = new Set([
  "shp.ee",
  "id.shp.ee",
  "shope.ee",
  "vt.tiktok.com",
  "vm.tiktok.com",
  "tokopedia.link",
]);

export class UnsupportedUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedUrlError";
  }
}

function normaliseInput(input: string): URL {
  const trimmed = input.trim();
  if (!trimmed) throw new UnsupportedUrlError("Store URL is empty.");

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withScheme);
  } catch {
    throw new UnsupportedUrlError(`"${input}" is not a valid URL.`);
  }
}

function hostMatches(host: string, domains: string[]): boolean {
  const clean = host.toLowerCase().replace(/^www\./, "");
  return domains.some((d) => clean === d || clean.endsWith(`.${d}`));
}

function detectPlatform(url: URL): Platform {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");

  // shop-id.tokopedia.com is the TikTok Shop Indonesia storefront post-merger,
  // so it has to be tested before the plain tokopedia.com match.
  if (host === "shop-id.tokopedia.com") return "tiktok";

  for (const meta of PLATFORM_LIST) {
    if (hostMatches(host, meta.domains)) return meta.id;
  }
  throw new UnsupportedUrlError(
    `${url.hostname} is not a supported marketplace. Supported: ${PLATFORM_LIST.map((p) => p.label).join(", ")}.`,
  );
}

/** Path segments with empty entries stripped. */
function segments(url: URL): string[] {
  return url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
}

function parseShopee(url: URL): StoreRef {
  const seg = segments(url);

  // /shop/123456 and /shop/123456/search
  const shopIdx = seg.indexOf("shop");
  if (shopIdx !== -1 && seg[shopIdx + 1]) {
    const id = seg[shopIdx + 1].replace(/\D/g, "");
    if (id) {
      return {
        platform: "shopee",
        handle: id,
        storeId: id,
        url: `https://shopee.co.id/shop/${id}`,
      };
    }
  }

  // A product URL is one segment shaped `Slugified-Product-Name-i.<shopid>.<itemid>`,
  // so the shop id has to be read off the suffix rather than a whole segment.
  for (const s of seg) {
    const product = s.match(/(?:^|-)i\.(\d+)\.(\d+)$/);
    if (product) {
      const id = product[1];
      return {
        platform: "shopee",
        handle: id,
        storeId: id,
        url: `https://shopee.co.id/shop/${id}`,
      };
    }
  }

  // Plain seller page: /erigo.official
  const handle = seg[0];
  if (!handle) {
    throw new UnsupportedUrlError(
      "That Shopee link has no seller in it. Use shopee.co.id/<username> or /shop/<id>.",
    );
  }
  return {
    platform: "shopee",
    handle,
    url: `https://shopee.co.id/${handle}`,
  };
}

function parseTiktok(url: URL): StoreRef {
  const seg = segments(url);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");

  // shop.tiktok.com/view/shop?seller_id=... / shop-id.tokopedia.com/view/shop?...
  const sellerId =
    url.searchParams.get("seller_id") ??
    url.searchParams.get("sellerId") ??
    url.searchParams.get("shop_id");
  if (sellerId) {
    return {
      platform: "tiktok",
      handle: sellerId,
      storeId: sellerId,
      url: `https://shop-id.tokopedia.com/view/shop?seller_id=${sellerId}`,
    };
  }

  // Creator profile: /@erigo.official (optionally with /video/... after it)
  const at = seg.find((s) => s.startsWith("@"));
  if (at) {
    const handle = at.slice(1);
    return {
      platform: "tiktok",
      handle,
      url: `https://www.tiktok.com/@${handle}`,
    };
  }

  // shop.tiktok.com/@handle or a bare handle path on the shop host
  if (host.startsWith("shop.") && seg[0]) {
    const handle = seg[0].replace(/^@/, "");
    return {
      platform: "tiktok",
      handle,
      url: `https://www.tiktok.com/@${handle}`,
    };
  }

  throw new UnsupportedUrlError(
    "That TikTok link has no seller in it. Use tiktok.com/@<handle> or a shop link with seller_id.",
  );
}

function parseTokopedia(url: URL): StoreRef {
  const seg = segments(url);
  const reserved = new Set(["p", "search", "discovery", "find", "help", "about", "promo"]);
  const handle = seg[0];
  if (!handle || reserved.has(handle.toLowerCase())) {
    throw new UnsupportedUrlError(
      "That Tokopedia link has no shop slug in it. Use tokopedia.com/<shop-slug>.",
    );
  }
  return {
    platform: "tokopedia",
    handle,
    url: `https://www.tokopedia.com/${handle}`,
  };
}

function parseBlibli(url: URL): StoreRef {
  const seg = segments(url);

  // /merchant/<slug>/<CODE>
  const mIdx = seg.findIndex((s) => s === "merchant" || s === "brand");
  if (mIdx !== -1 && seg[mIdx + 1]) {
    const slug = seg[mIdx + 1];
    const code = seg[mIdx + 2];
    return {
      platform: "blibli",
      handle: slug,
      storeId: code,
      url: code
        ? `https://www.blibli.com/merchant/${slug}/${code}`
        : `https://www.blibli.com/merchant/${slug}`,
    };
  }

  const code = url.searchParams.get("merchantCode") ?? url.searchParams.get("merchant");
  if (code) {
    return {
      platform: "blibli",
      handle: code,
      storeId: code,
      url: `https://www.blibli.com/merchant/${code}`,
    };
  }

  throw new UnsupportedUrlError(
    "That Blibli link has no merchant in it. Use blibli.com/merchant/<slug>/<code>.",
  );
}

/**
 * True when the input is a marketplace share link whose target can only be
 * known by following the redirect. Callers should resolve it server-side
 * before parsing — see `resolveShortLink` in `scrape/shortlink.ts`.
 */
export function isShortLink(input: string): boolean {
  try {
    const url = normaliseInput(input);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (!SHORT_LINK_HOSTS.has(host)) return false;
    // vt./vm.tiktok.com paths are opaque codes, but a full tiktok.com/@handle
    // on those hosts would already be parseable.
    return !url.pathname.includes("@");
  } catch {
    return false;
  }
}

/**
 * Turn whatever the user pasted into a canonical `StoreRef`.
 * Accepts bare hosts, deep product links, tracking params and share links.
 *
 * Short links must be resolved to their destination first — this throws for
 * them rather than guessing, because the short code contains no seller id.
 */
export function parseStoreUrl(input: string): StoreRef {
  const url = normaliseInput(input);

  if (isShortLink(input)) {
    throw new UnsupportedUrlError(
      `${url.hostname} is a share link that has to be opened before it can be read. Resolve it first, or paste the full store URL.`,
    );
  }

  const platform = detectPlatform(url);

  switch (platform) {
    case "shopee":
      return parseShopee(url);
    case "tiktok":
      return parseTiktok(url);
    case "tokopedia":
      return parseTokopedia(url);
    case "blibli":
      return parseBlibli(url);
    case "lazada":
      return parseLazada(url);
    case "bukalapak":
      return parseBukalapak(url);
  }
}

/** Best-effort parse used by the multi-store compare box. Never throws. */
export function tryParseStoreUrl(input: string): StoreRef | null {
  try {
    return parseStoreUrl(input);
  } catch {
    return null;
  }
}
