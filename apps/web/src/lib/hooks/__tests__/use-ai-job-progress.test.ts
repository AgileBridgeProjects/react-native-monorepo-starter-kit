import { useAiJobProgress } from '@lib/hooks/use-ai-job-progress';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('useAiJobProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('starts at 0% progress', () => {
      const { result } = renderHook(() => useAiJobProgress());
      expect(result.current.progressPercent).toBe(0);
    });
  });

  describe('start()', () => {
    it('immediately sets progress to 10%', () => {
      const { result } = renderHook(() => useAiJobProgress());

      act(() => {
        result.current.start();
      });

      expect(result.current.progressPercent).toBe(10);
    });

    it('increases progress over time without exceeding 88%', () => {
      const { result } = renderHook(() => useAiJobProgress());

      act(() => {
        result.current.start();
      });

      act(() => {
        vi.advanceTimersByTime(10_000);
      });

      expect(result.current.progressPercent).toBeGreaterThan(10);
      expect(result.current.progressPercent).toBeLessThanOrEqual(88);
    });

    it('resets an in-flight animation before starting a new one', () => {
      const { result } = renderHook(() => useAiJobProgress());

      act(() => {
        result.current.start();
      });

      act(() => {
        vi.advanceTimersByTime(5_000);
      });

      const midProgress = result.current.progressPercent;
      expect(midProgress).toBeGreaterThan(10);

      act(() => {
        result.current.start();
      });

      expect(result.current.progressPercent).toBe(10);
    });
  });

  describe('complete()', () => {
    it('snaps to 100% and stops the interval', () => {
      const { result } = renderHook(() => useAiJobProgress());

      act(() => {
        result.current.start();
      });

      act(() => {
        result.current.complete();
      });

      expect(result.current.progressPercent).toBe(100);

      act(() => {
        vi.advanceTimersByTime(5_000);
      });

      expect(result.current.progressPercent).toBe(100);
    });
  });

  describe('clear()', () => {
    it('resets to 0% and stops the interval', () => {
      const { result } = renderHook(() => useAiJobProgress());

      act(() => {
        result.current.start();
      });

      act(() => {
        vi.advanceTimersByTime(5_000);
      });

      act(() => {
        result.current.clear();
      });

      expect(result.current.progressPercent).toBe(0);

      act(() => {
        vi.advanceTimersByTime(5_000);
      });

      expect(result.current.progressPercent).toBe(0);
    });
  });

  describe('timeout', () => {
    it('calls onTimeout and stops progress after timeoutMs', () => {
      const onTimeout = vi.fn();
      const { result } = renderHook(() => useAiJobProgress({ timeoutMs: 5_000, onTimeout }));

      act(() => {
        result.current.start();
      });

      act(() => {
        vi.advanceTimersByTime(5_000);
      });

      expect(onTimeout).toHaveBeenCalledOnce();
    });

    it('does not call onTimeout if complete() is called first', () => {
      const onTimeout = vi.fn();
      const { result } = renderHook(() => useAiJobProgress({ timeoutMs: 5_000, onTimeout }));

      act(() => {
        result.current.start();
      });

      act(() => {
        result.current.complete();
      });

      act(() => {
        vi.advanceTimersByTime(5_000);
      });

      expect(onTimeout).not.toHaveBeenCalled();
    });

    it('does not call onTimeout if clear() is called first', () => {
      const onTimeout = vi.fn();
      const { result } = renderHook(() => useAiJobProgress({ timeoutMs: 5_000, onTimeout }));

      act(() => {
        result.current.start();
      });

      act(() => {
        result.current.clear();
      });

      act(() => {
        vi.advanceTimersByTime(5_000);
      });

      expect(onTimeout).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('clears timers on unmount', () => {
      const onTimeout = vi.fn();
      const { result, unmount } = renderHook(() =>
        useAiJobProgress({ timeoutMs: 5_000, onTimeout }),
      );

      act(() => {
        result.current.start();
      });

      unmount();

      act(() => {
        vi.advanceTimersByTime(10_000);
      });

      expect(onTimeout).not.toHaveBeenCalled();
    });
  });
});
