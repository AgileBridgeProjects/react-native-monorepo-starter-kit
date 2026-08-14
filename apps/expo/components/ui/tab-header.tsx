import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { colors, iconSize } from '@/constants/tokens';

export interface TabHeaderProps {
  /**
   * Page name. No longer rendered — the designs put the page heading in the body,
   * not the header — but kept as the header region's accessibility label so screen
   * readers still announce which page's chrome this is.
   */
  title: string;
  colorScheme: keyof typeof colors;
  /** When `"surface"`, renders dark chrome on a light header. Default `"primary"`. */
  variant?: 'primary' | 'surface';
  /** When provided, renders the club logo on the left. */
  logoUrl?: string | null;
  /** Color-matrix filter to apply to the logo (e.g. whiten dark wordmarks on a dark bg). */
  logoMatrix?: string | null;
}

/**
 * Shared tab-page header — used by every main tab screen.
 *
 * Left is intentionally empty (or the club logo): the page heading lives in the
 * screen body per the designs. Right holds the profile/menu hamburger. Add
 * feature entry points (calendar, create, …) beside it as your app grows.
 */
export function TabHeader({ title, colorScheme, variant = 'primary', logoUrl }: TabHeaderProps) {
  const router = useRouter();

  const isSurface = variant === 'surface';
  const isDark = colorScheme === 'dark';
  // Surface tabs use primary-coloured chrome in light mode. In dark mode the
  // background is dark, so use white to maintain contrast.
  const tintColor =
    isSurface && !isDark ? colors[colorScheme].primary : colors[colorScheme].primaryForeground;

  return (
    <View className="w-full flex-row items-center justify-between py-xs" accessibilityLabel={title}>
      {/* Left: club logo only — the page heading is rendered by the screen body. */}
      <View className="flex-1 flex-row items-center gap-sm">
        {logoUrl && (
          <Image
            source={{ uri: logoUrl }}
            style={{ width: 120, height: 36 }}
            contentFit="contain"
            contentPosition="left center"
          />
        )}
      </View>

      {/* Right: profile hamburger */}
      <View className="flex-row items-center gap-xs">
        {/* Hamburger — navigates to the profile/menu page */}
        <Pressable
          onPress={() => router.push('/profile')}
          className="touch-target items-center justify-center"
          accessibilityLabel="Open menu"
          accessibilityRole="button"
        >
          <Icon name="line.3.horizontal" size={iconSize.md} color={tintColor} />
        </Pressable>
      </View>
    </View>
  );
}
