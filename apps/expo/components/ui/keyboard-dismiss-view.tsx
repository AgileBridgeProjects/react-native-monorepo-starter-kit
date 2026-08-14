import { Keyboard, KeyboardAvoidingView, Platform, TouchableWithoutFeedback } from 'react-native';

interface KeyboardDismissViewProps {
  children: React.ReactNode;
}

/**
 * Wraps children in a keyboard-aware layout:
 * - On iOS: `KeyboardAvoidingView` with `padding` behaviour
 * - On Android: `KeyboardAvoidingView` with `height` behaviour
 * - On web: renders children directly (no keyboard avoidance needed)
 * - Tapping outside any input dismisses the keyboard on native
 */
export function KeyboardDismissView({ children }: KeyboardDismissViewProps) {
  if (Platform.OS === 'web') return <>{children}</>;

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        {children}
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

export type { KeyboardDismissViewProps };
