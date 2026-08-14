import type React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { shadows, spacing } from '@/constants/tokens';

export interface AnchoredMenuProps {
  visible: boolean;
  onClose: () => void;
  /**
   * Distance from the bottom of the window to the top of the control the menu floats above —
   * typically the height of the bar containing it. Callers that open the menu from a bar
   * above the keyboard should dismiss the keyboard first, so the bar is flush with the
   * bottom of the window and this is the only offset needed.
   */
  bottomOffset: number;
  children: React.ReactNode;
}

/**
 * A compact menu floating just above a bottom-anchored control, the way ChatGPT and WhatsApp
 * (Android) present attachment choices: a small card by the control that opened it, not a
 * full-width bottom sheet — which reads as empty with a handful of options and hides the
 * content behind it. Prefer {@link ActionSheet} when the choices are the screen's primary
 * action, or when there are enough of them to justify the full width.
 *
 * A plain RN Modal, deliberately not a native context-menu component: it anchors to an
 * arbitrary control (native menus can only anchor to their own trigger view) and behaves
 * identically on iOS, Android, and web. Also not `expo-glass-effect`'s GlassView — on-device
 * the glass material clipped to a hard-cornered square around the children and dropped the
 * labels. ChatGPT's own menu is a plain dark card too; the solid surface is the look.
 */
export function AnchoredMenu({ visible, onClose, bottomOffset, children }: AnchoredMenuProps) {
  if (!visible) return null;

  // Modal's own native fade rather than a Reanimated `entering` — Reanimated
  // entrances inside a Modal can settle at visibility:hidden and strand the menu
  // invisible, which is not a risk worth a 120ms fade.
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      {/* Full-screen dismiss target — tapping anywhere outside the menu closes it. */}
      <Pressable className="flex-1" accessibilityRole="none" onPress={onClose}>
        <View
          // Anchored position is a runtime value — inline style by necessity.
          style={{ position: 'absolute', left: spacing.sm, bottom: bottomOffset + spacing.xs }}
        >
          {/* Stops a backdrop press from firing through the card's own padding. */}
          <Pressable accessibilityRole="none">
            <View
              className="w-60 overflow-hidden rounded-3xl border border-white/10 bg-brand-blue-card-dark p-xs"
              style={shadows.lg}
            >
              {children}
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
