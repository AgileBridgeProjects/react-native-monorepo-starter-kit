import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { iconSize } from '@/constants/tokens';
import { cn } from '@/src/lib/cn';
import { Icon, type IconProps } from './icon';
import { Skeleton } from './skeleton';
import { Typography } from './typography';

export interface DonutStatProps {
  /** Achieved count (the filled arc + hero number), e.g. games won, rewards unlocked. */
  value: number | string;
  /** Denominator the value is a fraction of, e.g. games played, total rewards. */
  total?: number;
  /** Stat name shown beneath the ring. */
  label: string;
  /** Accent colour for the filled arc and hero number. */
  color: string;
  /** Card background colour — applied at 14% opacity. Defaults to transparent (use bg-surface via className). */
  cardColor?: string;
  /** Optional context line beneath the label (e.g. "of 24"). */
  subLabel?: string;
  /** Overrides the hero text shown inside the ring (defaults to `value`). */
  centerText?: string;
  /** Ring diameter in dp. */
  size?: number;
  /** Ring stroke width in dp. */
  strokeWidth?: number;
  /** When true, hides the ring and renders a plain text KPI — same card shell, no SVG. */
  hideRing?: boolean;
  /** Optional SF Symbol icon shown above the hero value (only used when hideRing=true). */
  icon?: IconProps['name'];
  isLoading?: boolean;
  className?: string;
  testID?: string;
}

export function DonutStat({
  value,
  total,
  label,
  color,
  cardColor,
  subLabel,
  centerText,
  size = 68,
  strokeWidth = 7,
  hideRing = false,
  icon,
  isLoading,
  className,
  testID,
}: DonutStatProps) {
  const numericValue = typeof value === 'number' ? value : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = (total ?? 0) > 0 ? Math.min(1, Math.max(0, numericValue / (total ?? 1))) : 0;
  const strokeDashoffset = circumference * (1 - fraction);
  const trackColor = `${color}24`;
  const heroText = centerText ?? String(value);
  const cardBg = cardColor ? `${cardColor}18` : undefined;

  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={hideRing ? `${label}: ${heroText}` : `${label}: ${value}/${total}`}
      accessibilityRole="none"
      style={cardBg ? { backgroundColor: cardBg } : undefined}
      className={cn(
        'flex-1 items-center gap-xs rounded-2xl px-md py-md',
        !cardBg && 'bg-surface',
        className,
      )}
    >
      <View style={{ width: size, height: size }} className="items-center justify-center">
        {hideRing ? (
          <View className="items-center justify-center gap-xxs">
            {icon && <Icon name={icon} size={iconSize.md} color={color} />}
            {isLoading ? (
              <Skeleton className="h-6 w-10" />
            ) : (
              <Typography variant="body" className="text-xl font-extrabold" style={{ color }}>
                {heroText}
              </Typography>
            )}
          </View>
        ) : (
          <>
            <Svg width={size} height={size} style={{ position: 'absolute' }}>
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={trackColor}
                strokeWidth={strokeWidth}
                fill="none"
              />
              {!isLoading && fraction > 0 && (
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={color}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  rotation={-90}
                  origin={`${size / 2}, ${size / 2}`}
                />
              )}
            </Svg>
            <View className="items-center justify-center">
              {isLoading ? (
                <Skeleton className="h-6 w-8" />
              ) : (
                <Typography variant="body" className="text-xl font-extrabold" style={{ color }}>
                  {heroText}
                </Typography>
              )}
            </View>
          </>
        )}
      </View>

      <Typography variant="caption" className="text-text-secondary">
        {label}
      </Typography>
      {subLabel ? (
        <Typography variant="caption" className="text-[11px] text-text-muted">
          {subLabel}
        </Typography>
      ) : null}
    </View>
  );
}
