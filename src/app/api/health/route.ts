import { hasApify } from "@/lib/scrape/apify";
import { availableTransports, hasLiveTransport } from "@/lib/scrape/gateway";
import { tiktokAuth } from "@/lib/scrape/tiktok-signature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Reports which data routes are wired up, without ever echoing a secret.
 * The UI uses this to decide whether to show the "sample data" banner.
 */
export function GET() {
  return Response.json({
    ok: true,
    transports: availableTransports(),
    live: hasLiveTransport(),
    routes: {
      shopeeCookie: Boolean(process.env.SHOPEE_COOKIE?.trim()),
      tiktokOfficialApi: Boolean(tiktokAuth()),
      apify: hasApify(),
    },
    maxProducts: Number(process.env.MAX_PRODUCTS ?? 240),
    cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS ?? 900),
  });
}
