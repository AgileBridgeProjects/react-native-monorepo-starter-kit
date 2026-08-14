'use client';

import { webAuthDatasource } from '@features/auth/infrastructure/datasources/supabase-auth.datasource';
import { buildApiUrl } from '@lib/http/api-url';
import {
  type HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { authStoreUtils, useAuthStore } from '@store/auth-store';
import { useCallback, useEffect, useRef, useState } from 'react';

const ADMIN_REALTIME_HUB_URL = buildApiUrl('/hubs/admin-realtime');

const ADMIN_REALTIME_EVENTS = {
  aiJobCompleted: 'ReceiveAiJobCompletedAsync',
  aiJobFailed: 'ReceiveAiJobFailedAsync',
  exportReady: 'ReceiveExportReadyAsync',
  exportFailed: 'ReceiveExportFailedAsync',
  notificationMessageStatusChanged: 'ReceiveNotificationMessageStatusChangedAsync',
} as const;

interface UseAdminRealtimeHubOptions {
  onAiJobCompleted?: (jobId: string) => void;
  onAiJobFailed?: (jobId: string, errorMessage: string | null) => void;
  onExportReady?: (exportId: string, downloadUrl: string) => void;
  onExportFailed?: (exportId: string, errorMessage: string | null) => void;
  onNotificationMessageStatusChanged?: (
    notificationMessageId: string,
    clubId: string,
    status: string,
  ) => void;
}

interface UseAdminRealtimeHubReturn {
  isConnected: boolean;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export function useAdminRealtimeHub({
  onAiJobCompleted,
  onAiJobFailed,
  onExportReady,
  onExportFailed,
  onNotificationMessageStatusChanged,
}: UseAdminRealtimeHubOptions): UseAdminRealtimeHubReturn {
  const [isConnected, setIsConnected] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  // Refs so `start`/`stop` have stable identities — callers that put them in
  // useEffect deps won't re-fire just because auth state hydrated.
  const isAuthenticatedRef = useRef(isAuthenticated);
  const isHydratedRef = useRef(isHydrated);
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);
  useEffect(() => {
    isHydratedRef.current = isHydrated;
  }, [isHydrated]);
  const connectionRef = useRef<HubConnection | null>(null);
  const startPromiseRef = useRef<Promise<void> | null>(null);
  const aiJobCompletedRef = useRef(onAiJobCompleted);
  const aiJobFailedRef = useRef(onAiJobFailed);
  const exportReadyRef = useRef(onExportReady);
  const exportFailedRef = useRef(onExportFailed);
  const notificationMessageStatusChangedRef = useRef(onNotificationMessageStatusChanged);

  useEffect(() => {
    aiJobCompletedRef.current = onAiJobCompleted;
  }, [onAiJobCompleted]);
  useEffect(() => {
    aiJobFailedRef.current = onAiJobFailed;
  }, [onAiJobFailed]);
  useEffect(() => {
    exportReadyRef.current = onExportReady;
  }, [onExportReady]);
  useEffect(() => {
    exportFailedRef.current = onExportFailed;
  }, [onExportFailed]);
  useEffect(() => {
    notificationMessageStatusChangedRef.current = onNotificationMessageStatusChanged;
  }, [onNotificationMessageStatusChanged]);

  const getConnection = useCallback(() => {
    if (connectionRef.current) return connectionRef.current;

    const connection = new HubConnectionBuilder()
      .withUrl(ADMIN_REALTIME_HUB_URL, {
        accessTokenFactory: async () => {
          const cached = authStoreUtils.getIdToken();
          if (cached) return cached;
          const fresh = await webAuthDatasource.getIdToken(true);
          return fresh ?? '';
        },
      })
      .configureLogging(LogLevel.Warning)
      .withAutomaticReconnect()
      .build();

    connection.on(ADMIN_REALTIME_EVENTS.aiJobCompleted, (jobId: string) =>
      aiJobCompletedRef.current?.(jobId),
    );
    connection.on(ADMIN_REALTIME_EVENTS.aiJobFailed, (jobId: string, errorMessage: string | null) =>
      aiJobFailedRef.current?.(jobId, errorMessage),
    );
    connection.on(ADMIN_REALTIME_EVENTS.exportReady, (exportId: string, downloadUrl: string) =>
      exportReadyRef.current?.(exportId, downloadUrl),
    );
    connection.on(
      ADMIN_REALTIME_EVENTS.exportFailed,
      (exportId: string, errorMessage: string | null) =>
        exportFailedRef.current?.(exportId, errorMessage),
    );
    connection.on(
      ADMIN_REALTIME_EVENTS.notificationMessageStatusChanged,
      (notificationMessageId: string, clubId: string, status: string) =>
        notificationMessageStatusChangedRef.current?.(notificationMessageId, clubId, status),
    );
    connection.onreconnecting(() => setIsConnected(false));
    connection.onreconnected(() => setIsConnected(true));
    connection.onclose(() => {
      setIsConnected(false);
      startPromiseRef.current = null;
    });

    connectionRef.current = connection;
    return connection;
  }, []);

  const start = useCallback(async () => {
    if (!isHydratedRef.current || !isAuthenticatedRef.current) {
      setIsConnected(false);
      return;
    }

    const connection = getConnection();
    if (connection.state === HubConnectionState.Connected) {
      setIsConnected(true);
      return;
    }

    // Already connecting or reconnecting — wait for the in-flight promise if
    // there is one, otherwise bail (SignalR manages the reconnect internally).
    if (
      connection.state === HubConnectionState.Connecting ||
      connection.state === HubConnectionState.Reconnecting
    ) {
      if (startPromiseRef.current) await startPromiseRef.current;
      return;
    }

    if (!startPromiseRef.current) {
      startPromiseRef.current = connection
        .start()
        .then(() => setIsConnected(true))
        .catch((error: unknown) => {
          startPromiseRef.current = null;
          setIsConnected(false);
          throw error;
        });
    }

    await startPromiseRef.current;
  }, [getConnection]);

  const stop = useCallback(async () => {
    const connection = connectionRef.current;
    const startPromise = startPromiseRef.current;
    // Eagerly clear the refs so any concurrent start() call gets a fresh
    // HubConnection in Disconnected state rather than this stopping one.
    connectionRef.current = null;
    startPromiseRef.current = null;
    if (!connection || connection.state === HubConnectionState.Disconnected) {
      setIsConnected(false);
      return;
    }

    // If start() is still negotiating, wait for it to settle before stopping.
    // Calling stop() during negotiation throws "The connection was stopped during negotiation."
    if (startPromise) {
      await startPromise.catch(() => undefined);
    }

    try {
      await connection.stop();
    } finally {
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  return { isConnected, start, stop };
}
