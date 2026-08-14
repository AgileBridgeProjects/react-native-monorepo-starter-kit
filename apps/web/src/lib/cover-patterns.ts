import {
  COVER_PATTERN_TILES,
  type CoverGradientId,
  type CoverPatternId,
  coverGradient,
  generateBrandGradientColors,
} from '@starterkit/shared';

// ─── Pattern CSS styles (derived from shared SVG tiles) ───────────────────────

function svgUri(svg: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Web-only CSS pattern definitions derived from the shared COVER_PATTERN_TILES. */
export const COVER_PATTERN_STYLES: Record<
  CoverPatternId,
  {
    backgroundImage: string;
    backgroundSize: string;
    backgroundRepeat: string;
    backgroundPosition: string;
  } | null
> = Object.fromEntries(
  Object.entries(COVER_PATTERN_TILES).map(([id, tile]) => [
    id,
    tile
      ? {
          backgroundImage: svgUri(tile.svgXml),
          backgroundSize: `${tile.tileWidth}px ${tile.tileHeight}px`,
          backgroundRepeat: 'repeat',
          backgroundPosition: 'center',
        }
      : null,
  ]),
) as Record<
  CoverPatternId,
  {
    backgroundImage: string;
    backgroundSize: string;
    backgroundRepeat: string;
    backgroundPosition: string;
  } | null
>;

// ─── Brand gradient generation ────────────────────────────────────────────────

/** Derive CSS gradient strings from a brand hex — delegates color math to shared. */
export function generateBrandGradients(brandHex: string): Record<CoverGradientId, string> {
  const pairs = generateBrandGradientColors(brandHex);
  return Object.fromEntries(
    (Object.entries(pairs) as [CoverGradientId, readonly [string, string]][]).map(
      ([id, [start, end]]) => [id, `linear-gradient(135deg, ${start} 0%, ${end} 100%)`],
    ),
  ) as Record<CoverGradientId, string>;
}

/** Resolve the CSS gradient string for a given gradient ID. Uses brand-derived variants when provided. */
export function resolveCoverGradientCss(id: CoverGradientId, brandHex?: string | null): string {
  if (brandHex) return generateBrandGradients(brandHex)[id];
  return coverGradient[id];
}
