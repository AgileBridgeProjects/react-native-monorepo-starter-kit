import { useAdminRealtimeHub } from '@lib/realtime/use-admin-realtime-hub';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockBuild, mockOn, mockStart, mockStop, mockWithUrl } = vi.hoisted(() => ({
  mockBuild: vi.fn(),
  mockOn: vi.fn(),
  mockStart: vi.fn().mockResolvedValue(undefined),
  mockStop: vi.fn().mockResolvedValue(undefined),
  mockWithUrl: vi.fn(),
}));

vi.mock('@features/auth/infrastructure/datasources/supabase-auth.datasource', () => ({
  webAuthDatasource: {
    getIdToken: vi.fn().mockResolvedValue('fresh-token'),
    getCurrentUser: vi.fn().mockReturnValue({ id: 'user-1' }),
  },
}));

vi.mock('@store/auth-store', () => ({
  authStoreUtils: {
    getIdToken: vi.fn(() => 'cached-token'),
  },
  useAuthStore: vi.fn(
    (selector: (state: { isAuthenticated: boolean; isHydrated: boolean }) => unknown) =>
      selector({ isAuthenticated: true, isHydrated: true }),
  ),
}));

vi.mock('@microsoft/signalr', () => ({
  HubConnectionBuilder: vi.fn().mockImplementation(() => ({
    withUrl: mockWithUrl.mockReturnThis(),
    configureLogging: vi.fn().mockReturnThis(),
    withAutomaticReconnect: vi.fn().mockReturnThis(),
    build: mockBuild.mockImplementation(() => ({
      on: mockOn,
      onclose: vi.fn(),
      onreconnected: vi.fn(),
      onreconnecting: vi.fn(),
      start: mockStart,
      state: 'Disconnected',
      stop: mockStop,
    })),
  })),
  HubConnectionState: {
    Connected: 'Connected',
    Disconnected: 'Disconnected',
  },
  LogLevel: { Warning: 1 },
}));

describe('useAdminRealtimeHub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts the admin realtime hub with token authentication', async () => {
    const { result } = renderHook(() => useAdminRealtimeHub({ onAiJobCompleted: vi.fn() }));

    await act(async () => {
      await result.current.start();
    });

    expect(mockWithUrl).toHaveBeenCalledWith(
      'http://localhost:5002/hubs/admin-realtime',
      expect.objectContaining({ accessTokenFactory: expect.any(Function) }),
    );
    expect(mockStart).toHaveBeenCalledOnce();
  });

  it('routes AI job completion messages to the latest callback', async () => {
    const onAiJobCompleted = vi.fn();
    const { result } = renderHook(() => useAdminRealtimeHub({ onAiJobCompleted }));

    await act(async () => {
      await result.current.start();
    });

    const handler = mockOn.mock.calls.find(
      ([eventName]) => eventName === 'ReceiveAiJobCompletedAsync',
    )?.[1];

    act(() => {
      handler?.('job-123');
    });

    expect(onAiJobCompleted).toHaveBeenCalledWith('job-123');
  });
});
