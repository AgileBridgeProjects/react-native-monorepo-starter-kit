'use client';

import { webAuthDatasource } from '@features/auth/infrastructure/datasources/supabase-auth.datasource';
import { buildApiUrl } from '@lib/http/api-url';
import { uiConfig } from '@lib/ui-config';
import {
  HubConnectionBuilder,
  HubConnectionState,
  type IRetryPolicy,
  LogLevel,
  type RetryContext,
} from '@microsoft/signalr';
import { authStoreUtils, useAuthStore } from '@store/auth-store';
import { useCallback, useEffect, useRef, useState } from 'react';

const SESSION_HUB_URL = buildApiUrl('/hubs/session');

const SESSION_EVENTS = {
  warning: 'ReceiveSessionWarningAsync',
  expired: 'ReceiveSessionExpiredAsync',
} as const;

// Never give up reconnecting — session management must stay alive.
// The only exit is an explicit conn.stop() call on sign-out.
const infiniteRetryPolicy: IRetryPolicy = {
  nextRetryDelayInMilliseconds(ctx: RetryContext): number | null {
    const delays = uiConfig.session.reconnectDelaysMs;
    return delays[Math.min(ctx.previousRetryCount, delays.length - 1)];
  },
};

// ─── Token factory ─────────────────────────────────────────────────────────────
// Extracted outside the hook so `buildSessionConnection` can be a stable
// module-level function that takes the callback refs as arguments rather than
// closing over in-flight component state.

async function getAccessToken(): Promise<string> {
  try {
    const cached = authStoreUtils.getIdToken();
    if (cached) return cached;
    return (await webAuthDatasource.getIdToken(true)) ?? '';
  } catch {
    // Token refresh failed — return empty string so the server returns 401
    // rather than the factory throwing, which SignalR maps to "Failed to fetch".
    return '';
  }
}

// ─── Connection builder ────────────────────────────────────────────────────────
// Kept outside the hook so it is a stable reference — the auth-effect never
// needs to suppress its dependency array to call this.

function buildSessionConnection(
  onWarning: React.MutableRefObject<(s: number) => void>,
  onExpired: React.MutableRefObject<(r: string) => void>,
  onStateChange: (connected: boolean) => void,
  startingRef: React.MutableRefObject<boolean>,
) {
  const conn = new HubConnectionBuilder()
    .withUrl(SESSION_HUB_URL, { accessTokenFactory: getAccessToken })
    .configureLogging(LogLevel.Warning)
    .withAutomaticReconnect(infiniteRetryPolicy)
    .build();

  conn.on(SESSION_EVENTS.warning, (remainingSeconds: number) =>
    onWarning.current(remainingSeconds),
  );
  conn.on(SESSION_EVENTS.expired, (reason: string) => onExpired.current(reason));

  conn.onreconnecting(() => onStateChange(false));
  conn.onreconnected(() => onStateChange(true));
  conn.onclose(() => {
    // The infinite retry policy never returns null, so onclose only fires on
    // explicit stop() (i.e. sign-out). Reset the flag so a future sign-in
    // can start a fresh connection.
    onStateChange(false);
    startingRef.current = false;
  });

  return conn;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface UseSessionHubOptions {
  onSessionWarning: (remainingSeconds: number) => void;
  onSessionExpired: (reason: string) => void;
}

export interface UseSessionHubReturn {
  sendExtendSession: () => void;
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Manages the SignalR connection to /hubs/session.
 *
 * - Auto-connects when the user is authenticated, disconnects on sign-out.
 * - Calls `onSessionWarning` / `onSessionExpired` when the server sends those events.
 * - `sendExtendSession` invokes ExtendSessionAsync to reset the server idle timer.
 */
export function useSessionHub({
  onSessionWarning,
  onSessionExpired,
}: UseSessionHubOptions): UseSessionHubReturn {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  // Keep latest callbacks in refs so the SignalR listener closures never go stale.
  // Assigned directly in the render body — updating a ref is not a side effect.
  const onWarningRef = useRef(onSessionWarning);
  const onExpiredRef = useRef(onSessionExpired);
  onWarningRef.current = onSessionWarning;
  onExpiredRef.current = onSessionExpired;

  const [, setConnected] = useState(false);
  const connectionRef = useRef<ReturnType<typeof buildSessionConnection> | null>(null);
  const startingRef = useRef(false);

  // Connect when authenticated, disconnect when not.
  useEffect(() => {
    if (!isHydrated) return;

    if (!isAuthenticated) {
      const conn = connectionRef.current;
      connectionRef.current = null;
      startingRef.current = false;
      if (conn && conn.state !== HubConnectionState.Disconnected) {
        void conn.stop();
      }
      setConnected(false);
      return;
    }

    if (startingRef.current) return;

    const conn =
      connectionRef.current ??
      buildSessionConnection(onWarningRef, onExpiredRef, setConnected, startingRef);
    connectionRef.current = conn;

    if (conn.state !== HubConnectionState.Disconnected) return;

    startingRef.current = true;
    conn
      .start()
      .then(() => setConnected(true))
      .catch(() => {
        startingRef.current = false;
        setConnected(false);
      });
  }, [isAuthenticated, isHydrated]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      void connectionRef.current?.stop();
    };
  }, []);

  const sendExtendSession = useCallback(() => {
    const conn = connectionRef.current;
    if (!conn || conn.state !== HubConnectionState.Connected) return;
    conn.invoke('ExtendSessionAsync').catch(() => undefined);
  }, []);

  return { sendExtendSession };
}
