import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { palette } from '@/constants/tokens';

export interface RingSegment {
  /** How full this segment is, 0–1. */
  progress: number;
  /** Filled-arc colour. */
  color: string;
  /** Optional accessible name for this segment. */
  label?: string;
}

export interface SegmentedRingProps {
  /**
   * One arc per entry, laid out clockwise from 12 o'clock and given an equal
   * share of the circle. Empty renders the track alone.
   */
  segments: RingSegment[];
  /** Outer diameter in dp. */
  size?: number;
  strokeWidth?: number;
  /** Unfilled arc colour. Defaults to the shared translucent input fill. */
  trackColor?: string;
  /**
   * Visual margin between neighbouring arcs, in degrees. Must clear the round
   * stroke caps, which each extend `strokeWidth / 2` PAST the arc's own end —
   * at the default size a 6° gap was entirely eaten by them and the arcs
   * appeared to touch.
   */
  gapDegrees?: number;
  /** Rendered in the middle of the ring — a hero number, an icon, anything. */
  children?: ReactNode;
  accessibilityLabel?: string;
  testID?: string;
}

const FULL_CIRCLE_DEGREES = 360;

/**
 * A ring split into equal arcs, each filling independently.
 *
 * Distinct from `DonutStat` (one arc, one value, with its own card chrome and
 * label): this draws N parallel arcs on one circle so a set of parts reads as
 * a single whole — four Skill categories' progress on one dial, for instance —
 * and it owns no layout or copy of its own, so callers compose the centre.
 */
export function SegmentedRing({
  segments,
  size = 148,
  strokeWidth = 10,
  trackColor = palette.blue.inputFill,
  gapDegrees = 16,
  children,
  accessibilityLabel,
  testID,
}: SegmentedRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const count = Math.max(1, segments.length);
  /** Each arc owns an equal slice, minus the gap that separates it from the next. */
  const sliceDegrees = FULL_CIRCLE_DEGREES / count;
  const arcDegrees = Math.max(0, sliceDegrees - gapDegrees);
  const arcLength = circumference * (arcDegrees / FULL_CIRCLE_DEGREES);

  return (
    <View
      style={{ width: size, height: size }}
      className="items-center justify-center"
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* Rotated so arc 0 starts at 12 o'clock; SVG angles otherwise start at 3. */}
        <G rotation={-90 + gapDegrees / 2} origin={`${size / 2}, ${size / 2}`}>
          {segments.map((segment, index) => {
            const rotation = index * sliceDegrees;
            const clamped = Math.min(1, Math.max(0, segment.progress));
            return (
              <G
                // Position on the dial is a segment's identity.
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed positional dial
                key={index}
                rotation={rotation}
                origin={`${size / 2}, ${size / 2}`}
              >
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={trackColor}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  // `strokeDasharray` draws one dash of `arcLength` then a gap
                  // long enough that the pattern never repeats around the circle.
                  strokeDasharray={`${arcLength} ${circumference}`}
                />
                {clamped > 0 && (
                  <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={segment.color}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${arcLength * clamped} ${circumference}`}
                  />
                )}
              </G>
            );
          })}
        </G>
      </Svg>
      {children}
    </View>
  );
}
