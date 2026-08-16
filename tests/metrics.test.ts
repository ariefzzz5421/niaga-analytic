import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { analyse } from "../src/lib/metrics.ts";
import type { RawProduct, RawStore, ScrapeResult } from "../src/lib/types.ts";

function product(over: Partial<RawProduct> & { id: string }): RawProduct {
  return { name: `Product ${over.id}`, price: 100_000, sold: 10, ...over };
}

function result(products: RawProduct[], over: Partial<ScrapeResult> = {}): ScrapeResult {
  const store: RawStore = {
    platform: "shopee",
    handle: "test",
    url: "https://shopee.co.id/test",
    name: "Test Store",
    ageMonths: 12,
  };
  return { store, products, source: "internal-api", log: [], ...over };
}

describe("analyse", () => {
  it("computes revenue as price x sold and totals it", () => {
    const a = analyse(
      result([
        product({ id: "a", price: 50_000, sold: 100 }), // 5,000,000
        product({ id: "b", price: 20_000, sold: 50 }), //  1,000,000
      ]),
      0,
    );

    assert.equal(a.kpi.estimatedRevenue, 6_000_000);
    assert.equal(a.kpi.unitsSold, 150);
    assert.equal(a.kpi.averageOrderValue, 40_000);
  });

  it("ranks products by revenue, not by price or units", () => {
    const a = analyse(
      result([
        product({ id: "cheap-fast", price: 10_000, sold: 1000 }), // 10,000,000
        product({ id: "pricey-slow", price: 900_000, sold: 5 }), //   4,500,000
      ]),
      0,
    );

    assert.equal(a.products[0].id, "cheap-fast");
    assert.ok(a.products[0].revenueShare > a.products[1].revenueShare);
  });

  it("revenue shares sum to 1", () => {
    const a = analyse(
      result(
        Array.from({ length: 20 }, (_, i) =>
          product({ id: String(i), price: (i + 1) * 1000, sold: 20 - i }),
        ),
      ),
      0,
    );

    const total = a.products.reduce((s, p) => s + p.revenueShare, 0);
    assert.ok(Math.abs(total - 1) < 1e-9, `shares summed to ${total}`);
  });

  it("infers units from review volume when no sold counter is published", () => {
    // Blibli publishes reviews but not sold — 1 review per ~10 orders.
    const a = analyse(result([product({ id: "a", price: 100_000, sold: 0, reviewCount: 30 })]), 0);

    assert.equal(a.products[0].sold, 300);
    assert.equal(a.kpi.estimatedRevenue, 30_000_000);
  });

  it("counts zero-sale listings as dead stock", () => {
    const a = analyse(
      result([
        product({ id: "live", sold: 10 }),
        product({ id: "dead1", sold: 0 }),
        product({ id: "dead2", sold: 0 }),
      ]),
      0,
    );

    assert.equal(a.kpi.activeProductCount, 1);
    assert.ok(Math.abs(a.kpi.deadStockRate - 2 / 3) < 1e-9);
  });

  it("flags revenue concentration when the top ten dominate", () => {
    const products = [
      product({ id: "hero", price: 1_000_000, sold: 1000 }),
      ...Array.from({ length: 40 }, (_, i) => product({ id: `tail${i}`, price: 10_000, sold: 1 })),
    ];
    const a = analyse(result(products), 0);

    assert.ok(a.kpi.top10Concentration > 0.6);
    assert.ok(a.insights.some((i) => i.id === "concentration"));
  });

  it("always produces several insights, most severe first", () => {
    const products = Array.from({ length: 40 }, (_, i) =>
      product({
        id: String(i),
        price: (i + 1) * 25_000,
        sold: 200 - i * 4,
        category: `Kategori ${i % 4}`,
      }),
    );
    const a = analyse(result(products), 0);

    assert.ok(a.insights.length >= 3, `only ${a.insights.length} insights`);

    const rank = { critical: 0, serious: 1, warning: 2, good: 3, neutral: 4 };
    const order = a.insights.map((i) => rank[i.severity]);
    assert.deepEqual(order, [...order].sort((x, y) => x - y));
  });

  it("scores sample data as zero confidence and marks the analysis", () => {
    const a = analyse(result([product({ id: "a" })], { source: "sample" }), 0);

    assert.equal(a.sample, true);
    assert.equal(a.confidence.score, 0);
    assert.equal(a.confidence.level, "low");
  });

  it("rates the official API above a scraping provider", () => {
    const products = Array.from({ length: 30 }, (_, i) =>
      product({ id: String(i), listedAt: new Date().toISOString() }),
    );
    const official = analyse(result(products, { source: "official-api" }), 0);
    const provider = analyse(result(products, { source: "provider" }), 0);

    assert.ok(official.confidence.score > provider.confidence.score);
  });

  it("builds a 12-month timeline whose months are in ascending order", () => {
    const a = analyse(result([product({ id: "a" })]), 0);

    assert.equal(a.timeline.length, 12);
    const months = a.timeline.map((t) => t.month);
    assert.deepEqual(months, [...months].sort());
  });

  it("folds categories past the cap into a single Lainnya bucket", () => {
    const products = Array.from({ length: 12 }, (_, i) =>
      product({ id: String(i), category: `Kategori ${i}`, price: (12 - i) * 10_000 }),
    );
    const a = analyse(result(products), 0);

    assert.ok(a.categories.length <= 8);
    assert.ok(a.categories.at(-1)!.label.startsWith("Lainnya"));
    // Nothing may be lost in the fold.
    const bucketed = a.categories.reduce((s, c) => s + c.count, 0);
    assert.equal(bucketed, 12);
  });

  it("keeps price bands and totals consistent with the catalogue", () => {
    const products = [
      product({ id: "a", price: 30_000, sold: 10 }),
      product({ id: "b", price: 120_000, sold: 10 }),
      product({ id: "c", price: 2_000_000, sold: 10 }),
    ];
    const a = analyse(result(products), 0);

    assert.equal(
      a.priceBands.reduce((s, b) => s + b.count, 0),
      3,
    );
    assert.equal(
      a.priceBands.reduce((s, b) => s + b.revenue, 0),
      a.kpi.estimatedRevenue,
    );
  });

  it("survives an empty catalogue without dividing by zero", () => {
    const a = analyse(result([]), 0);

    assert.equal(a.kpi.estimatedRevenue, 0);
    assert.equal(a.kpi.averageOrderValue, 0);
    assert.equal(a.kpi.top10Concentration, 0);
    assert.equal(a.kpi.deadStockRate, 0);
    assert.ok(Number.isFinite(a.kpi.averagePrice));
  });
});
