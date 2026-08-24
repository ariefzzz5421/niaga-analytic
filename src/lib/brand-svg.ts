import type { Platform } from "./types";

/**
 * Marketplace icon marks, as raw SVG.
 *
 * Kept as strings rather than JSX so the same markup feeds both the React
 * components and `scripts/render-brand-pngs.mjs`, which rasterises these into
 * `public/brands/*.png`. Everything is authored in-repo — no CDN, no runtime
 * fetch, and the marks survive a strict CSP.
 *
 * Provenance:
 *   shopee, blibli, bukalapak — Simple Icons (CC0-1.0), in the brand hue.
 *   tiktok                    — Simple Icons note with the brand chromatic
 *                               offset behind it.
 *   tokopedia, lazada         — hand-drawn. Simple Icons carries neither, and
 *                               the official assets were not reachable, so
 *                               these are recognisable approximations rather
 *                               than the exact logos.
 */

export interface BrandMark {
  viewBox: string;
  /** Inner SVG markup, fully coloured. */
  inner: string;
  /** Flat colour for contexts needing a single hue (dots, legends). */
  brand: string;
}

const SHOPEE = "M15.9414 17.9633c.229-1.879-.981-3.077-4.1758-4.0969-1.548-.528-2.277-1.22-2.26-2.1719.065-1.056 1.048-1.825 2.352-1.85a5.2898 5.2898 0 0 1 2.8838.89c.116.072.197.06.263-.039.09-.145.315-.494.39-.62.051-.081.061-.187-.068-.281-.185-.1369-.704-.4149-.983-.5319a6.4697 6.4697 0 0 0-2.5118-.514c-1.909.008-3.4129 1.215-3.5389 2.826-.082 1.1629.494 2.1078 1.73 2.8278.262.152 1.6799.716 2.2438.892 1.774.552 2.695 1.5419 2.478 2.6969-.197 1.047-1.299 1.7239-2.818 1.7439-1.2039-.046-2.2878-.537-3.1278-1.19l-.141-.11c-.104-.08-.218-.075-.287.03-.05.077-.376.547-.458.67-.077.108-.035.168.045.234.35.293.817.613 1.134.775a6.7097 6.7097 0 0 0 2.8289.727 4.9048 4.9048 0 0 0 2.0759-.354c1.095-.465 1.8029-1.394 1.9449-2.554zM11.9986 1.4009c-2.068 0-3.7539 1.95-3.8329 4.3899h7.6657c-.08-2.44-1.765-4.3899-3.8328-4.3899zm7.8516 22.5981-.08.001-15.7843-.002c-1.074-.04-1.863-.91-1.971-1.991l-.01-.195L1.298 6.2858a.459.459 0 0 1 .45-.494h4.9748C6.8448 2.568 9.1607 0 11.9996 0c2.8388 0 5.1537 2.5689 5.2757 5.7898h4.9678a.459.459 0 0 1 .458.483l-.773 15.5883-.007.131c-.094 1.094-.979 1.9769-2.0709 2.0059z";
const TIKTOK_NOTE = "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z";
const BLIBLI = "M5.8018 5.9457c2.4792.2543 4.3228.3814 6.1663.3814l-.89-2.9243a1.0171 1.0171 0 0 0-1.2714-.6357l-3.6235.9536c-.5721.1271-.89.7629-.6357 1.2714l.1907.89zm12.5234 0V3.9114c.0636-.6357-.6357-1.0807-1.2714-.6993l-3.6871 2.4157c-.2543.1272-.445.3814-.5086.6357 1.5257 0 3.1785-.1271 5.467-.3178zm-4.3228-2.0343a1.9707 1.9707 0 1 0-.9536-3.8142 1.9707 1.9707 0 1 0 .9536 3.8142Zm5.1492 2.6067v.0633h-.1266c-3.0514.3178-5.0857.4445-6.9928.4445-2.0343 0-4.0057-.1267-7.1207-.4445h-.0633c-.6357 0-1.0171.3812-.9536 1.0169 1.0172 6.0392 1.0167 9.7901-.509 15.1936C3.1949 23.364 3.7034 24 4.339 24H19.724c.5721 0 1.081-.5726.8902-1.1448a30.1325 30.1325 0 0 1-.509-15.257c.1271-.572-.3179-1.0801-.9536-1.0801Zm-10.298 3.623c.445 0 .7624.3178.7624.6357v.0633c0 .3814-.3173.7003-.7623.7003a.6357.6357 0 0 1-.6357-.7003.6357.6357 0 0 1 .6357-.699zm6.2292 0c.3815 0 .7636.3176.7636.699 0 .3814-.3821.7003-.7636.7003a.6357.6357 0 0 1-.6357-.7636.6357.6357 0 0 1 .6357-.6357Zm-6.6116 2.6061c.3179 0 .5091.2548.5091.5091a2.9243 2.9243 0 0 0 2.9873 2.924c2.2886 0 3.052-1.9704 3.052-2.924 0-.2543.1901-.509.4444-.509s.509.2547.509.509c0 1.2714-.954 3.8142-4.0054 3.8142-2.9878 0-3.9409-2.5428-3.9409-3.8142 0-.2543.1903-.509.4445-.509z";
const BUKALAPAK = "M10.976 23.845a3.158 3.158 0 1 1-1.95-6.008 3.158 3.158 0 0 1 1.95 6.008Zm6.554-2.883c4.047-1.315 7.315-5.981 5.689-10.984-1.626-5.003-7.012-6.856-11.058-5.541a1.89 1.89 0 0 0-1.252 2.249l.414 1.682a1.892 1.892 0 0 0 2.42 1.348l.162-.053c1.861-.606 3.592.504 4.071 2.019.505 1.507-.244 3.422-2.106 4.027l-.162.054a1.891 1.891 0 0 0-1.166 2.512l.653 1.604a1.89 1.89 0 0 0 2.335 1.083Zm-6.962-7.982L7.841 1.752A2.3 2.3 0 0 0 4.897.113l-2.952.959A2.3 2.3 0 0 0 .526 4.128L4.92 14.815a2.3 2.3 0 0 0 2.841 1.318l1.285-.417a2.298 2.298 0 0 0 1.522-2.736Z";

export const BRAND_MARKS: Record<Platform, BrandMark> = {
  shopee: {
    viewBox: "0 0 24 24",
    brand: "#ee4d2d",
    inner: `<path d="${SHOPEE}" fill="#ee4d2d"/>`,
  },

  // The note, with the cyan/magenta offset the brand always carries. The
  // offsets sit behind the black glyph, exactly as in the official mark.
  tiktok: {
    viewBox: "0 0 24 24",
    brand: "#fe2c55",
    inner: `
      <g transform="translate(-1.15 -0.55)"><path d="${TIKTOK_NOTE}" fill="#25f4ee"/></g>
      <g transform="translate(1.15 0.55)"><path d="${TIKTOK_NOTE}" fill="#fe2c55"/></g>
      <path d="${TIKTOK_NOTE}" fill="#010101"/>
    `,
  },

  blibli: {
    viewBox: "0 0 24 24",
    brand: "#0095da",
    inner: `<path d="${BLIBLI}" fill="#0d75f5"/>`,
  },

  bukalapak: {
    viewBox: "0 0 24 24",
    brand: "#e31e52",
    inner: `<path d="${BUKALAPAK}" fill="#e31e52"/>`,
  },

  // Tokopedia: green bag silhouette with the owl face set directly on it —
  // white eyes with dark pupils, ear tufts, a small beak. Approximate.
  tokopedia: {
    viewBox: "0 0 48 48",
    brand: "#03ac0e",
    inner: `
      <path d="M9.6 14.2A3.4 3.4 0 0 1 13 10.8h22a3.4 3.4 0 0 1 3.4 3.4v18.2A11.6 11.6 0 0 1 26.8 44h-5.6A11.6 11.6 0 0 1 9.6 32.4Z" fill="#03ac0e"/>
      <path d="M14.9 13.6 12.4 4l7.9 4.3Z" fill="#03ac0e"/>
      <path d="M33.1 13.6 35.6 4l-7.9 4.3Z" fill="#03ac0e"/>
      <circle cx="18.5" cy="24.4" r="6.4" fill="#ffffff"/>
      <circle cx="29.5" cy="24.4" r="6.4" fill="#ffffff"/>
      <circle cx="19.7" cy="24.9" r="3.2" fill="#0a5c11"/>
      <circle cx="28.3" cy="24.9" r="3.2" fill="#0a5c11"/>
      <circle cx="20.8" cy="23.6" r="1.1" fill="#ffffff"/>
      <circle cx="29.4" cy="23.6" r="1.1" fill="#ffffff"/>
      <path d="M24 31.4c1.5 0 2.6 1.1 2.6 2.4S25.5 36.6 24 36.6s-2.6-1.5-2.6-2.8 1.1-2.4 2.6-2.4Z" fill="#f5a623"/>
    `,
  },

  // Lazada: the folded-bag mark with its notched top, in the brand hues.
  // Approximate — Simple Icons carries no Lazada mark.
  lazada: {
    viewBox: "0 0 48 48",
    brand: "#f57224",
    inner: `
      <path d="M24 12.6 9.4 4.6v9.1L24 21.7l14.6-8V4.6Z" fill="#0f146d"/>
      <path d="M9.4 13.7v14.6c0 5.4 3 8.6 14.6 15.2V21.7Z" fill="#f57224"/>
      <path d="M38.6 13.7v14.6c0 5.4-3 8.6-14.6 15.2V21.7Z" fill="#fe4066"/>
      <path d="M9.4 4.6 24 12.6l-4.6 4.7L9.4 11.9Z" fill="#ffb300"/>
      <path d="M38.6 4.6 24 12.6l4.6 4.7 10-5.4Z" fill="#e6224a"/>
    `,
  },
};

/** A complete standalone SVG document — used by the PNG renderer. */
export function brandSvgDocument(platform: Platform, size = 256): string {
  const mark = BRAND_MARKS[platform];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${mark.viewBox}" width="${size}" height="${size}">${mark.inner}</svg>`;
}
