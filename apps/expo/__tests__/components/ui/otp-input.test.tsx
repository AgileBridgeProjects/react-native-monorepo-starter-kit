import React from 'react';
import { TextInput } from 'react-native';
import { act, create } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-native')>();
  return {
    ...actual,
    Keyboard: { dismiss: vi.fn() },
  };
});

import { OtpInput } from '@/components/ui/otp-input';

describe('OtpInput', () => {
  function renderOtp(props: Partial<React.ComponentProps<typeof OtpInput>> = {}) {
    const defaultProps = { value: '', onChange: vi.fn(), ...props };
    let renderer: ReturnType<typeof create> | undefined;
    act(() => {
      renderer = create(React.createElement(OtpInput, defaultProps));
    });
    return renderer as ReturnType<typeof create>;
  }

  describe('rendering', () => {
    it('renders 6 text inputs by default', () => {
      const renderer = renderOtp();
      const inputs = renderer.root.findAllByType(TextInput);
      expect(inputs).toHaveLength(6);
    });

    it('renders custom number of boxes when length is provided', () => {
      const renderer = renderOtp({ length: 4 });
      const inputs = renderer.root.findAllByType(TextInput);
      expect(inputs).toHaveLength(4);
    });

    it('distributes value across digit boxes', () => {
      const renderer = renderOtp({ value: '123' });
      const inputs = renderer.root.findAllByType(TextInput);
      expect(inputs[0].props.value).toBe('1');
      expect(inputs[1].props.value).toBe('2');
      expect(inputs[2].props.value).toBe('3');
      expect(inputs[3].props.value).toBe('');
    });

    it('applies error border class when error is true', () => {
      const renderer = renderOtp({ error: true });
      const inputs = renderer.root.findAllByType(TextInput);
      expect(inputs[0].props.className).toContain('border-error');
    });

    it('applies primary border when digit is filled', () => {
      const renderer = renderOtp({ value: '1' });
      const inputs = renderer.root.findAllByType(TextInput);
      expect(inputs[0].props.className).toContain('border-primary');
    });

    it('applies default border when digit is empty and no error', () => {
      const renderer = renderOtp({ value: '' });
      const inputs = renderer.root.findAllByType(TextInput);
      expect(inputs[0].props.className).toContain('border-border');
    });

    it('sets accessibility labels for each digit', () => {
      const renderer = renderOtp({ length: 4 });
      const inputs = renderer.root.findAllByType(TextInput);
      expect(inputs[0].props.accessibilityLabel).toBe('Digit 1 of 4');
      expect(inputs[3].props.accessibilityLabel).toBe('Digit 4 of 4');
    });

    it('passes testID to the wrapper view', () => {
      const renderer = renderOtp({ testID: 'my-otp' });
      const view = renderer.root.findByProps({ testID: 'my-otp' });
      expect(view).toBeTruthy();
    });
  });

  describe('single digit input', () => {
    it('calls onChange with the digit placed at the correct index', () => {
      const onChange = vi.fn();
      const renderer = renderOtp({ value: '', onChange });
      const inputs = renderer.root.findAllByType(TextInput);

      act(() => {
        inputs[0].props.onChangeText('5');
      });

      expect(onChange).toHaveBeenCalledWith('5');
    });

    it('calls onChange with digit inserted at middle index', () => {
      const onChange = vi.fn();
      const renderer = renderOtp({ value: '12', onChange });
      const inputs = renderer.root.findAllByType(TextInput);

      act(() => {
        inputs[2].props.onChangeText('3');
      });

      expect(onChange).toHaveBeenCalledWith('123');
    });
  });

  describe('paste handling', () => {
    it('distributes pasted digits across boxes from the paste index', () => {
      const onChange = vi.fn();
      const renderer = renderOtp({ value: '', onChange });
      const inputs = renderer.root.findAllByType(TextInput);

      act(() => {
        inputs[0].props.onChangeText('123456');
      });

      expect(onChange).toHaveBeenCalledWith('123456');
    });

    it('strips non-digit characters from pasted text', () => {
      const onChange = vi.fn();
      const renderer = renderOtp({ value: '', onChange });
      const inputs = renderer.root.findAllByType(TextInput);

      act(() => {
        inputs[0].props.onChangeText('1-2-3');
      });

      expect(onChange).toHaveBeenCalledWith('123');
    });

    it('truncates paste that overflows beyond the last box', () => {
      const onChange = vi.fn();
      const renderer = renderOtp({ value: '', onChange, length: 4 });
      const inputs = renderer.root.findAllByType(TextInput);

      act(() => {
        inputs[2].props.onChangeText('9876');
      });

      // Only 2 characters fit (index 2 and 3)
      expect(onChange).toHaveBeenCalledWith('98');
    });
  });

  describe('backspace handling', () => {
    it('clears previous digit when backspace is pressed on an empty box', () => {
      const onChange = vi.fn();
      const renderer = renderOtp({ value: '12', onChange });
      const inputs = renderer.root.findAllByType(TextInput);

      act(() => {
        inputs[2].props.onKeyPress({ nativeEvent: { key: 'Backspace' } });
      });

      expect(onChange).toHaveBeenCalledWith('1');
    });

    it('does nothing on backspace at index 0', () => {
      const onChange = vi.fn();
      const renderer = renderOtp({ value: '', onChange });
      const inputs = renderer.root.findAllByType(TextInput);

      act(() => {
        inputs[0].props.onKeyPress({ nativeEvent: { key: 'Backspace' } });
      });

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('onComplete', () => {
    it('calls onComplete when the last digit is filled', () => {
      const onComplete = vi.fn();
      const onChange = vi.fn();
      const renderer = renderOtp({ value: '12345', onChange, onComplete });
      const inputs = renderer.root.findAllByType(TextInput);

      act(() => {
        inputs[5].props.onChangeText('6');
      });

      expect(onComplete).toHaveBeenCalledWith('123456');
    });

    it('does not call onComplete when a middle digit is filled', () => {
      const onComplete = vi.fn();
      const onChange = vi.fn();
      const renderer = renderOtp({ value: '12', onChange, onComplete });
      const inputs = renderer.root.findAllByType(TextInput);

      act(() => {
        inputs[2].props.onChangeText('3');
      });

      expect(onComplete).not.toHaveBeenCalled();
    });
  });
});
