# Niaga Analytics

Sales and revenue intelligence for Indonesian marketplaces. Paste an official
store link from **Shopee**, **TikTok Shop**, **Tokopedia** or **Blibli** and get
an estimated revenue model, per-SKU breakdown and catalogue health report.

Shopee and TikTok Shop are the flagship integrations; Tokopedia and Blibli ship
as best-effort adapters.

```
┌── paste URL ──┐   ┌── platform adapter ──┐   ┌── metrics ──┐   ┌── dashboard ──┐
│ shopee.co.id  │ → │ resolve shop         │ → │ price×sold  │ → │ KPIs, charts  │
│ tiktok.com/@… │   │ page the catalogue   │   │ timeline    │   │ table, CSV    │
└───────────────┘   └──────────────────────┘   └─────────────┘   └───────────────┘
```

## Quick start

```bash
npm install
cp .env.example .env.local   # optional — see "Going live" below
npm run dev                  # http://localhost:3000
```

It runs with **zero configuration**. Without credentials every store resolves to
a deterministic sample catalogue, labelled as such throughout the UI. Add keys
to switch individual routes over to live marketplace data.

## What it computes

| Metric | How |
|---|---|
| Estimated lifetime revenue | `Σ price × sold` across the catalogue |
| Monthly run rate | `Σ price × sold_recent`, falling back to 12% of lifetime |
| Average order value | lifetime revenue ÷ lifetime units |
| Monthly revenue curve | each listing's lifetime spread over the months it has been live |
| Top-10 concentration | revenue share of the ten biggest listings |
| Dead stock rate | share of listings with no recorded sales |
| Confidence score | 0–100, from data source, sold-counter coverage and catalogue size |

Revenue is an **estimate**. Marketplaces publish a lifetime sold counter and a
price, not financials — the figures exclude returns, cancellations, shipping and
fees. The confidence panel states the assumptions behind each run, and the
pipeline log records exactly which route produced the numbers.

## Going live

Everything is configured through environment variables. `.env.example`
documents each one; the short version:

### 1. A scraping transport (needed for Shopee, Tokopedia, Blibli)

Marketplaces block datacentre IPs, so requests go through a transport chain.
Set `SCRAPE_PROVIDER` to the order you want and supply at least one key:

| Provider | Variable | Free tier |
|---|---|---|
| ScraperAPI | `SCRAPERAPI_KEY` | ~5k credits |
| ScrapingBee | `SCRAPINGBEE_KEY` | ~1k credits |
| ZenRows | `ZENROWS_KEY` | ~1k credits |
| Bright Data | `BRIGHTDATA_PROXY_URL` | paid |

The chain tries each transport in order and moves on when one returns a block
page, so a provider outage degrades rather than fails.

Shopee additionally benefits from `SHOPEE_COOKIE` — a logged-out session cookie
copied from browser devtools, which lifts most of the rate limits.

### 2. TikTok Shop

Two independent routes, tried in this order:

- **Official Open API** (`TIKTOK_APP_KEY`, `TIKTOK_APP_SECRET`,
  `TIKTOK_ACCESS_TOKEN`, `TIKTOK_SHOP_CIPHER`) — exact catalogue and 30-day GMV,
  but only for a shop you own and have authorised at
  [partner.tiktokshop.com](https://partner.tiktokshop.com). Requests are signed
  with TikTok's HMAC-SHA256 scheme in `src/lib/scrape/tiktok-signature.ts`.
- **Apify actor** (`APIFY_TOKEN`) — public catalogue data for any seller, no
  ownership required. Actor ids are overridable per deployment.

Either way, public reach stats (followers, verification) are read from the
creator profile's embedded JSON.

Check `GET /api/health` to see which routes are active — it reports
configuration without echoing any secret.

## API

```bash
# One store, single JSON response
curl -X POST localhost:3000/api/analyze \
  -H 'content-type: application/json' \
  -d '{"url":"https://shopee.co.id/erigo.official"}'

# Same, streamed as server-sent events with live pipeline progress
curl -N -X POST localhost:3000/api/analyze \
  -H 'content-type: application/json' \
  -d '{"url":"https://shopee.co.id/erigo.official","stream":true}'

# Up to four stores, any mix of marketplaces
curl -X POST localhost:3000/api/compare \
  -H 'content-type: application/json' \
  -d '{"urls":["https://shopee.co.id/a","https://www.tiktok.com/@b"]}'
```

`POST /api/analyze` accepts `{ url, stream?, sample?, refresh? }`. Errors carry
a `kind` (`unsupported-url`, `upstream-blocked`, `bad-request`) plus the list of
transports that were attempted.

## Accepted URL formats

The parser normalises deep links, tracking params and share URLs down to a
store handle, so any of these work:

```
shopee.co.id/erigo.official                     → shopee/erigo.official
shopee.co.id/shop/12345678/search?keyword=kaos  → shopee/12345678
shopee.co.id/Kaos-Polos-i.12345.98765           → shopee/12345   (from a product link)
tiktok.com/@erigo.official/video/7300000000     → tiktok/erigo.official
shop-id.tokopedia.com/view/shop?seller_id=7788  → tiktok/7788    (TikTok Shop ID)
tokopedia.com/erigo/kaos-polos-hitam            → tokopedia/erigo
blibli.com/merchant/erigo-official/ERI-60002    → blibli/erigo-official
```

**Share links** are what the marketplace apps' share sheets actually produce,
and they carry no seller id at all — `id.shp.ee/DRrKeeuk` is just an opaque
code. Those are followed server-side before parsing, one hop at a time, with
loop and hop-limit guards:

```
id.shp.ee/DRrKeeuk       shp.ee   shope.ee
vt.tiktok.com/ZS2abc     vm.tiktok.com     tokopedia.link/xyz
```

Redirects, `<meta http-equiv="refresh">` and JS `location` hops are all
handled, since different shorteners use different mechanisms.

## Project layout

```
src/
  app/
    api/analyze/     POST — single store, JSON or SSE
    api/compare/     POST — up to four stores in parallel
    api/health/      GET  — which routes are configured
    page.tsx         the whole product surface
  lib/
    platform.ts      URL → { platform, handle } for all four marketplaces
    analyzer.ts      orchestration: cache → adapter → sample fallback
    metrics.ts       revenue model, buckets, insights, confidence
    scrape/
      gateway.ts     transport chain + block detection
      shopee.ts      /api/v4 storefront endpoints
      tiktok.ts      Open API → Apify → profile JSON
      tokopedia.ts   gql.tokopedia.com
      blibli.ts      REST search backend
      shortlink.ts   share-link (shp.ee, vt.tiktok.com) redirect following
      sample.ts      deterministic mock catalogue
  components/
    brand-icons.tsx  vendored marketplace marks (inline SVG)
    …                dashboard, charts, compare board
scripts/backtest.mjs end-to-end backtest CLI
tests/               node:test suites — parser, share links, metrics, backtest
```

## Development

```bash
npm run dev        # dev server
npm run test       # node:test — parsing, share links, revenue model, backtest
npm run typecheck  # tsc --noEmit
npm run build      # production build
npm run check      # all three
npm run backtest   # end-to-end backtest against a running server
```

Tests run on Node's built-in TypeScript stripping, so there is no test-runner
dependency.

### Backtesting

Revenue figures are only worth reading if the arithmetic behind them holds for
every catalogue shape, not just the tidy ones. Two layers check that.

**`tests/backtest.test.ts`** generates 2,000 randomly shaped catalogues per run
— zero prices, zero sales, missing categories, missing dates, absurd
magnitudes, single-listing stores — and asserts the invariants that must hold
for any input:

- totals reconcile: `kpi.estimatedRevenue === Σ product revenue`
- revenue shares sum to 1, and products are ranked by revenue
- price bands and categories conserve every listing and every rupiah
- the category fold never exceeds the 8-series palette cap
- the timeline is always 12 ascending months of finite, non-negative values
- every ratio stays in `[0, 1]`; nothing anywhere is `NaN` or negative
- sample data always scores exactly zero confidence
- no insight string ever leaks `NaN`/`Infinity`/`undefined`

The generator is seeded, so a failure reproduces exactly and the seed is
printed with the assertion. Raise the run count with `BACKTEST_RUNS=20000`.

**`npm run backtest`** does the same against a running server, so it covers the
whole path — URL parsing, adapter dispatch, fallback, serialisation — rather
than the model alone:

```bash
npm run backtest                          # 40 random stores on localhost:3000
npm run backtest -- --runs 200 --seed 7   # reproducible larger sweep
npm run backtest -- --base https://…      # a deployed instance
npm run backtest -- --live                # allow live scraping, not just samples
```

It prints a per-run table plus latency percentiles and exits non-zero on any
invariant breach, so it doubles as a CI gate.

## Charts and brand marks

Chart colours come from a validated categorical palette rather than brand
colours — Shopee orange, TikTok red and Tokopedia green fail colour-blind
separation badly when used as data series (Shopee vs Tokopedia measures ΔE 1.1
under deuteranopia). Brand colours appear only on platform badges and icons,
always paired with the platform name, and every chart has a table view for the
cases where colour cannot be relied on at all.

Platform icons are vendored as inline SVG in `src/components/brand-icons.tsx`,
so nothing is hotlinked from a third-party CDN:

| Platform | Mark |
|---|---|
| Shopee | Simple Icons (CC0-1.0) |
| TikTok | Simple Icons (CC0-1.0) |
| Blibli | Simple Icons (CC0-1.0) |
| Tokopedia | generic shopping-bag glyph — Simple Icons does not carry Tokopedia, and an approximated logo would be worse than an honestly generic one |

## Notes on responsible use

Collecting marketplace data can conflict with a platform's terms of service.
Check the terms that apply to you, respect robots.txt and rate limits, keep
`MAX_PRODUCTS` sane, and only analyse stores you have a legitimate business
reason to research. The official TikTok Shop route is the only one that is
unambiguously sanctioned by the platform, and it covers stores you own.

## Deploying

Vercel-ready as-is. Set the environment variables in the project settings; the
API routes run on the Node.js runtime with `maxDuration` raised for the slower
scrapes. The analysis cache is process-local — put Redis behind
`src/lib/analyzer.ts`'s cache functions before scaling past one instance.
