import { useRef } from 'react';
import type { TextInput as RNTextInput } from 'react-native';
import { Keyboard, Text, TextInput, View } from 'react-native';

import { cn } from '@/src/lib/cn';

// ─── Props ───────────────────────────────────────────────────────────────────

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Called when all digits are filled. */
  onComplete?: (value: string) => void;
  /** Number of digit boxes. Defaults to 6. */
  length?: number;
  /** Highlights boxes with error styling. */
  error?: boolean;
  /** Error message displayed below the boxes (like FormField). */
  errorMessage?: string;
  testID?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Strip non-digit characters from pasted or typed text. */
function cleanDigits(text: string): string {
  return text.replace(/\D/g, '');
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * OTP input with individual digit boxes.
 *
 * - Auto-advances focus to the next box as digits are typed.
 * - Supports paste: pasting a full code into any box distributes the digits.
 * - Backspace on an empty box moves focus back and clears the previous digit.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  error = false,
  errorMessage,
  testID,
}: OtpInputProps) {
  const refs = useRef<Array<RNTextInput | null>>(Array.from({ length }, () => null));

  // Stable keys for each slot — never reordered, so position-based IDs are safe.
  const slotKeys = useRef(Array.from({ length }, (_, i) => `otp-slot-${i}`)).current;

  // Normalise to an array of exactly `length` chars (empty string = unfilled).
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  const handleChangeText = (index: number, text: string) => {
    const cleaned = cleanDigits(text);

    if (cleaned.length > 1) {
      // Paste scenario — fill boxes starting from this index.
      const next = [...digits];
      const chars = cleaned.slice(0, length - index).split('');
      chars.forEach((char, j) => {
        next[index + j] = char;
      });
      const pastedValue = next.join('');
      onChange(pastedValue);
      if (pastedValue.length === length) {
        Keyboard.dismiss();
        onComplete?.(pastedValue);
      } else {
        const nextFocus = Math.min(index + chars.length, length - 1);
        refs.current[nextFocus]?.focus();
      }
      return;
    }

    // Single character typed.
    const next = [...digits];
    next[index] = cleaned;
    const newValue = next.join('');
    onChange(newValue);

    if (cleaned && index < length - 1) {
      refs.current[index + 1]?.focus();
    } else if (cleaned && index === length - 1) {
      // Last digit filled — dismiss keyboard and auto-submit.
      Keyboard.dismiss();
      if (newValue.length === length) {
        onComplete?.(newValue);
      }
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      // Box is empty — clear the previous digit and move focus back.
      const next = [...digits];
      next[index - 1] = '';
      onChange(next.join(''));
      refs.current[index - 1]?.focus();
    }
  };

  return (
    <View testID={testID}>
      <View className="flex-row gap-sm justify-center">
        {digits.map((digit, i) => (
          <TextInput
            key={slotKeys[i]}
            ref={(r) => {
              refs.current[i] = r;
            }}
            value={digit}
            onChangeText={(text) => handleChangeText(i, text)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
            keyboardType="number-pad"
            selectTextOnFocus
            textAlign="center"
            accessibilityLabel={`Digit ${i + 1} of ${length}`}
            // No maxLength so that paste into the first box delivers all chars.
            className={cn(
              'h-14 w-10 rounded-md border bg-surface text-text text-xl font-semibold text-center web:leading-14',
              error || errorMessage ? 'border-error' : digit ? 'border-primary' : 'border-border',
            )}
          />
        ))}
      </View>
      {errorMessage && (
        <Text className="text-error text-xs mt-xs text-center" accessibilityRole="alert">
          {errorMessage}
        </Text>
      )}
    </View>
  );
}

export type { OtpInputProps };
