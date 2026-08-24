/**
 * Deterministic sample catalogue.
 *
 * Used when no live route is reachable — no credentials configured, or every
 * transport got blocked. The same handle always produces the same store, so
 * screenshots and demos are reproducible. Everything it returns is flagged
 * `sample: true` all the way to the UI, which labels it loudly.
 */

import type { Platform, RawProduct, RawStore, ScrapeResult, StoreRef } from "../types";

/** xmur3 + mulberry32: a small, stable, seedable PRNG. */
function seeded(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CATEGORIES = [
  {
    name: "Fashion Pria",
    items: ["Kaos Oversize", "Kemeja Flanel", "Celana Cargo", "Jaket Bomber", "Hoodie Basic", "Chino Pants"],
    price: [79_000, 349_000],
  },
  {
    name: "Fashion Wanita",
    items: ["Dress Midi", "Blouse Linen", "Rok Plisket", "Cardigan Knit", "Tunik Rayon", "Kulot Highwaist"],
    price: [69_000, 299_000],
  },
  {
    name: "Elektronik",
    items: ["TWS Bluetooth", "Powerbank 20000mAh", "Smartwatch", "Kabel Fast Charging", "Speaker Portable"],
    price: [45_000, 899_000],
  },
  {
    name: "Kecantikan",
    items: ["Serum Vitamin C", "Sunscreen SPF50", "Lip Tint Matte", "Cushion Foundation", "Micellar Water"],
    price: [35_000, 259_000],
  },
  {
    name: "Rumah Tangga",
    items: ["Rak Serbaguna", "Toples Kedap Udara", "Keset Anti Slip", "Lampu LED Strip", "Organizer Laci"],
    price: [25_000, 199_000],
  },
  {
    name: "Aksesoris",
    items: ["Tas Selempang", "Dompet Kulit", "Topi Bucket", "Kacamata UV400", "Ikat Pinggang"],
    price: [39_000, 279_000],
  },
];

const VARIANTS = ["Premium", "Basic", "Edisi Terbatas", "Series 2", "Pro", "Daily", "Signature", "Classic"];

const PLATFORM_PROFILE: Record<Platform, { products: [number, number]; velocity: number; followers: number }> = {
  // TikTok Shop skews to fewer SKUs with much higher velocity per SKU;
  // Shopee and Tokopedia carry long tails.
  shopee: { products: [60, 220], velocity: 1.0, followers: 180_000 },
  tiktok: { products: [25, 90], velocity: 1.9, followers: 420_000 },
  tokopedia: { products: [50, 190], velocity: 0.75, followers: 90_000 },
  blibli: { products: [30, 120], velocity: 0.45, followers: 24_000 },
  lazada: { products: [40, 160], velocity: 0.6, followers: 60_000 },
  bukalapak: { products: [35, 140], velocity: 0.4, followers: 18_000 },
};

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function between(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Sales follow a power law: a few hero SKUs carry most of the revenue. */
function paretoSold(rng: () => number, rank: number, total: number, velocity: number): number {
  const position = rank / Math.max(1, total);
  const decay = Math.pow(1 - position, 2.6);
  const noise = between(rng, 0.55, 1.6);
  return Math.round(decay * noise * 4200 * velocity);
}

export function sampleScrape(ref: StoreRef): ScrapeResult {
  const rng = seeded(`${ref.platform}:${ref.handle}`);
  const profile = PLATFORM_PROFILE[ref.platform];
  const count = Math.round(between(rng, profile.products[0], profile.products[1]));

  const products: RawProduct[] = [];
  for (let i = 0; i < count; i++) {
    const cat = pick(rng, CATEGORIES);
    const base = pick(rng, cat.items);
    const variant = pick(rng, VARIANTS);
    const price = Math.round(between(rng, cat.price[0], cat.price[1]) / 1000) * 1000;
    const discount = rng() < 0.62 ? between(rng, 1.15, 1.85) : 1;
    const sold = paretoSold(rng, i, count, profile.velocity);
    const rating = Number(between(rng, 4.3, 5).toFixed(2));

    products.push({
      id: `${ref.platform}-${i}`,
      name: `${base} ${variant} ${ref.handle.split(/[.\-_]/)[0].toUpperCase()}`,
      url: ref.url,
      price,
      originalPrice: discount > 1 ? Math.round((price * discount) / 1000) * 1000 : undefined,
      sold,
      soldRecent: Math.round(sold * between(rng, 0.06, 0.22)),
      stock: Math.round(between(rng, 0, 900)),
      rating,
      ratingCount: Math.round(sold * between(rng, 0.08, 0.3)),
      reviewCount: Math.round(sold * between(rng, 0.05, 0.24)),
      category: cat.name,
      listedAt: new Date(Date.now() - between(rng, 30, 900) * 86_400_000).toISOString(),
    });
  }

  // Re-sort so the pareto ranking matches the presented order.
  products.sort((a, b) => b.sold * b.price - a.sold * a.price);

  const ageMonths = Math.round(between(rng, 8, 72));
  const store: RawStore = {
    ...ref,
    name: ref.handle
      .split(/[.\-_]/)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" "),
    followers: Math.round(profile.followers * between(rng, 0.25, 2.4)),
    rating: Number(between(rng, 4.6, 4.95).toFixed(2)),
    ratingCount: Math.round(between(rng, 2_000, 180_000)),
    productCount: count,
    ageMonths,
    location: pick(rng, ["Jakarta Pusat", "Bandung", "Surabaya", "Tangerang", "Bekasi", "Semarang"]),
    isOfficial: rng() > 0.45,
    responseRate: Math.round(between(rng, 82, 100)),
  };

  return {
    store,
    products,
    source: "sample",
    log: [
      "no live transport available — served deterministic sample catalogue",
      `seed "${ref.platform}:${ref.handle}" → ${count} listings`,
    ],
  };
}
