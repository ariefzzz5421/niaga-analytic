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
      sample.ts      deterministic mock catalogue
  components/        dashboard, charts, compare board
tests/               node:test suites for the parser and metrics
```

## Development

```bash
npm run dev        # dev server
npm run test       # node:test — URL parsing + revenue model
npm run typecheck  # tsc --noEmit
npm run build      # production build
npm run check      # all three
```

Tests run on Node's built-in TypeScript stripping, so there is no test-runner
dependency.

## Charts

Chart colours come from a validated categorical palette rather than brand
colours — Shopee orange, TikTok red and Tokopedia green fail colour-blind
separation badly when used as data series. Brand colours appear only on
platform badges, always paired with the platform name. Every chart has a table
view for the cases where colour cannot be relied on at all.

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
