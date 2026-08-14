import { act } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCooldown } from '@/src/lib/hooks/use-cooldown';
import { renderHook } from '@/test/utils/render-hook';

describe('useCooldown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns isOnCooldown=false and remainingMs=0 when cooldownEndsAt is null', () => {
    const { result } = renderHook(() => useCooldown(null));

    expect(result.current.isOnCooldown).toBe(false);
    expect(result.current.remainingMs).toBe(0);
  });

  it('returns isOnCooldown=false and remainingMs=0 when cooldownEndsAt is undefined', () => {
    const { result } = renderHook(() => useCooldown(undefined));

    expect(result.current.isOnCooldown).toBe(false);
    expect(result.current.remainingMs).toBe(0);
  });

  it('returns isOnCooldown=false and remainingMs=0 when cooldownEndsAt is in the past', () => {
    const past = new Date(Date.now() - 60_000).toISOString();

    const { result } = renderHook(() => useCooldown(past));

    expect(result.current.isOnCooldown).toBe(false);
    expect(result.current.remainingMs).toBe(0);
  });

  it('returns isOnCooldown=true with positive remainingMs when cooldownEndsAt is in the future', () => {
    const future = new Date(Date.now() + 60_000).toISOString();

    const { result } = renderHook(() => useCooldown(future));

    expect(result.current.isOnCooldown).toBe(true);
    expect(result.current.remainingMs).toBeGreaterThan(0);
  });

  it('decrements remainingMs as time passes', () => {
    const future = new Date(Date.now() + 10_000).toISOString();

    const { result } = renderHook(() => useCooldown(future));

    const initial = result.current.remainingMs;

    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(result.current.remainingMs).toBeLessThan(initial);
  });

  it('transitions isOnCooldown to false when countdown reaches zero', () => {
    const future = new Date(Date.now() + 2_000).toISOString();

    const { result } = renderHook(() => useCooldown(future));

    expect(result.current.isOnCooldown).toBe(true);

    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(result.current.isOnCooldown).toBe(false);
    expect(result.current.remainingMs).toBe(0);
  });
});
