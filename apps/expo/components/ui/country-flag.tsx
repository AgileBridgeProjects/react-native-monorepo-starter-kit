/**
 * CountryFlag — native implementation.
 *
 * iOS and Android render regional-indicator emoji as flag glyphs, so a plain
 * Text node is all that's needed. The web platform file uses SVG flags instead,
 * because most desktop browsers have no flag-emoji font.
 */
import { countryCodeToEmoji } from '@starterkit/shared';
import { Text } from 'react-native';

export interface CountryFlagProps {
  /** ISO 3166-1 alpha-2 country code, e.g. "ZA". */
  code: string;
  /** Rendered height in px (emoji font size on native). */
  size?: number;
}

export function CountryFlag({ code, size = 24 }: CountryFlagProps) {
  return <Text style={{ fontSize: size, lineHeight: size * 1.1 }}>{countryCodeToEmoji(code)}</Text>;
}
