/**
 * Share-link resolution, exercised against a real local HTTP server.
 *
 * `resolveShortLink` only acts on hosts in the short-link allowlist, so the
 * tests register `127.0.0.1` chains by pointing the loop at a shortener host
 * that redirects into the local server — the same code path a real shp.ee hop
 * takes, minus the network.
 */

import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";

import { isShortLink } from "../src/lib/platform.ts";
import { hopChain, resolveShortLink } from "../src/lib/scrape/shortlink.ts";

let server: http.Server;
let origin = "";

before(async () => {
  server = http.createServer((req, res) => {
    switch (req.url) {
      case "/two-hops":
        res.writeHead(302, { location: `${origin}/second` });
        return res.end();
      case "/second":
        res.writeHead(301, { location: "https://shopee.co.id/erigo.official" });
        return res.end();
      case "/meta":
        res.writeHead(200, { "content-type": "text/html" });
        return res.end(
          '<html><head><meta http-equiv="refresh" content="0; url=https://www.tiktok.com/@erigo.official"></head></html>',
        );
      case "/js":
        res.writeHead(200, { "content-type": "text/html" });
        return res.end('<script>window.location.href="https://www.tokopedia.com/erigo"</script>');
      case "/dead":
        res.writeHead(200, { "content-type": "text/html" });
        return res.end("<html>nothing here</html>");
      case "/loop-a":
        res.writeHead(302, { location: `${origin}/loop-b` });
        return res.end();
      case "/loop-b":
        res.writeHead(302, { location: `${origin}/loop-a` });
        return res.end();
      default:
        res.writeHead(404);
        return res.end("nope");
    }
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => server.close());

describe("isShortLink", () => {
  it("recognises the share hosts each marketplace app produces", () => {
    assert.equal(isShortLink("id.shp.ee/DRrKeeuk"), true);
    assert.equal(isShortLink("https://shp.ee/abc123"), true);
    assert.equal(isShortLink("https://vt.tiktok.com/ZS2abcdef/"), true);
    assert.equal(isShortLink("https://vm.tiktok.com/ZS2abcdef/"), true);
    assert.equal(isShortLink("https://tokopedia.link/xyz"), true);
  });

  it("leaves full store URLs alone", () => {
    assert.equal(isShortLink("https://shopee.co.id/erigo.official"), false);
    assert.equal(isShortLink("https://www.tiktok.com/@erigo.official"), false);
    assert.equal(isShortLink("https://www.tokopedia.com/erigo"), false);
    assert.equal(isShortLink("not a url"), false);
  });

  it("treats a handle on a short host as already readable", () => {
    // vt.tiktok.com/@handle needs no expansion — the seller is right there.
    assert.equal(isShortLink("https://vt.tiktok.com/@erigo.official"), false);
  });
});

describe("resolveShortLink", () => {
  it("passes non-short URLs straight through without a request", async () => {
    const url = "https://shopee.co.id/erigo.official";
    assert.equal(await resolveShortLink(url), url);
  });

  it("follows a multi-hop redirect chain to the storefront", async () => {
    assert.equal(await hopChain(`${origin}/two-hops`), "https://shopee.co.id/erigo.official");
  });

  it("reads a meta-refresh destination", async () => {
    assert.equal(await hopChain(`${origin}/meta`), "https://www.tiktok.com/@erigo.official");
  });

  it("reads a JS location hop", async () => {
    assert.equal(await hopChain(`${origin}/js`), "https://www.tokopedia.com/erigo");
  });

  it("reports a link that redirects nowhere", async () => {
    await assert.rejects(() => hopChain(`${origin}/dead`), /did not redirect anywhere/);
  });

  it("terminates on a redirect loop instead of hanging", async () => {
    await assert.rejects(() => hopChain(`${origin}/loop-a`), /loop|bouncing/i);
  });
});
