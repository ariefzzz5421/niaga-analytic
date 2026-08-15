/**
 * Turns a scraped catalogue into the numbers the dashboard renders.
 *
 * Every marketplace publishes a lifetime "sold" counter and nothing else, so
 * revenue here is an *estimate* built from price x sold. The confidence block
 * exists to make the size of that assumption legible rather than hidden.
 */

import type {
  Bucket,
  Confidence,
  Insight,
  Kpi,
  ProductMetrics,
  RawProduct,
  RawStore,
  ScrapeResult,
  StoreAnalysis,
  TimePoint,
} from "./types";

/** Fraction of lifetime sales assumed to have happened in the last 30 days. */
const RECENT_FALLBACK = 0.12;

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

/**
 * Blibli (and some actor outputs) publish no sold counter. Review volume is
 * the next best signal: Indonesian marketplaces see roughly one review per
 * 8-12 orders, so reviews x 10 is a defensible floor.
 */
function inferSold(product: RawProduct): number {
  if (product.sold > 0) return product.sold;
  const reviews = product.reviewCount ?? product.ratingCount ?? 0;
  return reviews > 0 ? reviews * 10 : 0;
}

function buildProducts(raw: RawProduct[]): ProductMetrics[] {
  const withRevenue = raw.map((p) => {
    const sold = inferSold(p);
    const soldRecent = p.soldRecent ?? Math.round(sold * RECENT_FALLBACK);
    const revenue = p.price * sold;
    return {
      ...p,
      sold,
      soldRecent,
      revenue,
      revenueRecent: p.price * soldRecent,
      revenueShare: 0,
      discountPct:
        p.originalPrice && p.originalPrice > p.price
          ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
          : undefined,
      reviewRate: sold > 0 && p.reviewCount ? Number((p.reviewCount / sold).toFixed(3)) : undefined,
    };
  });

  const total = sum(withRevenue.map((p) => p.revenue)) || 1;
  for (const p of withRevenue) p.revenueShare = p.revenue / total;

  return withRevenue.sort((a, b) => b.revenue - a.revenue);
}

function buildKpi(store: RawStore, products: ProductMetrics[]): Kpi {
  const revenues = products.map((p) => p.revenue);
  const prices = products.map((p) => p.price).filter((p) => p > 0);
  const estimatedRevenue = sum(revenues);
  const unitsSold = sum(products.map((p) => p.sold));
  const unitsSoldRecent = sum(products.map((p) => p.soldRecent ?? 0));

  const top10 = sum(revenues.slice(0, 10));
  const dead = products.filter((p) => p.sold === 0).length;

  return {
    estimatedRevenue,
    estimatedMonthlyRevenue: sum(products.map((p) => p.revenueRecent)),
    unitsSold,
    unitsSoldRecent,
    productCount: products.length,
    activeProductCount: products.length - dead,
    averagePrice: prices.length ? Math.round(sum(prices) / prices.length) : 0,
    medianPrice: median(prices),
    averageOrderValue: unitsSold > 0 ? Math.round(estimatedRevenue / unitsSold) : 0,
    rating: store.rating,
    ratingCount: store.ratingCount,
    followers: store.followers,
    top10Concentration: estimatedRevenue > 0 ? top10 / estimatedRevenue : 0,
    deadStockRate: products.length ? dead / products.length : 0,
  };
}

/**
 * Reconstruct a monthly revenue curve.
 *
 * When listings carry a creation date we can place lifetime revenue against
 * the months a listing was actually live, which produces a genuine growth
 * shape. Otherwise we spread the store's lifetime evenly and mark every point
 * estimated so the chart can say so.
 */
function buildTimeline(store: RawStore, products: ProductMetrics[], months = 12): TimePoint[] {
  const now = new Date();
  const points: TimePoint[] = [];
  const dated = products.filter((p) => p.listedAt);
  const useListingDates = dated.length >= products.length * 0.5 && dated.length > 0;

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).getTime();

    let revenue = 0;
    let units = 0;

    if (useListingDates) {
      for (const p of products) {
        const listed = p.listedAt ? new Date(p.listedAt).getTime() : 0;
        if (!listed || listed > monthEnd) continue;
        // Spread each listing's lifetime evenly across the months it has
        // been live, so older listings contribute to more buckets.
        const liveMonths = Math.max(1, (now.getTime() - listed) / (86_400_000 * 30.44));
        revenue += p.revenue / liveMonths;
        units += p.sold / liveMonths;
      }
    } else {
      const lifetimeMonths = Math.max(1, store.ageMonths ?? months);
      revenue = sum(products.map((p) => p.revenue)) / lifetimeMonths;
      units = sum(products.map((p) => p.sold)) / lifetimeMonths;
    }

    points.push({ month: monthKey, revenue: Math.round(revenue), units: Math.round(units), estimated: true });
  }

  return points;
}

const PRICE_BANDS: { label: string; min: number; max: number }[] = [
  { label: "< 50rb", min: 0, max: 50_000 },
  { label: "50–100rb", min: 50_000, max: 100_000 },
  { label: "100–250rb", min: 100_000, max: 250_000 },
  { label: "250–500rb", min: 250_000, max: 500_000 },
  { label: "500rb–1jt", min: 500_000, max: 1_000_000 },
  { label: "> 1jt", min: 1_000_000, max: Number.POSITIVE_INFINITY },
];

function buildPriceBands(products: ProductMetrics[]): Bucket[] {
  return PRICE_BANDS.map((band) => {
    const inBand = products.filter((p) => p.price >= band.min && p.price < band.max);
    return {
      label: band.label,
      count: inBand.length,
      revenue: sum(inBand.map((p) => p.revenue)),
      units: sum(inBand.map((p) => p.sold)),
    };
  }).filter((b) => b.count > 0);
}

function buildCategories(products: ProductMetrics[], limit = 8): Bucket[] {
  const byCategory = new Map<string, Bucket>();
  for (const p of products) {
    const label = p.category ?? "Tanpa kategori";
    const bucket = byCategory.get(label) ?? { label, count: 0, revenue: 0, units: 0 };
    bucket.count += 1;
    bucket.revenue += p.revenue;
    bucket.units += p.sold;
    byCategory.set(label, bucket);
  }

  const sorted = [...byCategory.values()].sort((a, b) => b.revenue - a.revenue);
  if (sorted.length <= limit) return sorted;

  // Never invent a colour for a 9th series — everything past the cap folds
  // into a single "Lainnya" bucket.
  const head = sorted.slice(0, limit - 1);
  const tail = sorted.slice(limit - 1);
  head.push({
    label: `Lainnya (${tail.length})`,
    count: sum(tail.map((b) => b.count)),
    revenue: sum(tail.map((b) => b.revenue)),
    units: sum(tail.map((b) => b.units)),
  });
  return head;
}

function buildRatingHistogram(products: ProductMetrics[]): Bucket[] {
  const bands = [
    { label: "< 4.0", min: 0, max: 4 },
    { label: "4.0–4.4", min: 4, max: 4.5 },
    { label: "4.5–4.7", min: 4.5, max: 4.8 },
    { label: "4.8–5.0", min: 4.8, max: 5.01 },
  ];
  const rated = products.filter((p) => typeof p.rating === "number" && p.rating! > 0);
  return bands
    .map((band) => {
      const inBand = rated.filter((p) => p.rating! >= band.min && p.rating! < band.max);
      return {
        label: band.label,
        count: inBand.length,
        revenue: sum(inBand.map((p) => p.revenue)),
        units: sum(inBand.map((p) => p.sold)),
      };
    })
    .filter((b) => b.count > 0);
}

const SEVERITY_ORDER: Record<Insight["severity"], number> = {
  critical: 0,
  serious: 1,
  warning: 2,
  good: 3,
  neutral: 4,
};

function buildInsights(
  store: RawStore,
  kpi: Kpi,
  products: ProductMetrics[],
  priceBands: Bucket[],
  categories: Bucket[],
): Insight[] {
  const insights: Insight[] = [];
  const fmt = new Intl.NumberFormat("id-ID");

  if (kpi.top10Concentration > 0.6) {
    insights.push({
      id: "concentration",
      severity: "warning",
      title: `${Math.round(kpi.top10Concentration * 100)}% of revenue sits in 10 listings`,
      detail:
        "Revenue is concentrated in a small set of hero SKUs. A stock-out or a ranking drop on any one of them moves the whole store.",
    });
  } else if (kpi.top10Concentration < 0.25 && products.length > 30) {
    insights.push({
      id: "spread",
      severity: "good",
      title: "Revenue is spread across the catalogue",
      detail: `The top 10 listings account for only ${Math.round(kpi.top10Concentration * 100)}% of estimated revenue — no single SKU dominates.`,
    });
  }

  if (kpi.deadStockRate > 0.4) {
    insights.push({
      id: "dead-stock",
      severity: "serious",
      title: `${Math.round(kpi.deadStockRate * 100)}% of listings have no recorded sales`,
      detail: `${products.length - kpi.activeProductCount} of ${products.length} listings show zero units sold. Consolidating them would lift the store's average listing quality score.`,
    });
  }

  const discounted = products.filter((p) => (p.discountPct ?? 0) >= 30);
  if (discounted.length > products.length * 0.5) {
    insights.push({
      id: "discount-dependence",
      severity: "warning",
      title: "Over half the catalogue runs a 30%+ markdown",
      detail:
        "Heavy permanent discounting usually means the list price is inflated for the badge. Margin per order is likely well below the headline AOV.",
    });
  }

  const hero = products[0];
  if (hero && hero.revenueShare > 0.15) {
    insights.push({
      id: "hero",
      severity: "neutral",
      title: `"${hero.name}" alone is ${Math.round(hero.revenueShare * 100)}% of revenue`,
      detail: `Rp ${fmt.format(hero.revenue)} estimated lifetime from ${fmt.format(hero.sold)} units at Rp ${fmt.format(hero.price)}.`,
    });
  }

  if (kpi.averageOrderValue > 0) {
    insights.push({
      id: "aov",
      severity: "neutral",
      title: `Average order value Rp ${fmt.format(kpi.averageOrderValue)}`,
      detail: `Median listing price is Rp ${fmt.format(kpi.medianPrice)}, so the mix leans ${
        kpi.averageOrderValue > kpi.medianPrice ? "toward the higher-priced end of the catalogue" : "on volume from cheaper SKUs"
      }.`,
    });
  }

  if (store.rating && store.rating >= 4.8) {
    insights.push({
      id: "rating",
      severity: "good",
      title: `Store rating ${store.rating.toFixed(2)}`,
      detail: store.ratingCount
        ? `Held across ${fmt.format(store.ratingCount)} ratings — strong enough to keep the store in Shopee/TikTok's preferred-seller tiers.`
        : "Comfortably inside the preferred-seller band on every Indonesian marketplace.",
    });
  } else if (store.rating && store.rating < 4.5) {
    insights.push({
      id: "rating-low",
      severity: "serious",
      title: `Store rating ${store.rating.toFixed(2)} is below the preferred-seller floor`,
      detail:
        "Most Indonesian marketplaces gate their seller badges and ad placements at 4.5. Recovering it is usually worth more than any single listing optimisation.",
    });
  }

  // The price band carrying the most revenue — the store's real centre of
  // gravity, which is often not where most of its listings sit.
  const topBand = [...priceBands].sort((a, b) => b.revenue - a.revenue)[0];
  const busiestBand = [...priceBands].sort((a, b) => b.count - a.count)[0];
  if (topBand && kpi.estimatedRevenue > 0) {
    const share = topBand.revenue / kpi.estimatedRevenue;
    const mismatch = busiestBand && busiestBand.label !== topBand.label;
    insights.push({
      id: "price-band",
      severity: "neutral",
      title: `The ${topBand.label} band drives ${Math.round(share * 100)}% of revenue`,
      detail: mismatch
        ? `Most listings (${busiestBand.count}) sit in the ${busiestBand.label} band instead — the catalogue's weight and its earnings are in different places.`
        : `${topBand.count} listings sit there, and they are also where the catalogue is concentrated.`,
    });
  }

  const topCategory = categories[0];
  if (topCategory && categories.length > 1 && kpi.estimatedRevenue > 0) {
    const share = topCategory.revenue / kpi.estimatedRevenue;
    insights.push({
      id: "category",
      severity: share > 0.7 ? "warning" : "neutral",
      title: `${topCategory.label} is ${Math.round(share * 100)}% of revenue`,
      detail:
        share > 0.7
          ? `The store is effectively a single-category seller. Demand shifts in ${topCategory.label} hit the whole business at once.`
          : `Spread across ${categories.length} categories, with ${topCategory.label} leading on ${fmt.format(topCategory.units)} units.`,
    });
  }

  // Units per listing per month — how hard the catalogue is working, which
  // is comparable across stores of very different sizes.
  if (products.length > 0 && kpi.unitsSoldRecent > 0) {
    const velocity = kpi.unitsSoldRecent / products.length;
    insights.push({
      id: "velocity",
      severity: velocity < 1 ? "warning" : "neutral",
      title: `${velocity.toFixed(1)} units per listing per month`,
      detail:
        velocity < 1
          ? "Under one sale per listing per month means most of the catalogue is idle inventory carrying ranking weight but no revenue."
          : `Across ${products.length} listings, that is roughly ${fmt.format(Math.round(kpi.unitsSoldRecent))} orders a month at the current run rate.`,
    });
  }

  return insights.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

function buildConfidence(result: ScrapeResult, products: ProductMetrics[]): Confidence {
  const reasons: string[] = [];
  let score = 50;

  switch (result.source) {
    case "official-api":
      score += 40;
      reasons.push("Numbers came from the marketplace's own authenticated API.");
      break;
    case "internal-api":
      score += 25;
      reasons.push("Numbers came from the marketplace's live storefront API.");
      break;
    case "provider":
      score += 15;
      reasons.push("Catalogue was collected through a third-party scraping provider.");
      break;
    case "html":
      score += 5;
      reasons.push("Catalogue was parsed out of the rendered page, so some fields may be missing.");
      break;
    case "sample":
      score = 0;
      reasons.push("No live data source was reachable — these are generated sample figures.");
      return { score, level: "low", reasons };
  }

  const withSold = products.filter((p) => p.sold > 0).length / Math.max(1, products.length);
  if (withSold > 0.8) {
    score += 10;
    reasons.push("Over 80% of listings publish a sold counter.");
  } else if (withSold < 0.3) {
    score -= 20;
    reasons.push("Most listings publish no sold counter, so units are inferred from review volume.");
  }

  if (products.length < 10) {
    score -= 15;
    reasons.push(`Only ${products.length} listings were returned — a thin sample for trend work.`);
  }

  const withDates = products.filter((p) => p.listedAt).length / Math.max(1, products.length);
  if (withDates < 0.5) {
    score -= 10;
    reasons.push("Listing dates are unavailable, so the monthly curve is a flat lifetime average.");
  }

  reasons.push("Revenue is always price x sold — it excludes returns, cancellations and shipping.");

  const clamped = Math.max(0, Math.min(100, score));
  return {
    score: clamped,
    level: clamped >= 70 ? "high" : clamped >= 40 ? "medium" : "low",
    reasons,
  };
}

export function analyse(result: ScrapeResult, durationMs: number): StoreAnalysis {
  const products = buildProducts(result.products);
  const kpi = buildKpi(result.store, products);
  const priceBands = buildPriceBands(products);
  const categories = buildCategories(products);

  return {
    store: result.store,
    source: result.source,
    sample: result.source === "sample",
    fetchedAt: new Date().toISOString(),
    durationMs,
    kpi,
    products,
    timeline: buildTimeline(result.store, products),
    priceBands,
    categories,
    ratingHistogram: buildRatingHistogram(products),
    insights: buildInsights(result.store, kpi, products, priceBands, categories),
    confidence: buildConfidence(result, products),
    log: result.log,
  };
}
