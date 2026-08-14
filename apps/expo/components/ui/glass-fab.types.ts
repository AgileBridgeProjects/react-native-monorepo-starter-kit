import { Platform } from 'react-native';
import type { SFSymbols7_0 } from 'sf-symbols-typescript';
import { spacing } from '@/constants/tokens';
import type { Icon } from './icon';

/**
 * Pixel size backing `GlassFab`'s frame — iOS uses `spacing['3xl']` (64) via `frame()`,
 * Android/web use the `h-18`/`w-18` classes (72). Read by callers that need to do layout
 * math against it (e.g. positioning a speed-dial menu above the FAB).
 */
export const GLASS_FAB_SIZE = Platform.OS === 'android' ? 72 : spacing['3xl'];

export interface GlassFabProps {
  /** RN icon name — used by the Android and web/fallback renderers. */
  icon: Parameters<typeof Icon>[0]['name'];
  /** SF Symbol name — used by the native iOS Liquid Glass renderer. */
  systemImage: SFSymbols7_0;
  label: string;
  onPress: () => void;
  testID?: string;
  /** Distance from the bottom of the screen — caller supplies via its own safe-area hook. */
  bottomOffset: number;
}
