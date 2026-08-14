import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_TIMEOUT_MS = 120_000;
const TICK_MS = 800;

export interface UseAiJobProgressOptions {
  timeoutMs?: number;
  onTimeout?: () => void;
}

export interface UseAiJobProgressResult {
  progressPercent: number;
  /**
   * Start the progress animation and arm the safety-net timeout.
   * Resets any in-flight animation before starting a new one.
   */
  start: () => void;
  /** Snap to 100 and stop all timers (job succeeded). */
  complete: () => void;
  /** Stop all timers and reset to 0 (job failed, cancelled, or component reset). */
  clear: () => void;
}

/**
 * Drives an indeterminate AI-job progress bar with exponential easing and a
 * safety-net timeout. Suitable for any async AI job regardless of content type.
 * Shared by web AI generation flows; keep this in app-level lib hooks because
 * React hooks do not belong in the pure `@starterkit/shared` package.
 *
 * Easing: fast early progress that asymptotes toward 88%.
 * Reaches ~40% at 5 s, ~56% at 10 s, ~74% at 20 s, ~87% at 40 s.
 */
export function useAiJobProgress({
  timeoutMs = DEFAULT_TIMEOUT_MS,
  onTimeout,
}: UseAiJobProgressOptions = {}): UseAiJobProgressResult {
  const [progressPercent, setProgressPercent] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedRef = useRef(0);
  const onTimeoutRef = useRef(onTimeout);

  const stopTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    elapsedRef.current = 0;
  }, []);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  });

  useEffect(() => {
    return stopTimers;
  }, [stopTimers]);

  const start = useCallback(() => {
    stopTimers();
    setProgressPercent(10);

    intervalRef.current = setInterval(() => {
      elapsedRef.current += TICK_MS;
      const elapsedSec = elapsedRef.current / 1_000;
      setProgressPercent(Math.min(88, Math.round(15 + 73 * (1 - Math.exp(-elapsedSec / 12)))));
    }, TICK_MS);

    timeoutRef.current = setTimeout(() => {
      stopTimers();
      onTimeoutRef.current?.();
    }, timeoutMs);
  }, [stopTimers, timeoutMs]);

  const complete = useCallback(() => {
    stopTimers();
    setProgressPercent(100);
  }, [stopTimers]);

  const clear = useCallback(() => {
    stopTimers();
    setProgressPercent(0);
  }, [stopTimers]);

  return { progressPercent, start, complete, clear };
}
