import { Children, Fragment, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Card } from '@/components/ui/card';
import type { IconProps } from '@/components/ui/icon';
import { Icon } from '@/components/ui/icon';
import { Typography } from '@/components/ui/typography';
import { iconSize, palette } from '@/constants/tokens';
import { cn } from '@/src/lib/cn';

/**
 * An iOS-style grouped settings section: optional header above the card, rows inside it
 * separated by hairlines, optional explanatory footer below.
 *
 * Modelled on the native Settings app, where a row is ALWAYS a single line (label on the
 * left, control on the right) and any explanation lives in the section's footer — outside
 * and below the card. Our first pass instead stacked a description under each label inside
 * the card, which squashed the text into two or three cramped lines beside the icon and left
 * the icon floating against the middle of the block.
 *
 * Padding sits on the rows rather than the card so the separators can run to the card's right
 * edge, which is why `Card`'s own padding is overridden to zero here.
 */
export interface SettingsGroupProps {
  /** Small heading above the card. Omit for the first group on a screen, as iOS does. */
  header?: string;
  /** Explanatory text below the card — the iOS home for a description. */
  footer?: string;
  children: ReactNode;
  testID?: string;
  /** Outer spacing (e.g. horizontal margins on a screen that pads its own content). */
  className?: string;
}

export function SettingsGroup({ header, footer, children, testID, className }: SettingsGroupProps) {
  // Falsy entries are dropped so a conditionally-rendered row can't leave a stray separator.
  const rows = Children.toArray(children).filter(Boolean);

  return (
    <View className={cn('gap-sm', className)}>
      {header && (
        <Typography variant="label" className="px-md text-text-secondary">
          {header}
        </Typography>
      )}
      <Card className="overflow-hidden p-0" testID={testID}>
        {rows.map((row, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional, with no stable id
          <Fragment key={index}>
            {index > 0 && <View className="ml-md h-px bg-white/10" />}
            {row}
          </Fragment>
        ))}
      </Card>
      {footer && (
        <Typography variant="caption" className="px-md text-text-secondary">
          {footer}
        </Typography>
      )}
    </View>
  );
}

export interface SettingsRowProps {
  label: string;
  /** Leading glyph. Optional — iOS groups are frequently icon-less. */
  icon?: IconProps['name'];
  /** Trailing control: a Switch, a value, a button. Omit for a navigation row. */
  children?: ReactNode;
  /**
   * Makes the row a navigation row: the whole line becomes tappable and a trailing chevron
   * is drawn, exactly as iOS does. Mutually exclusive with a trailing control in practice.
   */
  onPress?: () => void;
  /** Dims the row and blocks its press. */
  disabled?: boolean;
  testID?: string;
  /** Overrides the label as the accessible name (e.g. when the label is truncated). */
  accessibilityLabel?: string;
}

/**
 * One line of a {@link SettingsGroup}: leading icon, label, then either a trailing control
 * or — when `onPress` is given — a chevron, with the whole row tappable.
 *
 * Deliberately single-line: a description belongs in the group's footer. The row height is
 * set generously (see the note on `layout`) so it reads like a native Settings row.
 */
export function SettingsRow({
  label,
  icon,
  children,
  onPress,
  disabled,
  testID,
  accessibilityLabel,
}: SettingsRowProps) {
  const content = (
    <>
      {icon && <Icon name={icon} size={iconSize.sm} color={palette.white.DEFAULT} />}
      <Typography variant="body" className="flex-1">
        {label}
      </Typography>
      {children}
      {onPress && <Icon name="chevron.right" size={iconSize.xs} color={palette.white[50]} />}
    </>
  );

  // min-h-14 (56px), not the bare 44pt WCAG floor: native iOS Settings rows sit at roughly
  // 44–56pt, and the tighter version read as cramped once the descriptions moved out to the
  // group footer. `py-md` keeps the label centred while letting a taller control set the pace.
  const layout = cn('min-h-14 flex-row items-center gap-md px-md py-md', disabled && 'opacity-40');

  if (!onPress) {
    return <View className={layout}>{content}</View>;
  }

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      testID={testID}
      className={cn(layout, 'active:bg-white/5')}
    >
      {content}
    </Pressable>
  );
}
