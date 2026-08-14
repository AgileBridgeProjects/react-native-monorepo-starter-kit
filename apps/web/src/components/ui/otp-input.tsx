'use client';

import { cn } from '@lib/cn';
import { useRef } from 'react';
import { FieldError } from './field-error';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Called when all digits are filled. */
  onComplete?: (value: string) => void;
  /** Number of digit boxes. Defaults to 6. */
  length?: number;
  /** Highlights boxes with error styling. */
  error?: boolean;
  /** Error message displayed below the boxes. */
  errorMessage?: string;
  'data-testid'?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cleanDigits(text: string): string {
  return text.replace(/\D/g, '');
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * OTP input with individual digit boxes — mirrors the Expo OtpInput.
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
  'data-testid': testId,
}: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>(Array.from({ length }, () => null));
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  const handleInput = (index: number, raw: string) => {
    const cleaned = cleanDigits(raw);

    if (cleaned.length > 1) {
      // Paste into this box — distribute across boxes from this index.
      const next = [...digits];
      const chars = cleaned.slice(0, length - index).split('');
      chars.forEach((char, j) => {
        next[index + j] = char;
      });
      const pasted = next.join('');
      onChange(pasted);
      if (pasted.length === length) {
        onComplete?.(pasted);
        refs.current[length - 1]?.blur();
      } else {
        const nextFocus = Math.min(index + chars.length, length - 1);
        refs.current[nextFocus]?.focus();
      }
      return;
    }

    // Single digit typed.
    const next = [...digits];
    next[index] = cleaned;
    const newValue = next.join('');
    onChange(newValue);

    if (cleaned && index < length - 1) {
      refs.current[index + 1]?.focus();
    } else if (cleaned && index === length - 1 && newValue.length === length) {
      onComplete?.(newValue);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      // Box is empty — clear the previous digit and move focus back.
      const next = [...digits];
      next[index - 1] = '';
      onChange(next.join(''));
      refs.current[index - 1]?.focus();
    }
  };

  const hasError = error || !!errorMessage;

  return (
    <div data-testid={testId}>
      <div className="flex justify-center gap-sm">
        {digits.map((digit, i) => (
          <input
            // biome-ignore lint/suspicious/noArrayIndexKey: stable slot positions
            key={i}
            ref={(r) => {
              refs.current[i] = r;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            value={digit}
            aria-label={`Digit ${i + 1} of ${length}`}
            maxLength={length} // Allow full paste into any box
            onFocus={(e) => e.target.select()}
            onChange={(e) => handleInput(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={cn(
              'h-14 w-10 rounded-md border bg-surface text-center text-xl font-semibold text-text focus:outline-none focus:ring-2 focus:ring-primary',
              hasError ? 'border-error' : digit ? 'border-primary' : 'border-border',
            )}
          />
        ))}
      </div>
      <FieldError message={errorMessage} className="mt-xs text-center" />
    </div>
  );
}
