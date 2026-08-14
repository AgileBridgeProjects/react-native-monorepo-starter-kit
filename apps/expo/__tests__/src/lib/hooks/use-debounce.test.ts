import { useDebounce } from '@lib/hooks/use-debounce';
import { act } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@/test/utils/render-hook';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the initial value synchronously on first render', () => {
    const { result } = renderHook(() => useDebounce('hello'));
    expect(result.current).toBe('hello');
  });

  it('does not update before the delay elapses', () => {
    let value = 'a';
    const { result, rerender } = renderHook(() => useDebounce(value, 400));

    value = 'ab';
    rerender();

    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(result.current).toBe('a');
  });

  it('updates to the latest value exactly after the delay elapses', () => {
    let value = 'a';
    const { result, rerender } = renderHook(() => useDebounce(value, 400));

    value = 'ab';
    rerender();

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current).toBe('ab');
  });

  it('uses the default 400ms delay when none is provided', () => {
    let value = 1;
    const { result, rerender } = renderHook(() => useDebounce(value));

    value = 2;
    rerender();

    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(result.current).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(2);
  });

  it('only emits the final value when the input changes rapidly (resets the timer)', () => {
    let value = 'a';
    const { result, rerender } = renderHook(() => useDebounce(value, 300));

    value = 'ab';
    rerender();
    act(() => {
      vi.advanceTimersByTime(200);
    });

    value = 'abc';
    rerender();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    // 200ms after the last change — still under 300, so no emit yet.
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('abc');
  });

  it('respects a changed delay value', () => {
    let value = 'a';
    let delay = 1000;
    const { result, rerender } = renderHook(() => useDebounce(value, delay));

    value = 'b';
    delay = 100;
    rerender();

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('b');
  });

  it('works with non-string values (objects)', () => {
    const first = { q: '' };
    const second = { q: 'search' };
    let value = first;
    const { result, rerender } = renderHook(() => useDebounce(value, 200));

    expect(result.current).toBe(first);

    value = second;
    rerender();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe(second);
  });
});
