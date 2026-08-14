import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Whether the on-screen keyboard is up.
 *
 * Uses the `will*` events on iOS so consumers change alongside the keyboard's own
 * animation rather than after it, and the `did*` events on Android where `will*`
 * never fires. (The auth hero collapse needs an animated progress value and drives
 * Reanimated from these same events directly — this hook is for the common boolean
 * case, like the composer swapping its safe-area padding.)
 */
export function useKeyboardVisible(): boolean {
  const [isVisible, setVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setVisible(true));
    const hide = Keyboard.addListener(hideEvent, () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return isVisible;
}
