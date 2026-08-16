/**
 * Share-link resolution.
 *
 * `shp.ee`, `vt.tiktok.com` and friends are what the marketplace apps' share
 * sheets hand out. They carry no seller id, so the only way to read one is to
 * follow it. Redirects are followed manually — one hop at a time — so a
 * shortener that bounces through several hosts still lands somewhere we can
 * parse, and so a redirect loop terminates.
 */

import { isShortLink } from "../platform.ts";
import { BROWSER_HEADERS, GatewayError, gatewayFetch } from "./gateway.ts";

const MAX_HOPS = 5;
const HOP_TIMEOUT_MS = 12_000;

/** Follow one hop and return the Location header, or null at the destination. */
async function hop(url: string, signal?: AbortSignal): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HOP_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { ...BROWSER_HEADERS, accept: "text/html,*/*" },
      redirect: "manual",
      signal: controller.signal,
      cache: "no-store",
    });

    const location = res.headers.get("location");
    if (location) return new URL(location, url).toString();

    // A 4xx/5xx is not "no redirect", it is a failed hop — surface it so the
    // caller retries through the provider chain instead of reporting that the
    // link simply had no destination.
    if (res.status >= 400) {
      throw new Error(`HTTP ${res.status} from ${new URL(url).hostname}`);
    }

    // Some shorteners answer 200 with a meta-refresh or a JS hop instead of a
    // Location header, so fall back to reading the destination out of the body.
    if (res.status === 200) {
      const body = await res.text();
      const meta = body.match(
        /<meta[^>]+http-equiv=["']?refresh["']?[^>]+content=["'][^"']*url=([^"'>\s]+)/i,
      );
      if (meta) return new URL(meta[1], url).toString();

      const js = body.match(/(?:window\.location(?:\.href)?\s*=\s*|location\.replace\()["']([^"']+)["']/);
      if (js) return new URL(js[1], url).toString();
    }

    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

/**
 * Follow a redirect chain to its destination.
 *
 * Keeps hopping while the current URL is still a shortener or still on the
 * host we started from, and returns as soon as it lands anywhere else. That
 * covers both a shortener that jumps straight to the storefront and one that
 * bounces through its own domain first.
 *
 * Exported so the hop logic is testable against a local server; callers
 * should use `resolveShortLink`, which gates on the short-link allowlist.
 */
export async function hopChain(input: string, signal?: AbortSignal): Promise<string> {
  let current = input.startsWith("http") ? input : `https://${input}`;
  const startHost = new URL(current).hostname;
  const seen = new Set<string>([current]);
  const trail: string[] = [];

  const shouldContinue = (url: string) => {
    try {
      return isShortLink(url) || new URL(url).hostname === startHost;
    } catch {
      return false;
    }
  };

  for (let i = 0; i < MAX_HOPS; i++) {
    let next: string | null = null;
    try {
      next = await hop(current, signal);
    } catch (err) {
      // A direct hop can be blocked where the provider chain is not, so retry
      // the same URL through the gateway before giving up.
      try {
        const res = await gatewayFetch({ url: current, signal, timeoutMs: HOP_TIMEOUT_MS });
        // The provider followed the redirects for us and reports where it ended.
        if (res.url && res.url !== current && !shouldContinue(res.url)) return res.url;
      } catch {
        throw new GatewayError(
          `Could not open the share link ${input}. Paste the full store URL instead.`,
          [...trail, `hop failed: ${err instanceof Error ? err.message : String(err)}`],
        );
      }
    }

    if (!next) {
      // The hop succeeded but pointed nowhere — the link is dead rather than
      // merely deep, so say that instead of blaming the hop limit.
      throw new GatewayError(
        `Share link ${input} did not redirect anywhere. It may have expired — paste the full store URL instead.`,
        trail,
      );
    }
    trail.push(next);

    if (seen.has(next)) {
      throw new GatewayError(`Share link ${input} redirects in a loop.`, trail);
    }
    seen.add(next);
    current = next;

    // Stop as soon as we leave the shortener and its own domain.
    if (!shouldContinue(current)) return current;
  }

  throw new GatewayError(
    `Share link ${input} was still bouncing between shorteners after ${MAX_HOPS} hops.`,
    trail,
  );
}

/**
 * Expand a marketplace share link to the storefront URL it points at.
 * Returns the input unchanged when it is not a share link.
 */
export async function resolveShortLink(input: string, signal?: AbortSignal): Promise<string> {
  if (!isShortLink(input)) return input;
  return hopChain(input, signal);
}
