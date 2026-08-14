/**
 * Icon — unified icon component for the design system.
 *
 * Uses SF Symbols on iOS (via expo-symbols) and Material Icons on Android/Web.
 * All icon names use SF Symbol conventions; the mapping to Material Icons
 * lives in icon-symbol.tsx. Add new icons there when needed.
 *
 * Usage:
 *   <Icon name="house.fill" size={24} color={colors.light.icon} />
 *   <Icon name="paperplane.fill" className="text-primary" />
 */

import type { SymbolWeight } from 'expo-symbols';
import type { OpaqueColorValue, StyleProp, TextStyle } from 'react-native';
import { iconSize } from '@/constants/tokens';
import { IconSymbol } from './icon-symbol';

// Re-export the underlying symbol component for advanced use-cases
export { IconSymbol };

export interface IconProps {
  /** SF Symbol name. Add new mappings in icon-symbol.tsx. */
  name: Parameters<typeof IconSymbol>[0]['name'];
  /** Size in dp. Defaults to iconSize.md (28). Use iconSize tokens from constants/tokens.ts. */
  size?: number;
  /** Icon colour. Use a value from constants/tokens.ts colors. */
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  /** SF Symbol stroke weight (iOS only — ignored on Android/web). */
  weight?: SymbolWeight;
}

export function Icon({ name, size = iconSize.md, color, style, weight }: IconProps) {
  return <IconSymbol name={name} size={size} color={color} style={style} weight={weight} />;
}
