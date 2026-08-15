/**
 * Shared domain types for the store analyzer.
 *
 * Every platform adapter normalises whatever the marketplace returns into
 * `RawProduct[]` + `RawStore`; the metrics layer turns those into a
 * `StoreAnalysis`, which is the only shape the UI ever sees.
 */

export const PLATFORMS = ["shopee", "tiktok", "tokopedia", "blibli"] as const;
export type Platform = (typeof PLATFORMS)[number];

export type DataSource =
  | "official-api" // marketplace's own partner/open API (authenticated)
  | "internal-api" // marketplace's undocumented JSON endpoints
  | "html" // parsed from embedded JSON in the page
  | "provider" // third-party scraping provider (Apify, ScraperAPI, ...)
  | "sample"; // deterministic demo data, no network involved

export interface StoreRef {
  platform: Platform;
  /** Human readable handle, e.g. `erigostore`. */
  handle: string;
  /** Platform-native numeric/opaque id when we can resolve one. */
  storeId?: string;
  /** The canonical storefront URL we resolved from the pasted input. */
  url: string;
}

export interface RawStore extends StoreRef {
  name: string;
  avatarUrl?: string;
  followers?: number;
  rating?: number;
  ratingCount?: number;
  productCount?: number;
  /** Shop age in months, when the platform exposes a join date. */
  ageMonths?: number;
  location?: string;
  isOfficial?: boolean;
  responseRate?: number;
}

export interface RawProduct {
  id: string;
  name: string;
  url?: string;
  imageUrl?: string;
  /** Current selling price in IDR (already de-normalised from micro units). */
  price: number;
  /** Strike-through / pre-discount price in IDR. */
  originalPrice?: number;
  /** Lifetime units sold as reported by the platform. */
  sold: number;
  /** Units sold in the platform's recent window (usually 30 days). */
  soldRecent?: number;
  stock?: number;
  rating?: number;
  ratingCount?: number;
  reviewCount?: number;
  category?: string;
  /** ISO date the listing was created, when exposed. */
  listedAt?: string;
}

/* ------------------------------------------------------------------ */
/* Derived analytics                                                   */
/* ------------------------------------------------------------------ */

export interface ProductMetrics extends RawProduct {
  /** price x sold — lifetime gross merchandise value for this listing. */
  revenue: number;
  /** Share of the store's total estimated revenue, 0..1. */
  revenueShare: number;
  /** price x soldRecent — monthly run rate for this listing. */
  revenueRecent: number;
  discountPct?: number;
  /** reviewCount / sold — a rough proxy for how real the sold count is. */
  reviewRate?: number;
}

export interface Kpi {
  estimatedRevenue: number;
  estimatedMonthlyRevenue: number;
  unitsSold: number;
  unitsSoldRecent: number;
  productCount: number;
  activeProductCount: number;
  averagePrice: number;
  medianPrice: number;
  averageOrderValue: number;
  rating?: number;
  ratingCount?: number;
  followers?: number;
  /** Share of revenue coming from the top 10 listings, 0..1. */
  top10Concentration: number;
  /** Listings with zero recorded sales, 0..1. */
  deadStockRate: number;
}

export interface TimePoint {
  /** `YYYY-MM` */
  month: string;
  revenue: number;
  units: number;
  /** True when the point is modelled rather than reported by the platform. */
  estimated: boolean;
}

export interface Bucket {
  label: string;
  count: number;
  revenue: number;
  units: number;
}

export interface Insight {
  id: string;
  severity: "good" | "warning" | "serious" | "critical" | "neutral";
  title: string;
  detail: string;
}

export interface Confidence {
  /** 0..100 */
  score: number;
  level: "low" | "medium" | "high";
  reasons: string[];
}

export interface StoreAnalysis {
  store: RawStore;
  source: DataSource;
  /** True when no live marketplace data was reachable and we served samples. */
  sample: boolean;
  fetchedAt: string;
  /** Milliseconds the scrape + analysis took. */
  durationMs: number;
  kpi: Kpi;
  products: ProductMetrics[];
  timeline: TimePoint[];
  priceBands: Bucket[];
  categories: Bucket[];
  ratingHistogram: Bucket[];
  insights: Insight[];
  confidence: Confidence;
  /** Notes emitted by the scrape pipeline — surfaced in the UI console. */
  log: string[];
}

/* ------------------------------------------------------------------ */
/* Pipeline plumbing                                                   */
/* ------------------------------------------------------------------ */

export interface ScrapeResult {
  store: RawStore;
  products: RawProduct[];
  source: DataSource;
  log: string[];
}

export type ProgressStage =
  | "resolve"
  | "connect"
  | "store"
  | "products"
  | "analyze"
  | "done"
  | "error";

export interface ProgressEvent {
  stage: ProgressStage;
  message: string;
  /** 0..100 */
  progress: number;
}

export interface ScrapeContext {
  emit: (event: ProgressEvent) => void;
  signal?: AbortSignal;
  /** Hard cap on listings pulled per store. */
  maxProducts: number;
}
