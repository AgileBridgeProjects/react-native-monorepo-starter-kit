import { View } from 'react-native';
import { cn } from '@/src/lib/cn';

export interface CardProps {
  children?: React.ReactNode;
  /**
   * Extra classes, merged with the default surface classes below. Doesn't
   * include a default `gap` — tailwind-merge doesn't dedupe this project's
   * token-based `gap-*` classes (they aren't in its standard scale), so a
   * baked-in default `gap-xs` could end up alongside a caller's `gap-md`
   * instead of being replaced by it. Callers set their own gap explicitly.
   */
  className?: string;
  testID?: string;
}

/** Rounded dark-surface card — shared container for grouped content
 * (settings sections, profile info/menu blocks, etc). */
export function Card({ children, className, testID }: CardProps) {
  return (
    <View className={cn('rounded-2xl bg-brand-blue-card-dark p-lg', className)} testID={testID}>
      {children}
    </View>
  );
}
