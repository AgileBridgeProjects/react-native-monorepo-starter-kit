import type { ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '@/src/lib/cn';
import { useBreakpoints } from '@/src/lib/hooks/use-breakpoints';

interface PrimaryScreenLayoutProps {
  /** Content rendered in the primary-coloured hero area at the top. */
  hero: ReactNode;
  /** Content rendered in the rounded white card below the hero. */
  children: ReactNode;
  testID?: string;
  className?: string;
}

/**
 * Standard "hero + card" screen layout shared across Games, Learn,
 * Scoreboard, and Rewards screens.
 *
 * Renders a primary-coloured hero section that seamlessly blends with the
 * navigation bar, and a white rounded card that slides up beneath it.
 */
export function PrimaryScreenLayout({
  hero,
  children,
  testID,
  className,
}: PrimaryScreenLayoutProps) {
  const insets = useSafeAreaInsets();
  const { isTablet } = useBreakpoints();
  const isWebMobile = Platform.OS === 'web' && !isTablet;

  if (isWebMobile) {
    return (
      <View className={cn('flex-1 bg-background', className)} testID={testID}>
        {hero}
        {children}
      </View>
    );
  }

  return (
    <View className={cn('flex-1 bg-primary', className)} testID={testID}>
      <View style={{ paddingTop: insets.top }}>{hero}</View>
      <View className="flex-1 overflow-hidden rounded-t-3xl bg-background">{children}</View>
    </View>
  );
}
