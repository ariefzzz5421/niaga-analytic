/**
 * The no-fabrication guarantee.
 *
 * The whole product rests on one rule: if the marketplace data cannot be
 * reached, the analyzer says so. It must never quietly substitute generated
 * figures, because a fabricated revenue number is visually identical to a real
 * one and gets acted on the same way. These tests exist so that rule cannot be
 * regressed by accident.
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { analyzeStore, isPlatformConfigured, NotConfiguredError, setupHint } from "../src/lib/analyzer.ts";
import { PLATFORMS } from "../src/lib/types.ts";

const SCRAPE_ENV = [
  "SCRAPERAPI_KEY",
  "SCRAPINGBEE_KEY",
  "ZENROWS_KEY",
  "BRIGHTDATA_PROXY_URL",
  "APIFY_TOKEN",
  "TIKTOK_APP_KEY",
  "TIKTOK_APP_SECRET",
  "TIKTOK_ACCESS_TOKEN",
  "SCRAPE_PROVIDER",
  "DEMO_MODE",
];

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = Object.fromEntries(SCRAPE_ENV.map((k) => [k, process.env[k]]));
  for (const k of SCRAPE_ENV) delete process.env[k];
});

afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe("no-fabrication guarantee", () => {
  it("refuses to analyse when nothing is configured, rather than inventing data", async () => {
    await assert.rejects(
      () => analyzeStore({ url: "https://shopee.co.id/erigo.official" }),
      (err: unknown) => {
        assert.ok(err instanceof NotConfiguredError, `got ${String(err)}`);
        assert.match(err.message, /nothing real to report/);
        return true;
      },
    );
  });

  it("refuses for every platform, not just Shopee", async () => {
    const urls = {
      shopee: "https://shopee.co.id/a",
      tiktok: "https://www.tiktok.com/@a",
      tokopedia: "https://www.tokopedia.com/a",
      blibli: "https://www.blibli.com/merchant/a/A-1",
    };
    for (const platform of PLATFORMS) {
      await assert.rejects(
        () => analyzeStore({ url: urls[platform] }),
        NotConfiguredError,
        `${platform} did not refuse`,
      );
    }
  });

  it("names a concrete environment variable in every refusal", () => {
    for (const platform of PLATFORMS) {
      const hint = setupHint(platform);
      assert.match(hint, /[A-Z_]+_(KEY|TOKEN|URL)/, `${platform} hint names no variable`);
    }
  });

  it("treats a platform as configured once a provider key exists", () => {
    assert.equal(isPlatformConfigured("shopee"), false);
    process.env.SCRAPERAPI_KEY = "test-key";
    assert.equal(isPlatformConfigured("shopee"), true);
  });

  it("counts TikTok's own routes, which need no scraping provider", () => {
    assert.equal(isPlatformConfigured("tiktok"), false);

    process.env.APIFY_TOKEN = "test-token";
    assert.equal(isPlatformConfigured("tiktok"), true, "Apify should satisfy TikTok");
    delete process.env.APIFY_TOKEN;

    process.env.TIKTOK_APP_KEY = "k";
    process.env.TIKTOK_APP_SECRET = "s";
    process.env.TIKTOK_ACCESS_TOKEN = "t";
    assert.equal(isPlatformConfigured("tiktok"), true, "Open API should satisfy TikTok");
    // …but it must not make Shopee suddenly work.
    assert.equal(isPlatformConfigured("shopee"), false);
  });

  it("still serves samples when they are explicitly asked for", async () => {
    const a = await analyzeStore({ url: "https://shopee.co.id/erigo.official", forceSample: true });
    assert.equal(a.sample, true);
    assert.equal(a.source, "sample");
    // Opt-in samples are still scored as worthless for decision-making.
    assert.equal(a.confidence.score, 0);
  });

  it("marks DEMO_MODE output as sample, never as real", async () => {
    process.env.DEMO_MODE = "true";
    const a = await analyzeStore({ url: "https://shopee.co.id/erigo.official" });
    assert.equal(a.sample, true);
    assert.equal(a.confidence.score, 0);
    assert.match(a.log.join(" "), /sample/i);
  });

  it("never caches sample data as if it were a real result", async () => {
    process.env.DEMO_MODE = "true";
    const first = await analyzeStore({ url: "https://shopee.co.id/cache-probe" });
    assert.equal(first.sample, true);

    // With DEMO_MODE off again the cache must not serve the sample back.
    delete process.env.DEMO_MODE;
    await assert.rejects(
      () => analyzeStore({ url: "https://shopee.co.id/cache-probe" }),
      NotConfiguredError,
      "sample data leaked out of the cache as a real result",
    );
  });
});
