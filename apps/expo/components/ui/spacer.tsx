import { View } from 'react-native';

export interface SpacerProps {
  /** NativeWind height class, e.g. `"h-sm"` (default) or `"h-md"`. */
  className?: string;
}

/** Vertical spacer used as a list item separator or layout gap. */
export function Spacer({ className = 'h-sm' }: SpacerProps) {
  return <View className={className} />;
}
