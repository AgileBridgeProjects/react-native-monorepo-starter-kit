import { cva } from 'class-variance-authority';
import { Pressable, ScrollView } from 'react-native';

import { Typography } from '@/components/ui/typography';
import { cn } from '@/src/lib/cn';

// ─── Variants ────────────────────────────────────────────────────────────────

const pillVariants = cva('touch-target rounded-full px-3 py-1 items-center justify-center', {
  variants: {
    selected: {
      true: '',
      false: '',
    },
    variant: {
      default: '',
      hero: '',
    },
  },
  compoundVariants: [
    { selected: true, variant: 'default', className: 'bg-primary' },
    { selected: false, variant: 'default', className: 'bg-border/40' },
    { selected: true, variant: 'hero', className: 'bg-primary-foreground' },
    { selected: false, variant: 'hero', className: 'bg-primary-foreground/20' },
  ],
  defaultVariants: {
    selected: false,
    variant: 'default',
  },
});

const pillTextVariants = cva('font-medium capitalize', {
  variants: {
    selected: {
      true: '',
      false: '',
    },
    variant: {
      default: '',
      hero: '',
    },
  },
  compoundVariants: [
    { selected: true, variant: 'default', className: 'text-primary-foreground' },
    { selected: false, variant: 'default', className: 'text-text-secondary' },
    { selected: true, variant: 'hero', className: 'text-primary' },
    { selected: false, variant: 'hero', className: 'text-primary-foreground/70' },
  ],
  defaultVariants: {
    selected: false,
    variant: 'default',
  },
});

// ─── Props ───────────────────────────────────────────────────────────────────

export interface CategoryFilterItem {
  id: string;
  label: string;
}

export interface CategoryFilterProps {
  items: CategoryFilterItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** testID applied to the outer ScrollView. */
  testID?: string;
  /** Returns the testID for each pill by item id. */
  getItemTestId?: (id: string) => string;
  /** Use `hero` when rendered on a primary-coloured background. */
  variant?: 'default' | 'hero';
  /** Override the ScrollView contentContainerClassName. Defaults to `gap-xs pb-md`. */
  contentContainerClassName?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CategoryFilter({
  items,
  selectedId,
  onSelect,
  testID,
  getItemTestId,
  variant = 'default',
  contentContainerClassName,
}: CategoryFilterProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName={contentContainerClassName ?? 'gap-xs pb-md'}
      testID={testID}
    >
      {items.map((item) => {
        const isSelected = item.id === selectedId;

        return (
          <Pressable
            key={item.id}
            accessible
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(item.id)}
            testID={getItemTestId?.(item.id)}
            className={cn(pillVariants({ selected: isSelected, variant }))}
          >
            <Typography
              variant="caption"
              className={cn(pillTextVariants({ selected: isSelected, variant }))}
            >
              {item.label}
            </Typography>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
