#!/usr/bin/env node
/**
 * Rasterise the brand marks in src/lib/brand-svg.ts into public/brands/*.png.
 *
 * The site itself renders the SVG inline — it stays crisp at any size and in
 * any theme. These PNGs exist for the places raster is required: favicons,
 * OG images, slide decks, README embeds.
 *
 *   node scripts/render-brand-pngs.mjs [--size 256]
 *
 * Needs Playwright's Chromium. Set PLAYWRIGHT_CHROMIUM to override the binary.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const SIZE = Number(process.argv.includes("--size")
  ? process.argv[process.argv.indexOf("--size") + 1]
  : 256);

const OUT_DIR = path.join(process.cwd(), "public", "brands");

// Read the marks without importing the TS module's type-only deps.
const { BRAND_MARKS, brandSvgDocument } = await import("../src/lib/brand-svg.ts");

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const platforms = Object.keys(BRAND_MARKS);

  // Write the SVGs first — they need no browser and are the better asset.
  for (const platform of platforms) {
    const svg = brandSvgDocument(platform, SIZE);
    await writeFile(path.join(OUT_DIR, `${platform}.svg`), svg, "utf8");
  }
  console.log(`✓ ${platforms.length} SVGs → public/brands/`);

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.log("· playwright not installed — skipping PNG rasterisation");
    return;
  }

  const executablePath = process.env.PLAYWRIGHT_CHROMIUM || undefined;
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  const page = await browser.newPage({
    viewport: { width: SIZE, height: SIZE },
    deviceScaleFactor: 2,
  });

  for (const platform of platforms) {
    const svg = brandSvgDocument(platform, SIZE);
    // Transparent background so the PNG drops onto any surface.
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${svg}</body></html>`,
    );
    await page.screenshot({
      path: path.join(OUT_DIR, `${platform}.png`),
      omitBackground: true,
      clip: { x: 0, y: 0, width: SIZE, height: SIZE },
    });
    console.log(`✓ ${platform}.png  ${SIZE}×${SIZE} @2x`);
  }

  await browser.close();
}

await main();
