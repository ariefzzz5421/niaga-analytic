import { createHmac } from "node:crypto";

/**
 * TikTok Shop Partner Center request signing.
 *
 * The algorithm, per TikTok's "Signing requests" doc:
 *   1. take every query param except `sign` and `access_token`
 *   2. sort them by key, concatenate as key+value with no separators
 *   3. prefix the request path
 *   4. append the raw JSON body (skipped for multipart uploads)
 *   5. wrap the whole string in the app secret on both ends
 *   6. HMAC-SHA256 it with the app secret, hex encoded
 */
export function signRequest(params: {
  appSecret: string;
  path: string;
  query: Record<string, string | number | undefined>;
  body?: string;
}): string {
  const { appSecret, path, query, body } = params;

  const sorted = Object.keys(query)
    .filter((k) => k !== "sign" && k !== "access_token" && query[k] !== undefined)
    .sort()
    .map((k) => `${k}${query[k]}`)
    .join("");

  const base = `${appSecret}${path}${sorted}${body ?? ""}${appSecret}`;
  return createHmac("sha256", appSecret).update(base).digest("hex");
}

export interface TikTokAuth {
  appKey: string;
  appSecret: string;
  accessToken: string;
  shopCipher?: string;
  baseUrl: string;
}

export function tiktokAuth(): TikTokAuth | null {
  const appKey = process.env.TIKTOK_APP_KEY?.trim();
  const appSecret = process.env.TIKTOK_APP_SECRET?.trim();
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN?.trim();
  if (!appKey || !appSecret || !accessToken) return null;

  return {
    appKey,
    appSecret,
    accessToken,
    shopCipher: process.env.TIKTOK_SHOP_CIPHER?.trim() || undefined,
    baseUrl: process.env.TIKTOK_API_BASE?.trim() || "https://open-api.tiktokglobalshop.com",
  };
}

/** Build a fully signed URL + headers for a TikTok Shop Open API call. */
export function buildSignedRequest(
  auth: TikTokAuth,
  path: string,
  extraQuery: Record<string, string | number | undefined> = {},
  body?: unknown,
): { url: string; headers: Record<string, string>; body?: string } {
  const serialised = body === undefined ? undefined : JSON.stringify(body);

  const query: Record<string, string | number | undefined> = {
    app_key: auth.appKey,
    timestamp: Math.floor(Date.now() / 1000),
    shop_cipher: auth.shopCipher,
    ...extraQuery,
  };

  const sign = signRequest({ appSecret: auth.appSecret, path, query, body: serialised });

  const url = new URL(path, auth.baseUrl);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  url.searchParams.set("sign", sign);

  return {
    url: url.toString(),
    headers: {
      "content-type": "application/json",
      "x-tts-access-token": auth.accessToken,
    },
    body: serialised,
  };
}
