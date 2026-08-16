/**
 * Brand marks for the supported marketplaces.
 *
 * Shopee, TikTok and Blibli paths come from Simple Icons (CC0-1.0), vendored
 * here as inline SVG so the app never hotlinks a third-party CDN and the icons
 * survive the artifact CSP. Tokopedia is not carried by Simple Icons, so its
 * slot uses a generic shopping-bag glyph in the brand colour rather than a
 * facsimile of the real logo.
 *
 * Every icon is decorative: each is rendered beside the platform name, never
 * as the sole carrier of meaning.
 */

import type { Platform } from "@/lib/types";

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

export function ShopeeIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden focusable="false">
      <path d="M15.9414 17.9633c.229-1.879-.981-3.077-4.1758-4.0969-1.548-.528-2.277-1.22-2.26-2.1719.065-1.056 1.048-1.825 2.352-1.85a5.2898 5.2898 0 0 1 2.8838.89c.116.072.197.06.263-.039.09-.145.315-.494.39-.62.051-.081.061-.187-.068-.281-.185-.1369-.704-.4149-.983-.5319a6.4697 6.4697 0 0 0-2.5118-.514c-1.909.008-3.4129 1.215-3.5389 2.826-.082 1.1629.494 2.1078 1.73 2.8278.262.152 1.6799.716 2.2438.892 1.774.552 2.695 1.5419 2.478 2.6969-.197 1.047-1.299 1.7239-2.818 1.7439-1.2039-.046-2.2878-.537-3.1278-1.19l-.141-.11c-.104-.08-.218-.075-.287.03-.05.077-.376.547-.458.67-.077.108-.035.168.045.234.35.293.817.613 1.134.775a6.7097 6.7097 0 0 0 2.8289.727 4.9048 4.9048 0 0 0 2.0759-.354c1.095-.465 1.8029-1.394 1.9449-2.554zM11.9986 1.4009c-2.068 0-3.7539 1.95-3.8329 4.3899h7.6657c-.08-2.44-1.765-4.3899-3.8328-4.3899zm7.8516 22.5981-.08.001-15.7843-.002c-1.074-.04-1.863-.91-1.971-1.991l-.01-.195L1.298 6.2858a.459.459 0 0 1 .45-.494h4.9748C6.8448 2.568 9.1607 0 11.9996 0c2.8388 0 5.1537 2.5689 5.2757 5.7898h4.9678a.459.459 0 0 1 .458.483l-.773 15.5883-.007.131c-.094 1.094-.979 1.9769-2.0709 2.0059z" />
    </svg>
  );
}

export function TiktokIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden focusable="false">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

export function BlibliIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden focusable="false">
      <path d="M5.8018 5.9457c2.4792.2543 4.3228.3814 6.1663.3814l-.89-2.9243a1.0171 1.0171 0 0 0-1.2714-.6357l-3.6235.9536c-.5721.1271-.89.7629-.6357 1.2714l.1907.89zm12.5234 0V3.9114c.0636-.6357-.6357-1.0807-1.2714-.6993l-3.6871 2.4157c-.2543.1272-.445.3814-.5086.6357 1.5257 0 3.1785-.1271 5.467-.3178zm-4.3228-2.0343a1.9707 1.9707 0 1 0-.9536-3.8142 1.9707 1.9707 0 1 0 .9536 3.8142Zm5.1492 2.6067v.0633h-.1266c-3.0514.3178-5.0857.4445-6.9928.4445-2.0343 0-4.0057-.1267-7.1207-.4445h-.0633c-.6357 0-1.0171.3812-.9536 1.0169 1.0172 6.0392 1.0167 9.7901-.509 15.1936C3.1949 23.364 3.7034 24 4.339 24H19.724c.5721 0 1.081-.5726.8902-1.1448a30.1325 30.1325 0 0 1-.509-15.257c.1271-.572-.3179-1.0801-.9536-1.0801Zm-10.298 3.623c.445 0 .7624.3178.7624.6357v.0633c0 .3814-.3173.7003-.7623.7003a.6357.6357 0 0 1-.6357-.7003.6357.6357 0 0 1 .6357-.699zm6.2292 0c.3815 0 .7636.3176.7636.699 0 .3814-.3821.7003-.7636.7003a.6357.6357 0 0 1-.6357-.7636.6357.6357 0 0 1 .6357-.6357Zm-6.6116 2.6061c.3179 0 .5091.2548.5091.5091a2.9243 2.9243 0 0 0 2.9873 2.924c2.2886 0 3.052-1.9704 3.052-2.924 0-.2543.1901-.509.4444-.509s.509.2547.509.509c0 1.2714-.954 3.8142-4.0054 3.8142-2.9878 0-3.9409-2.5428-3.9409-3.8142 0-.2543.1903-.509.4445-.509z" />
    </svg>
  );
}

/**
 * Tokopedia stand-in: a plain shopping-bag glyph, not the Tokopedia owl.
 * Simple Icons does not carry Tokopedia, and an approximated logo would be a
 * worse outcome than an honestly generic one.
 */
export function TokopediaIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden focusable="false">
      <path
        d="M4.6 7.8h14.8l-1.15 12.05a1.6 1.6 0 0 1-1.6 1.45H7.35a1.6 1.6 0 0 1-1.6-1.45L4.6 7.8Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="M8.7 10.2V6.6a3.3 3.3 0 0 1 6.6 0v3.6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

const ICONS: Record<Platform, (props: IconProps) => React.JSX.Element> = {
  shopee: ShopeeIcon,
  tiktok: TiktokIcon,
  tokopedia: TokopediaIcon,
  blibli: BlibliIcon,
};

/** Renders the mark for a platform, tinted by the caller via `currentColor`. */
export function BrandIcon({
  platform,
  className,
  style,
}: {
  platform: Platform;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Icon = ICONS[platform];
  return <Icon className={className} style={style} />;
}
