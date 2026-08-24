import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseStoreUrl, tryParseStoreUrl } from "../src/lib/platform.ts";

describe("parseStoreUrl", () => {
  it("accepts a bare host with no scheme", () => {
    const ref = parseStoreUrl("shopee.co.id/erigo.official");
    assert.equal(ref.platform, "shopee");
    assert.equal(ref.handle, "erigo.official");
    assert.equal(ref.url, "https://shopee.co.id/erigo.official");
  });

  it("reads the shop id out of a Shopee /shop/ link and drops query noise", () => {
    const ref = parseStoreUrl("https://shopee.co.id/shop/12345678/search?keyword=kaos");
    assert.equal(ref.handle, "12345678");
    assert.equal(ref.storeId, "12345678");
  });

  it("recovers the shop id from a Shopee product permalink", () => {
    // The slug and both ids share one path segment: Name-i.<shopid>.<itemid>
    const ref = parseStoreUrl("https://shopee.co.id/Kaos-Polos-Pria-i.12345.98765");
    assert.equal(ref.storeId, "12345");
    assert.equal(ref.url, "https://shopee.co.id/shop/12345");
  });

  it("does not mistake a dotted seller handle for a product permalink", () => {
    const ref = parseStoreUrl("https://shopee.co.id/erigo.official.id");
    assert.equal(ref.handle, "erigo.official.id");
  });

  it("pulls the handle out of a TikTok video URL", () => {
    const ref = parseStoreUrl("https://www.tiktok.com/@erigo.official/video/7300000000");
    assert.equal(ref.platform, "tiktok");
    assert.equal(ref.handle, "erigo.official");
  });

  it("routes shop-id.tokopedia.com to TikTok Shop, not Tokopedia", () => {
    // Post-merger, TikTok Shop Indonesia is served from a tokopedia.com host.
    const ref = parseStoreUrl("https://shop-id.tokopedia.com/view/shop?seller_id=778899");
    assert.equal(ref.platform, "tiktok");
    assert.equal(ref.storeId, "778899");
  });

  it("keeps only the shop slug from a Tokopedia product link", () => {
    const ref = parseStoreUrl("https://www.tokopedia.com/erigo/kaos-polos-hitam");
    assert.equal(ref.platform, "tokopedia");
    assert.equal(ref.handle, "erigo");
  });

  it("splits a Blibli merchant slug and code", () => {
    const ref = parseStoreUrl("https://www.blibli.com/merchant/erigo-official/ERI-60002");
    assert.equal(ref.platform, "blibli");
    assert.equal(ref.handle, "erigo-official");
    assert.equal(ref.storeId, "ERI-60002");
  });

  it("reads a Lazada shop slug and a product link's sellerId", () => {
    assert.equal(parseStoreUrl("https://www.lazada.co.id/shop/erigo-official").handle, "erigo-official");
    const fromProduct = parseStoreUrl("https://www.lazada.co.id/products/kaos-i123.html?sellerId=99887");
    assert.equal(fromProduct.platform, "lazada");
    assert.equal(fromProduct.storeId, "99887");
  });

  it("reads a Bukalapak username from the /u/ path", () => {
    const ref = parseStoreUrl("https://www.bukalapak.com/u/erigo-official");
    assert.equal(ref.platform, "bukalapak");
    assert.equal(ref.handle, "erigo-official");
  });

  it("rejects a Bukalapak product link that names no seller", () => {
    assert.throws(() => parseStoreUrl("https://www.bukalapak.com/p/fashion/kaos"), /no seller/);
  });

  it("refuses a share link rather than guessing a seller from the short code", () => {
    // This is the id.shp.ee case that used to report "not a supported
    // marketplace" — it is Shopee, it just has to be opened first.
    assert.throws(() => parseStoreUrl("id.shp.ee/DRrKeeuk"), /has to be opened/);
    assert.throws(() => parseStoreUrl("https://vt.tiktok.com/ZS2abcdef/"), /has to be opened/);
  });

  it("rejects unsupported marketplaces", () => {
    // Lazada used to sit here; it is supported now, so this needs a marketplace
    // the app genuinely does not read.
    assert.throws(() => parseStoreUrl("https://www.amazon.com/shops/foo"), /not a supported marketplace/);
    assert.throws(() => parseStoreUrl("https://www.zalora.co.id/shop/foo"), /not a supported marketplace/);
  });

  it("rejects a Tokopedia search page that carries no shop", () => {
    assert.throws(() => parseStoreUrl("https://www.tokopedia.com/search?q=kaos"), /no shop slug/);
  });

  it("returns null instead of throwing in the tolerant variant", () => {
    assert.equal(tryParseStoreUrl("nonsense"), null);
  });
});
