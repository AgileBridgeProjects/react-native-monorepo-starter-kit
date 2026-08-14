import { View } from 'react-native';
import { iconSize } from '@/constants/tokens';
import { cn } from '@/src/lib/cn';
import { Icon, type IconProps } from './icon';
import { Typography } from './typography';

export interface StatBlockProps {
  icon: IconProps['name'];
  value: string | number;
  label: string;
  color: string;
  /** Card background colour — applied at 18% opacity. Defaults to bg-surface. */
  cardColor?: string;
  className?: string;
  testID?: string;
}

export function StatBlock({
  icon,
  value,
  label,
  color,
  cardColor,
  className,
  testID,
}: StatBlockProps) {
  const cardBg = cardColor ? `${cardColor}18` : undefined;
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`${label}: ${value}`}
      accessibilityRole="none"
      style={cardBg ? { backgroundColor: cardBg } : undefined}
      className={cn(
        'flex-1 items-center gap-xs rounded-2xl px-md py-md',
        !cardBg && 'bg-surface',
        className,
      )}
    >
      <View
        className="mb-xs h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: `${color}18` }}
      >
        <Icon name={icon} size={iconSize.sm} color={color} />
      </View>
      <Typography variant="h3" className="font-bold">
        {String(value)}
      </Typography>
      <Typography variant="caption" className="text-text-secondary">
        {label}
      </Typography>
    </View>
  );
}
