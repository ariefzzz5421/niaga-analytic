/**
 * Marketplace brand marks.
 *
 * The markup lives in `@/lib/brand-svg` so the React components here and the
 * PNG rasteriser in `scripts/render-brand-pngs.mjs` render from one source.
 * Every icon is decorative: it always sits beside the platform name and never
 * carries meaning on its own.
 */

import { BRAND_MARKS } from "@/lib/brand-svg";
import type { Platform } from "@/lib/types";

export function BrandIcon({
  platform,
  className,
  style,
}: {
  platform: Platform;
  className?: string;
  style?: React.CSSProperties;
}) {
  const mark = BRAND_MARKS[platform];
  return (
    <svg
      viewBox={mark.viewBox}
      className={className}
      style={style}
      aria-hidden
      focusable="false"
      // Static markup authored in this repo — never user input.
      dangerouslySetInnerHTML={{ __html: mark.inner }}
    />
  );
}
