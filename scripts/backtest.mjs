#!/usr/bin/env node
/**
 * End-to-end backtest.
 *
 * Drives randomly generated store URLs through the running API and checks the
 * invariants the dashboard depends on. Where tests/backtest.test.ts exercises
 * the revenue model in isolation, this exercises the whole path — URL parsing,
 * adapter dispatch, fallback, metrics, serialisation — against a real server.
 *
 *   npm run backtest                      # 40 runs against localhost:3000
 *   npm run backtest -- --runs 200        # more runs
 *   npm run backtest -- --base https://…  # a deployed instance
 *   npm run backtest -- --live            # allow live scraping, not just samples
 *
 * Exits non-zero if any run fails an invariant, so it works as a CI gate.
 */

import { styleText } from "node:util";

/* ------------------------------------------------------------------ */
/* Args                                                                */
/* ------------------------------------------------------------------ */

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith("--") ? next : true;
}

const BASE = String(arg("base", "http://localhost:3000")).replace(/\/$/, "");
const RUNS = Number(arg("runs", 40));
const LIVE = Boolean(arg("live", false));
const SEED = Number(arg("seed", Date.now() % 1e6));

/* ------------------------------------------------------------------ */
/* Random store URLs                                                   */
/* ------------------------------------------------------------------ */

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WORDS = [
  "erigo", "eiger", "wardah", "somethinc", "scarlett", "kahf", "avoskin",
  "uniqlo", "3second", "cottonink", "bodypack", "lokal", "gudang", "sneakers",
  "batik", "kopi", "herbal", "gadget", "aksesoris", "grosir",
];
const SUFFIX = ["official", "store", "id", "indonesia", "shop", "mall", ""];

/** Build a URL in one of the shapes users actually paste. */
function randomStoreUrl(r) {
  const word = WORDS[Math.floor(r() * WORDS.length)];
  const suffix = SUFFIX[Math.floor(r() * SUFFIX.length)];
  const handle = suffix ? `${word}.${suffix}` : word;
  const id = Math.floor(r() * 9e7) + 1e6;

  const shapes = [
    () => ({ platform: "shopee", url: `https://shopee.co.id/${handle}` }),
    () => ({ platform: "shopee", url: `https://shopee.co.id/shop/${id}` }),
    () => ({ platform: "shopee", url: `https://shopee.co.id/Kaos-Polos-i.${id}.${id + 7}` }),
    () => ({ platform: "shopee", url: `shopee.co.id/${handle}?sp_atk=abc&xptdk=zz` }),
    () => ({ platform: "tiktok", url: `https://www.tiktok.com/@${handle}` }),
    () => ({ platform: "tiktok", url: `https://www.tiktok.com/@${handle}/video/${id}${id}` }),
    () => ({ platform: "tiktok", url: `https://shop-id.tokopedia.com/view/shop?seller_id=${id}` }),
    () => ({ platform: "tokopedia", url: `https://www.tokopedia.com/${word}` }),
    () => ({ platform: "tokopedia", url: `https://www.tokopedia.com/${word}/produk-abc-123` }),
    () => ({ platform: "blibli", url: `https://www.blibli.com/merchant/${word}-store/${word.slice(0, 3).toUpperCase()}-${id}` }),
  ];

  return shapes[Math.floor(r() * shapes.length)]();
}

/* ------------------------------------------------------------------ */
/* Invariants                                                          */
/* ------------------------------------------------------------------ */

const finite = (v) => typeof v === "number" && Number.isFinite(v);

/** Returns a list of human-readable failures; empty means the run is sound. */
function checkInvariants(a, expectedPlatform) {
  const bad = [];
  const k = a.kpi;

  if (a.store.platform !== expectedPlatform) {
    bad.push(`platform ${a.store.platform} != expected ${expectedPlatform}`);
  }

  for (const key of Object.keys(k)) {
    if (k[key] == null) continue;
    if (!finite(k[key])) bad.push(`kpi.${key} = ${k[key]}`);
    else if (k[key] < 0) bad.push(`kpi.${key} negative (${k[key]})`);
  }

  const summed = a.products.reduce((s, p) => s + p.revenue, 0);
  if (summed !== k.estimatedRevenue) {
    bad.push(`Σ product revenue ${summed} != kpi ${k.estimatedRevenue}`);
  }
  if (a.products.length !== k.productCount) bad.push("productCount mismatch");

  for (let i = 1; i < a.products.length; i++) {
    if (a.products[i - 1].revenue < a.products[i].revenue) {
      bad.push(`products unsorted at ${i}`);
      break;
    }
  }

  if (k.estimatedRevenue > 0) {
    const shares = a.products.reduce((s, p) => s + p.revenueShare, 0);
    if (Math.abs(shares - 1) > 1e-6) bad.push(`revenue shares sum to ${shares}`);
  }
  if (k.top10Concentration < 0 || k.top10Concentration > 1 + 1e-9) {
    bad.push(`top10Concentration ${k.top10Concentration}`);
  }
  if (k.deadStockRate < 0 || k.deadStockRate > 1) bad.push(`deadStockRate ${k.deadStockRate}`);

  const bandCount = a.priceBands.reduce((s, b) => s + b.count, 0);
  if (bandCount !== a.products.length) bad.push("price bands lost listings");
  const catCount = a.categories.reduce((s, c) => s + c.count, 0);
  if (catCount !== a.products.length) bad.push("categories lost listings");
  if (a.categories.length > 8) bad.push(`${a.categories.length} category series (cap is 8)`);

  if (a.timeline.length !== 12) bad.push(`timeline has ${a.timeline.length} points`);
  const months = a.timeline.map((t) => t.month);
  if (String(months) !== String([...months].sort())) bad.push("timeline out of order");
  for (const p of a.timeline) {
    if (!finite(p.revenue) || p.revenue < 0) bad.push(`timeline ${p.month} revenue ${p.revenue}`);
  }

  if (a.confidence.score < 0 || a.confidence.score > 100) {
    bad.push(`confidence ${a.confidence.score}`);
  }
  if (a.sample !== (a.source === "sample")) bad.push("sample flag disagrees with source");
  if (a.sample && a.confidence.score !== 0) bad.push("sample data scored above zero confidence");

  for (const i of a.insights) {
    if (/NaN|Infinity|undefined/.test(i.title + i.detail)) {
      bad.push(`insight ${i.id} leaked a bad number`);
    }
  }

  return bad;
}

/* ------------------------------------------------------------------ */
/* Run                                                                 */
/* ------------------------------------------------------------------ */

const idr = (n) => {
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}M`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}jt`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}rb`;
  return String(n);
};

const ok = (s) => styleText("green", s);
const err = (s) => styleText("red", s);
const dim = (s) => styleText("gray", s);

async function main() {
  console.log(dim(`backtest → ${BASE}   runs=${RUNS}   seed=${SEED}   mode=${LIVE ? "live" : "sample"}`));

  try {
    const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
    console.log(dim(`transports: ${health.transports.join(", ")}   live routes: ${health.live}`));
  } catch {
    console.error(err(`Cannot reach ${BASE}. Start the server first (npm run dev).`));
    process.exit(2);
  }

  const r = rng(SEED);
  const rows = [];
  let failures = 0;
  const durations = [];

  console.log();
  console.log(
    dim(
      "  # " +
        "platform".padEnd(10) +
        "source".padEnd(14) +
        "SKU".padStart(5) +
        "revenue".padStart(10) +
        "monthly".padStart(10) +
        "conf".padStart(6) +
        "  ms" ,
    ),
  );

  for (let i = 1; i <= RUNS; i++) {
    const { platform, url } = randomStoreUrl(r);
    const started = Date.now();

    try {
      const res = await fetch(`${BASE}/api/analyze`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, sample: !LIVE }),
      });
      const body = await res.json();
      const ms = Date.now() - started;
      durations.push(ms);

      if (!res.ok) {
        failures++;
        console.log(`${String(i).padStart(3)} ${err("FAIL")} ${platform.padEnd(10)} HTTP ${res.status}: ${body.error}`);
        rows.push({ url, ok: false });
        continue;
      }

      const bad = checkInvariants(body, platform);
      if (bad.length) {
        failures++;
        console.log(`${String(i).padStart(3)} ${err("FAIL")} ${platform.padEnd(10)} ${url}`);
        for (const b of bad) console.log(`      ${err("· " + b)}`);
      } else {
        console.log(
          `${String(i).padStart(3)} ${ok("ok  ")} ` +
            platform.padEnd(10) +
            body.source.padEnd(14) +
            String(body.kpi.productCount).padStart(5) +
            idr(body.kpi.estimatedRevenue).padStart(10) +
            idr(body.kpi.estimatedMonthlyRevenue).padStart(10) +
            String(body.confidence.score).padStart(6) +
            dim(`  ${ms}`),
        );
      }
      rows.push({ url, ok: bad.length === 0, analysis: body });
    } catch (e) {
      failures++;
      durations.push(Date.now() - started);
      console.log(`${String(i).padStart(3)} ${err("FAIL")} ${platform.padEnd(10)} ${e.message}`);
      rows.push({ url, ok: false });
    }
  }

  /* --- Summary ---------------------------------------------------- */
  const good = rows.filter((x) => x.ok && x.analysis);
  const revenues = good.map((x) => x.analysis.kpi.estimatedRevenue).sort((a, b) => a - b);
  const p50 = revenues[Math.floor(revenues.length / 2)] ?? 0;
  durations.sort((a, b) => a - b);

  console.log();
  console.log(dim("─".repeat(64)));
  console.log(`  runs        ${RUNS}`);
  console.log(`  passed      ${failures === 0 ? ok(String(RUNS - failures)) : String(RUNS - failures)}`);
  console.log(`  failed      ${failures === 0 ? "0" : err(String(failures))}`);
  if (good.length) {
    console.log(`  median rev  Rp ${idr(p50)}`);
    console.log(`  latency     p50 ${durations[Math.floor(durations.length / 2)]}ms · p95 ${durations[Math.floor(durations.length * 0.95)]}ms`);
    const bySource = {};
    for (const g of good) bySource[g.analysis.source] = (bySource[g.analysis.source] ?? 0) + 1;
    console.log(`  sources     ${Object.entries(bySource).map(([k, v]) => `${k}=${v}`).join("  ")}`);
  }
  console.log(dim("─".repeat(64)));

  if (failures) {
    console.log(err(`\n${failures} run(s) failed an invariant — results are not trustworthy yet.`));
    process.exit(1);
  }
  console.log(ok("\nAll invariants held. Results are internally consistent."));
}

await main();
