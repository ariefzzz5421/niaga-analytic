/**
 * Randomised backtest of the revenue model.
 *
 * The example-based suite in metrics.test.ts checks specific numbers. This one
 * instead throws thousands of randomly shaped catalogues at `analyse` and
 * asserts the invariants that must hold for *any* input — the totals have to
 * reconcile, nothing may be NaN, every bucket has to conserve its listings,
 * and every ratio has to stay in range.
 *
 * The generator is seeded, so a failure reproduces exactly: the seed is
 * printed with the assertion.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { analyse } from "../src/lib/metrics.ts";
import type { DataSource, Platform, RawProduct, RawStore, ScrapeResult } from "../src/lib/types.ts";

/* ------------------------------------------------------------------ */
/* Seeded generator                                                    */
/* ------------------------------------------------------------------ */

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PLATFORMS: Platform[] = ["shopee", "tiktok", "tokopedia", "blibli"];
const SOURCES: DataSource[] = ["official-api", "internal-api", "html", "provider", "sample"];

/**
 * Deliberately hostile catalogue generator: zero prices, zero sales, absent
 * categories, absent dates, absurd magnitudes and single-listing stores all
 * appear regularly, because those are the shapes that break arithmetic.
 */
function randomCatalogue(r: () => number): ScrapeResult {
  const count = Math.floor(r() * r() * 220); // biased toward small, occasionally large
  const noCategories = r() < 0.2;
  const noDates = r() < 0.3;
  const noSoldCounter = r() < 0.15;

  const products: RawProduct[] = [];
  for (let i = 0; i < count; i++) {
    const zeroPrice = r() < 0.05;
    const zeroSold = r() < 0.25;
    const huge = r() < 0.03;

    const price = zeroPrice ? 0 : Math.round(r() * (huge ? 80_000_000 : 900_000));
    const sold = noSoldCounter || zeroSold ? 0 : Math.round(r() * (huge ? 400_000 : 8_000));
    const reviews = Math.round(sold * r() * 0.3) + (r() < 0.1 ? Math.round(r() * 500) : 0);

    products.push({
      id: `p${i}`,
      name: `Produk ${i}`,
      price,
      originalPrice: r() < 0.5 ? Math.round(price * (1 + r())) : undefined,
      sold,
      soldRecent: r() < 0.5 ? Math.round(sold * r()) : undefined,
      stock: r() < 0.8 ? Math.round(r() * 2000) : undefined,
      rating: r() < 0.85 ? Number((3 + r() * 2).toFixed(2)) : undefined,
      ratingCount: reviews,
      reviewCount: reviews,
      category: noCategories ? undefined : `Kategori ${Math.floor(r() * 14)}`,
      listedAt: noDates
        ? undefined
        : new Date(Date.now() - r() * 1200 * 86_400_000).toISOString(),
    });
  }

  const platform = PLATFORMS[Math.floor(r() * PLATFORMS.length)];
  const store: RawStore = {
    platform,
    handle: `store-${Math.floor(r() * 1e6)}`,
    url: `https://example.com/${platform}`,
    name: `Store ${Math.floor(r() * 1e6)}`,
    followers: r() < 0.8 ? Math.round(r() * 3_000_000) : undefined,
    rating: r() < 0.8 ? Number((3.5 + r() * 1.5).toFixed(2)) : undefined,
    ratingCount: r() < 0.8 ? Math.round(r() * 500_000) : undefined,
    ageMonths: r() < 0.7 ? Math.max(1, Math.round(r() * 90)) : undefined,
  };

  return {
    store,
    products,
    source: SOURCES[Math.floor(r() * SOURCES.length)],
    log: [],
  };
}

/** Every number the dashboard renders has to be a real, finite number. */
function assertFinite(value: unknown, path: string, seed: number): void {
  assert.equal(
    typeof value === "number" && Number.isFinite(value),
    true,
    `seed ${seed}: ${path} is ${String(value)}, expected a finite number`,
  );
}

/* ------------------------------------------------------------------ */

const RUNS = Number(process.env.BACKTEST_RUNS ?? 2000);

describe("randomised backtest", () => {
  it(`holds every invariant across ${RUNS} random catalogues`, () => {
    for (let seed = 1; seed <= RUNS; seed++) {
      const r = rng(seed);
      const input = randomCatalogue(r);
      const a = analyse(input, 0);
      const k = a.kpi;
      const where = (s: string) => `seed ${seed}: ${s}`;

      /* --- KPIs are all real numbers ------------------------------- */
      for (const key of [
        "estimatedRevenue",
        "estimatedMonthlyRevenue",
        "unitsSold",
        "unitsSoldRecent",
        "productCount",
        "activeProductCount",
        "averagePrice",
        "medianPrice",
        "averageOrderValue",
        "top10Concentration",
        "deadStockRate",
      ] as const) {
        assertFinite(k[key], `kpi.${key}`, seed);
        assert.ok(k[key] >= 0, where(`kpi.${key} is negative (${k[key]})`));
      }

      /* --- Totals reconcile with the parts ------------------------- */
      const summed = a.products.reduce((s, p) => s + p.revenue, 0);
      assert.equal(k.estimatedRevenue, summed, where("estimatedRevenue != Σ product revenue"));
      assert.equal(k.productCount, a.products.length, where("productCount != products.length"));

      /* --- Ratios stay in range ------------------------------------ */
      assert.ok(
        k.top10Concentration >= 0 && k.top10Concentration <= 1 + 1e-9,
        where(`top10Concentration out of range (${k.top10Concentration})`),
      );
      assert.ok(
        k.deadStockRate >= 0 && k.deadStockRate <= 1,
        where(`deadStockRate out of range (${k.deadStockRate})`),
      );
      assert.ok(
        k.activeProductCount <= k.productCount,
        where("activeProductCount exceeds productCount"),
      );

      /* --- Products are ranked and their shares sum to 1 ----------- */
      for (let i = 1; i < a.products.length; i++) {
        assert.ok(
          a.products[i - 1].revenue >= a.products[i].revenue,
          where(`products not sorted by revenue at index ${i}`),
        );
      }
      for (const p of a.products) {
        assertFinite(p.revenue, `product ${p.id} revenue`, seed);
        assertFinite(p.revenueShare, `product ${p.id} revenueShare`, seed);
        assert.ok(p.sold >= 0, where(`product ${p.id} has negative sold`));
      }
      if (k.estimatedRevenue > 0) {
        const shares = a.products.reduce((s, p) => s + p.revenueShare, 0);
        assert.ok(Math.abs(shares - 1) < 1e-6, where(`revenue shares sum to ${shares}`));
      }

      /* --- Buckets conserve listings and revenue ------------------- */
      const bandCount = a.priceBands.reduce((s, b) => s + b.count, 0);
      assert.equal(bandCount, a.products.length, where("price bands lost listings"));
      const bandRevenue = a.priceBands.reduce((s, b) => s + b.revenue, 0);
      assert.equal(bandRevenue, k.estimatedRevenue, where("price bands lost revenue"));

      const catCount = a.categories.reduce((s, c) => s + c.count, 0);
      assert.equal(catCount, a.products.length, where("categories lost listings"));
      // The palette caps categorical series at 8 — the fold must never exceed it.
      assert.ok(a.categories.length <= 8, where(`${a.categories.length} category series`));

      /* --- Timeline is well formed --------------------------------- */
      assert.equal(a.timeline.length, 12, where("timeline is not 12 months"));
      const months = a.timeline.map((t) => t.month);
      assert.deepEqual(months, [...months].sort(), where("timeline months out of order"));
      for (const point of a.timeline) {
        assertFinite(point.revenue, `timeline ${point.month} revenue`, seed);
        assertFinite(point.units, `timeline ${point.month} units`, seed);
        assert.ok(point.revenue >= 0, where(`timeline ${point.month} revenue is negative`));
        assert.ok(/^\d{4}-\d{2}$/.test(point.month), where(`bad month key ${point.month}`));
      }

      /* --- Confidence is scored consistently ----------------------- */
      assert.ok(
        a.confidence.score >= 0 && a.confidence.score <= 100,
        where(`confidence ${a.confidence.score} out of range`),
      );
      const expectedLevel =
        a.confidence.score >= 70 ? "high" : a.confidence.score >= 40 ? "medium" : "low";
      assert.equal(a.confidence.level, expectedLevel, where("confidence level disagrees with score"));
      assert.ok(a.confidence.reasons.length > 0, where("confidence has no stated reasons"));
      assert.equal(a.sample, input.source === "sample", where("sample flag disagrees with source"));
      if (input.source === "sample") {
        assert.equal(a.confidence.score, 0, where("sample data scored above zero confidence"));
      }

      /* --- Insights are well formed -------------------------------- */
      const ids = a.insights.map((i) => i.id);
      assert.equal(new Set(ids).size, ids.length, where("duplicate insight ids"));
      for (const insight of a.insights) {
        assert.ok(insight.title.length > 0, where(`insight ${insight.id} has no title`));
        assert.ok(!/NaN|Infinity|undefined/.test(insight.title + insight.detail),
          where(`insight ${insight.id} leaked a bad number: ${insight.title}`));
      }
    }
  });

  it("is deterministic — the same seed produces the same analysis", () => {
    const a = analyse(randomCatalogue(rng(42)), 0);
    const b = analyse(randomCatalogue(rng(42)), 0);

    assert.equal(a.kpi.estimatedRevenue, b.kpi.estimatedRevenue);
    assert.deepEqual(
      a.products.map((p) => p.revenue),
      b.products.map((p) => p.revenue),
    );
  });
});
