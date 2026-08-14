import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';
import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/typography';
import { cn } from '@/src/lib/cn';

const pillVariants = cva('rounded-full border px-md py-xs', {
  variants: {
    state: {
      default: 'border-border bg-surface',
      selected: 'border-primary bg-primary',
    },
  },
  defaultVariants: {
    state: 'default',
  },
});

const pillTextVariants = cva('', {
  variants: {
    state: {
      default: 'text-text',
      selected: 'text-primary-foreground',
    },
  },
  defaultVariants: {
    state: 'default',
  },
});

type PillState = NonNullable<VariantProps<typeof pillVariants>['state']>;

export interface PuzzleSelectorItem {
  id: string;
  label: string;
}

export interface PuzzleSelectorProps {
  /** Flat list of all available puzzle options for this feature. */
  puzzleOptions: PuzzleSelectorItem[];
  /** ID of the currently active puzzle. */
  selectedPuzzleId: string;
  /** Called when the user taps a pill. */
  onSelectPuzzle: (id: string) => void;
  /** Heading text shown above the pill row (e.g. "Demo puzzles"). */
  heading: string;
  /** testID for the outer container View. */
  selectorTestId: string;
  /** Returns the testID for each pill by puzzle ID. */
  getPuzzleOptionTestId: (id: string) => string;
}

/**
 * Generic pill-row selector shared across all local puzzle features.
 *
 * Each feature passes its own heading string and testID helpers — the
 * rendering logic is identical for all six features.
 */
export function PuzzleSelector({
  puzzleOptions,
  selectedPuzzleId,
  onSelectPuzzle,
  heading,
  selectorTestId,
  getPuzzleOptionTestId,
}: PuzzleSelectorProps) {
  return (
    <View className="gap-sm" testID={selectorTestId}>
      <Typography variant="label">{heading}</Typography>
      <View className="flex-row flex-wrap gap-sm">
        {puzzleOptions.map((puzzleOption) => {
          const state: PillState = puzzleOption.id === selectedPuzzleId ? 'selected' : 'default';
          return (
            <Pressable
              key={puzzleOption.id}
              className={cn(pillVariants({ state }))}
              onPress={() => onSelectPuzzle(puzzleOption.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: state === 'selected' }}
              testID={getPuzzleOptionTestId(puzzleOption.id)}
            >
              <Typography variant="body-sm" className={pillTextVariants({ state })}>
                {puzzleOption.label}
              </Typography>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export { pillTextVariants, pillVariants };
