import { useEffect, useState } from 'react';

/**
 * Manages a live countdown for a game cooldown period.
 *
 * Returns the remaining milliseconds and whether the cooldown is still active.
 * Updates every second while active; cleans up the interval on unmount.
 *
 * Safe to call unconditionally — returns `{ isOnCooldown: false, remainingMs: 0 }`
 * when `cooldownEndsAt` is null/undefined or already in the past.
 */
export function useCooldown(cooldownEndsAt: string | null | undefined): {
  isOnCooldown: boolean;
  remainingMs: number;
} {
  const [remainingMs, setRemainingMs] = useState(() => {
    if (!cooldownEndsAt) return 0;
    return Math.max(0, new Date(cooldownEndsAt).getTime() - Date.now());
  });

  useEffect(() => {
    if (!cooldownEndsAt) {
      setRemainingMs(0);
      return;
    }
    const endTime = new Date(cooldownEndsAt).getTime();
    if (endTime <= Date.now()) {
      setRemainingMs(0);
      return;
    }
    let id: ReturnType<typeof setInterval>;
    const tick = () => {
      const remaining = Math.max(0, endTime - Date.now());
      setRemainingMs(remaining);
      if (remaining === 0) clearInterval(id);
    };
    tick();
    id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cooldownEndsAt]);

  return { isOnCooldown: remainingMs > 0, remainingMs };
}
