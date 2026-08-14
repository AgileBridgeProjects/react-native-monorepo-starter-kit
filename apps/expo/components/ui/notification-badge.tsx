import { Text, View } from 'react-native';
import { cn } from '@/src/lib/cn';

interface NotificationBadgeProps {
  count: number;
  /** Override the absolute positioning. Defaults to top-right hang-off for icon buttons. */
  className?: string;
}

export function NotificationBadge({ count, className }: NotificationBadgeProps) {
  if (count <= 0) return null;
  const badgeText = count > 9 ? '9+' : String(count);
  return (
    <View
      className={cn(
        'absolute min-w-4.5 h-4.5 items-center justify-center rounded-full bg-error px-1',
        className ?? '-right-1.5 -top-1',
      )}
    >
      <Text className="text-[10px] font-bold text-white leading-none text-center">{badgeText}</Text>
    </View>
  );
}
