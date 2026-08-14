'use client';

import { revokeAndSignOut } from '@features/auth/infrastructure/revoke-session';
import { lastVisitedPath } from '@lib/last-visited-path';
import { useSessionHub } from '@lib/realtime/use-session-hub';
import { useAuthStore } from '@store/auth-store';
import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionManagerState {
  showWarning: boolean;
  remainingSeconds: number;
  extendSession: () => void;
  signOutNow: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Input events monitored while the warning modal is visible.
// When any of these fire, the modal is dismissed and the session is extended.
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'mousedown', 'touchstart'] as const;

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Server-driven session manager via SignalR.
 *
 * Activity tracking:
 *   1. SessionActivityMiddleware (backend) — every authenticated mutation
 *      (POST/PUT/PATCH/DELETE) resets LastActivityAt on the server.
 *   2. Activity listeners (this hook) — when the warning modal is visible,
 *      any user input immediately dismisses it and calls ExtendSessionAsync.
 *      Ambient activity on read-only pages is intentionally not tracked;
 *      the warning modal acts as the natural checkpoint for idle users.
 *
 * The server is the authoritative clock. Warning and expiry events are pushed
 * via SignalR; on reconnect the server immediately re-evaluates session state.
 */
export function useSignalRSessionManager(): SessionManagerState {
  const { isAuthenticated, logout: storeLogout } = useAuthStore();

  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ref mirrors showWarning so the activity handler always reads the current
  // value without re-registering event listeners on every state transition.
  const showWarningRef = useRef(false);
  const sendExtendSessionRef = useRef<(() => void) | null>(null);

  const syncShowWarning = useCallback((value: boolean) => {
    showWarningRef.current = value;
    setShowWarning(value);
  }, []);

  // ── Sign-out helpers ────────────────────────────────────────────────────────

  const stopCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const performSignOut = useCallback(
    (reason: 'idle' | 'absolute') => {
      stopCountdown();
      syncShowWarning(false);
      storeLogout();
      revokeAndSignOut().finally(() => {
        window.location.href = `/login?reason=${reason}`;
      });
    },
    [stopCountdown, syncShowWarning, storeLogout],
  );

  // ── Server event: warning ───────────────────────────────────────────────────

  const handleSessionWarning = useCallback(
    (serverRemainingSeconds: number) => {
      stopCountdown();
      let remaining = Math.max(0, serverRemainingSeconds);
      setRemainingSeconds(remaining);
      syncShowWarning(true);

      countdownRef.current = setInterval(() => {
        remaining -= 1;
        setRemainingSeconds(Math.max(0, remaining));
        if (remaining <= 0) {
          stopCountdown();
          performSignOut('idle');
        }
      }, 1000);
    },
    [stopCountdown, syncShowWarning, performSignOut],
  );

  // ── Server event: expired ──────────────────────────────────────────────────

  const handleSessionExpired = useCallback(
    (reason: string) => {
      performSignOut(reason === 'absolute' ? 'absolute' : 'idle');
    },
    [performSignOut],
  );

  // ── SignalR hub ────────────────────────────────────────────────────────────

  const { sendExtendSession } = useSessionHub({
    onSessionWarning: handleSessionWarning,
    onSessionExpired: handleSessionExpired,
  });

  // Assigned in the render body so the activity handler always reads the current
  // reference without waiting for a useEffect tick.
  sendExtendSessionRef.current = sendExtendSession;

  // ── Activity detection — warning-dismiss only ──────────────────────────────
  //
  // Listeners are only meaningful while the warning modal is visible.
  // Any user input at that point is treated as "I'm still here" — the modal
  // dismisses instantly and ExtendSessionAsync resets the server idle timer.
  // Ambient activity on read-only pages is deliberately not tracked; the
  // middleware handles mutations and the warning modal handles idle users.

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleActivity = () => {
      if (!showWarningRef.current) return;
      stopCountdown();
      syncShowWarning(false);
      sendExtendSessionRef.current?.();
    };

    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, handleActivity, { passive: true });
    }
    return () => {
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, handleActivity);
      }
    };
  }, [isAuthenticated, stopCountdown, syncShowWarning]);

  // ── Extend session (programmatic — kept for future use) ───────────────────

  const extendSession = useCallback(() => {
    stopCountdown();
    syncShowWarning(false);
    sendExtendSessionRef.current?.();
  }, [stopCountdown, syncShowWarning]);

  // ── Sign out now ───────────────────────────────────────────────────────────

  const signOutNow = useCallback(() => {
    stopCountdown();
    syncShowWarning(false);
    lastVisitedPath.clear();
    storeLogout();
    revokeAndSignOut().finally(() => {
      window.location.href = '/login?reason=idle';
    });
  }, [stopCountdown, syncShowWarning, storeLogout]);

  // ── Cleanup ────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => stopCountdown();
  }, [stopCountdown]);

  return { showWarning, remainingSeconds, extendSession, signOutNow };
}
