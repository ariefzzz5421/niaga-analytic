import { hasApify } from "@/lib/scrape/apify";
import { availableTransports, hasLiveTransport } from "@/lib/scrape/gateway";
import { tiktokAuth } from "@/lib/scrape/tiktok-signature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasShopeeOpenPlatformCredentials(): boolean {
  return ["SHOPEE_PARTNER_ID", "SHOPEE_PARTNER_KEY", "SHOPEE_ACCESS_TOKEN", "SHOPEE_SHOP_ID"].every(
    (key) => Boolean(process.env[key]?.trim()),
  );
}

/**
 * Reports which data routes are configured without ever returning credentials.
 * Public/competitor analysis and owned-store official APIs are deliberately
 * reported separately because marketplace seller APIs are authorization scoped.
 */
export function GET() {
  return Response.json({
    ok: true,
    transports: availableTransports(),
    live: hasLiveTransport(),
    routes: {
      publicStorefront: {
        shopeeSession: Boolean(process.env.SHOPEE_COOKIE?.trim()),
        apify: hasApify(),
        gateway: hasLiveTransport(),
      },
      ownedStoreOfficialApi: {
        tiktokShop: Boolean(tiktokAuth()),
        shopeeCredentialsPresent: hasShopeeOpenPlatformCredentials(),
        shopeeAdapterStatus: "credentials-scaffolded",
      },
    },
    guidance: "Use official APIs for authorised/owned stores; use public storefront transports for competitor analytics.",
    maxProducts: Number(process.env.MAX_PRODUCTS ?? 240),
    cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS ?? 900),
  });
}
