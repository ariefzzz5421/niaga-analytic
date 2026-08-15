/**
 * Outbound HTTP for the scrapers.
 *
 * Marketplaces block datacentre IPs aggressively, so every request goes
 * through a transport chain instead of a bare `fetch`. The chain is built
 * from whatever credentials exist in the environment and is tried in order
 * until one returns a usable body.
 *
 * Configure with `SCRAPE_PROVIDER` (comma separated, in preference order):
 *   direct | scraperapi | scrapingbee | zenrows | brightdata | apify
 * Defaults to `direct` plus any provider whose API key is present.
 */

export type TransportName =
  | "direct"
  | "scraperapi"
  | "scrapingbee"
  | "zenrows"
  | "brightdata";

export interface GatewayRequest {
  url: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
  /** Ask the provider to run JS and return the rendered DOM. */
  render?: boolean;
  /** Geo-target the exit node. Indonesian marketplaces gate on this. */
  country?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface GatewayResponse {
  ok: boolean;
  status: number;
  body: string;
  transport: TransportName;
  url: string;
}

export class GatewayError extends Error {
  readonly attempts: string[];
  constructor(message: string, attempts: string[]) {
    super(message);
    this.name = "GatewayError";
    this.attempts = attempts;
  }
}

const DEFAULT_TIMEOUT = 20_000;
const DEFAULT_COUNTRY = process.env.SCRAPE_COUNTRY ?? "id";

/** A believable desktop Chrome fingerprint. Marketplaces 403 obvious bots. */
export const BROWSER_HEADERS: Record<string, string> = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "upgrade-insecure-requests": "1",
};

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

/** Which transports are actually usable given the current environment. */
export function availableTransports(): TransportName[] {
  const explicit = env("SCRAPE_PROVIDER")
    ?.split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean) as TransportName[] | undefined;

  const configured: TransportName[] = ["direct"];
  if (env("SCRAPERAPI_KEY")) configured.push("scraperapi");
  if (env("SCRAPINGBEE_KEY")) configured.push("scrapingbee");
  if (env("ZENROWS_KEY")) configured.push("zenrows");
  if (env("BRIGHTDATA_PROXY_URL")) configured.push("brightdata");

  if (!explicit) return configured;
  // Honour the explicit order, but drop anything we have no credentials for.
  const usable = explicit.filter((t) => configured.includes(t));
  return usable.length ? usable : configured;
}

export function hasLiveTransport(): boolean {
  return availableTransports().some((t) => t !== "direct");
}

/* ------------------------------------------------------------------ */
/* Transports                                                          */
/* ------------------------------------------------------------------ */

function directAttempt(req: GatewayRequest, signal: AbortSignal): Promise<Response> {
  return fetch(req.url, {
    method: req.method ?? "GET",
    headers: { ...BROWSER_HEADERS, ...req.headers },
    body: req.body,
    signal,
    redirect: "follow",
    cache: "no-store",
  });
}

function scraperApiAttempt(req: GatewayRequest, signal: AbortSignal): Promise<Response> {
  const endpoint = new URL("https://api.scraperapi.com/");
  endpoint.searchParams.set("api_key", env("SCRAPERAPI_KEY")!);
  endpoint.searchParams.set("url", req.url);
  endpoint.searchParams.set("country_code", req.country ?? DEFAULT_COUNTRY);
  if (req.render) endpoint.searchParams.set("render", "true");
  endpoint.searchParams.set("keep_headers", "true");

  return fetch(endpoint, {
    method: req.method ?? "GET",
    headers: { ...BROWSER_HEADERS, ...req.headers },
    body: req.body,
    signal,
  });
}

function scrapingBeeAttempt(req: GatewayRequest, signal: AbortSignal): Promise<Response> {
  const endpoint = new URL("https://app.scrapingbee.com/api/v1/");
  endpoint.searchParams.set("api_key", env("SCRAPINGBEE_KEY")!);
  endpoint.searchParams.set("url", req.url);
  endpoint.searchParams.set("country_code", req.country ?? DEFAULT_COUNTRY);
  endpoint.searchParams.set("render_js", req.render ? "true" : "false");
  endpoint.searchParams.set("premium_proxy", "true");

  // ScrapingBee forwards headers only when they carry the Spb- prefix.
  const forwarded: Record<string, string> = {};
  for (const [k, v] of Object.entries({ ...BROWSER_HEADERS, ...req.headers })) {
    forwarded[`Spb-${k}`] = v;
  }
  if (Object.keys(forwarded).length) endpoint.searchParams.set("forward_headers", "true");

  return fetch(endpoint, {
    method: req.method ?? "GET",
    headers: forwarded,
    body: req.body,
    signal,
  });
}

function zenRowsAttempt(req: GatewayRequest, signal: AbortSignal): Promise<Response> {
  const endpoint = new URL("https://api.zenrows.com/v1/");
  endpoint.searchParams.set("apikey", env("ZENROWS_KEY")!);
  endpoint.searchParams.set("url", req.url);
  endpoint.searchParams.set("proxy_country", req.country ?? DEFAULT_COUNTRY);
  endpoint.searchParams.set("premium_proxy", "true");
  if (req.render) endpoint.searchParams.set("js_render", "true");
  endpoint.searchParams.set("custom_headers", "true");

  return fetch(endpoint, {
    method: req.method ?? "GET",
    headers: { ...BROWSER_HEADERS, ...req.headers },
    body: req.body,
    signal,
  });
}

/**
 * Bright Data Web Unlocker. Node's fetch has no proxy option, so this needs
 * `undici`'s ProxyAgent, which ships with Node 18+ as a bundled dependency.
 */
async function brightDataAttempt(req: GatewayRequest, signal: AbortSignal): Promise<Response> {
  const { ProxyAgent } = await import("undici");
  const dispatcher = new ProxyAgent({
    uri: env("BRIGHTDATA_PROXY_URL")!,
    requestTls: { rejectUnauthorized: false },
  });

  return fetch(req.url, {
    method: req.method ?? "GET",
    headers: { ...BROWSER_HEADERS, ...req.headers },
    body: req.body,
    signal,
    // @ts-expect-error -- undici accepts `dispatcher`; the DOM typings do not model it.
    dispatcher,
  });
}

const TRANSPORTS: Record<TransportName, (req: GatewayRequest, signal: AbortSignal) => Promise<Response>> = {
  direct: directAttempt,
  scraperapi: scraperApiAttempt,
  scrapingbee: scrapingBeeAttempt,
  zenrows: zenRowsAttempt,
  brightdata: brightDataAttempt,
};

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** A body that parses as JSON but is really an anti-bot interstitial. */
function looksBlocked(status: number, body: string): boolean {
  if (status === 403 || status === 429 || status === 407) return true;
  const head = body.slice(0, 800).toLowerCase();
  return (
    head.includes("access denied") ||
    head.includes("captcha") ||
    head.includes("are you a robot") ||
    head.includes("cf-browser-verification") ||
    head.includes("请稍候") ||
    head.includes("verify to continue")
  );
}

/**
 * Fetch `req.url` through the first transport that gets past the
 * marketplace's edge. Throws `GatewayError` when every transport fails.
 */
export async function gatewayFetch(req: GatewayRequest): Promise<GatewayResponse> {
  const transports = availableTransports();
  const attempts: string[] = [];

  for (const name of transports) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), req.timeoutMs ?? DEFAULT_TIMEOUT);
    const onAbort = () => controller.abort();
    req.signal?.addEventListener("abort", onAbort, { once: true });

    try {
      const res = await TRANSPORTS[name](req, controller.signal);
      const body = await res.text();

      if (res.ok && !looksBlocked(res.status, body)) {
        return { ok: true, status: res.status, body, transport: name, url: req.url };
      }
      attempts.push(`${name}: HTTP ${res.status}${looksBlocked(res.status, body) ? " (blocked)" : ""}`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      attempts.push(`${name}: ${reason}`);
    } finally {
      clearTimeout(timer);
      req.signal?.removeEventListener("abort", onAbort);
    }
  }

  throw new GatewayError(`All transports failed for ${req.url}`, attempts);
}

/** `gatewayFetch` + JSON parse, with the raw body kept for error messages. */
export async function gatewayJson<T>(req: GatewayRequest): Promise<{ data: T; transport: TransportName }> {
  const res = await gatewayFetch({
    ...req,
    headers: { accept: "application/json, text/plain, */*", ...req.headers },
  });
  try {
    return { data: JSON.parse(res.body) as T, transport: res.transport };
  } catch {
    throw new GatewayError(
      `Expected JSON from ${req.url} but got ${res.body.slice(0, 120)}…`,
      [`${res.transport}: non-JSON body`],
    );
  }
}
