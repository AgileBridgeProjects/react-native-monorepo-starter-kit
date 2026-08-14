import { iconSize } from '@starterkit/shared';
import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Icon } from './icon';
import { Typography } from './typography';

export interface ModalSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Sheet heading, rendered beside the close control. */
  title: string;
  /** Optional second line under the title — context for what is being resolved. */
  subtitle?: string;
  /** Accessible name for the close control and the tap-outside-to-dismiss backdrop. */
  closeLabel: string;
  /** Sheet body. Anything: a form, a picker, arbitrary content — for a short single-select
   * option list, prefer `OptionSheet` instead. */
  children: ReactNode;
  /** Pinned below the body, separated by a hairline (e.g. a primary CTA). */
  footer?: ReactNode;
  testID?: string;
}

/**
 * A plain RN `Modal`-backed sheet for arbitrary body/footer content — the shell every bottom
 * sheet in this app renders through, so there is exactly one header/backdrop/panel
 * implementation to keep working rather than several that can drift from each other.
 * `OptionSheet` (the narrower "choose one of a short named list" shape) builds on this rather
 * than duplicating it.
 *
 * Deliberately not the `@expo/ui`-backed `BottomSheet` routed through `BottomSheetContent`: that
 * primitive's native `Host` embedding rendered wrong on-device (the identity split review — it shifted the
 * screen's anchored footer when opening the due-date sheet), the same failure mode `OptionSheet`
 * had already hit and moved off of for its own reasons. `Modal` always portals to its own native
 * window regardless of where it sits in the JS tree, so it can't be squeezed by anything around
 * it, and it can't shift anything around it either.
 *
 * No scrim over the rest of the screen — deliberately: the backdrop is a transparent
 * tap-to-dismiss target rather than a dimming one.
 */
export function ModalSheet({
  visible,
  onClose,
  title,
  subtitle,
  closeLabel,
  children,
  footer,
  testID,
}: ModalSheetProps) {
  const colorScheme = (useColorScheme() ?? 'light') as keyof typeof colors;
  const insets = useSafeAreaInsets();

  // RN's Modal mounts its children regardless of `visible` (that prop only controls native
  // presentation) — guard explicitly so a closed sheet doesn't keep its content mounted.
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" testID={testID}>
        <Pressable
          accessibilityLabel={closeLabel}
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        <View
          className="rounded-t-2xl bg-brand-blue-card-dark"
          style={{ paddingBottom: insets.bottom }}
        >
          <View className="flex-row items-start justify-between gap-md px-lg pb-md pt-md">
            <View className="flex-1 gap-xs">
              <Typography variant="h3" className="text-white">
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="body-sm" className="text-white/60">
                  {subtitle}
                </Typography>
              )}
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={closeLabel}
              className="touch-target -mr-xs -mt-xs items-center justify-center"
            >
              <Icon name="xmark" size={iconSize.sm} color={colors[colorScheme].textMuted} />
            </Pressable>
          </View>

          {children}

          {footer && <View className="border-t border-white/10 px-lg pt-md">{footer}</View>}
        </View>
      </View>
    </Modal>
  );
}
