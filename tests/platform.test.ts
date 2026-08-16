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

  it("rejects unsupported marketplaces", () => {
    assert.throws(() => parseStoreUrl("https://www.lazada.co.id/shop/foo"), /not a supported marketplace/);
  });

  it("rejects a Tokopedia search page that carries no shop", () => {
    assert.throws(() => parseStoreUrl("https://www.tokopedia.com/search?q=kaos"), /no shop slug/);
  });

  it("returns null instead of throwing in the tolerant variant", () => {
    assert.equal(tryParseStoreUrl("nonsense"), null);
  });
});
