/**
 * CountryFlag — web implementation.
 *
 * Most desktop browsers (notably Chrome/Edge on Windows) have no flag-emoji
 * font, so regional-indicator emoji render as blank boxes or letters. Use the
 * SVG flags from country-flag-icons instead, falling back to the emoji glyph
 * for any code the package doesn't cover.
 */
import { countryCodeToEmoji } from '@starterkit/shared';
import * as Flags from 'country-flag-icons/react/3x2';

export interface CountryFlagProps {
  /** ISO 3166-1 alpha-2 country code, e.g. "ZA". */
  code: string;
  /** Rendered height in px. Width follows the 3:2 aspect ratio. */
  size?: number;
}

type FlagMap = Record<
  string,
  ((props: { style?: React.CSSProperties; title?: string }) => React.JSX.Element) | undefined
>;

export function CountryFlag({ code, size = 24 }: CountryFlagProps) {
  const Flag = (Flags as FlagMap)[code.toUpperCase()];

  if (!Flag) {
    return <span style={{ fontSize: size, lineHeight: 1 }}>{countryCodeToEmoji(code)}</span>;
  }

  return (
    <Flag
      title={code}
      style={{ width: size * 1.5, height: size, borderRadius: 2, display: 'block' }}
    />
  );
}
