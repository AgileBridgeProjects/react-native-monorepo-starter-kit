import { useValidateSetupToken } from '@features/auth/presentation/hooks/use-validate-setup-token';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import { act, create } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const validateSetupToken = vi.fn();
vi.mock('@features/auth/infrastructure/datasources/user-setup.datasource', () => ({
  userSetupDatasource: {
    validateSetupToken: (...a: unknown[]) => validateSetupToken(...a),
  },
}));

// Capture AppState change handlers so the foreground re-validation can be driven.
let appStateHandler: ((state: string) => void) | null = null;
const removeListener = vi.fn();
vi.mock('react-native', async () => {
  const actual = await import('@/test/mocks/react-native');
  return {
    ...actual,
    AppState: {
      currentState: 'active',
      addEventListener: (_event: string, handler: (state: string) => void) => {
        appStateHandler = handler;
        return { remove: removeListener };
      },
    },
  };
});

function newClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderWithClient<T>(useHook: () => T, queryClient: QueryClient) {
  let current: T | undefined;
  function Harness(): ReactNode {
    current = useHook();
    return null;
  }
  let renderer: ReturnType<typeof create> | undefined;
  act(() => {
    renderer = create(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(Harness),
      ),
    );
  });
  return {
    get current() {
      if (current === undefined) throw new Error('hook value not ready');
      return current;
    },
    update: () =>
      act(() => {
        renderer?.update(
          React.createElement(
            QueryClientProvider,
            { client: queryClient },
            React.createElement(Harness),
          ),
        );
      }),
    unmount: () => act(() => renderer?.unmount()),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  appStateHandler = null;
});

describe('useValidateSetupToken', () => {
  it('validates the token via the datasource when a token is present', async () => {
    validateSetupToken.mockResolvedValue({ email: 'new@example.com', purpose: 'AccountSetup' });
    const client = newClient();
    const hook = renderWithClient(() => useValidateSetupToken('tok-1'), client);

    await act(async () => {
      await client
        .getQueryCache()
        .find({ queryKey: ['setup-token', 'tok-1'] })
        ?.fetch();
    });
    hook.update();

    expect(validateSetupToken).toHaveBeenCalledWith('tok-1');
    expect(hook.current.data).toEqual({ email: 'new@example.com', purpose: 'AccountSetup' });
  });

  it('stays disabled (idle, no fetch) when the token is undefined', () => {
    const hook = renderWithClient(() => useValidateSetupToken(undefined), newClient());

    expect(validateSetupToken).not.toHaveBeenCalled();
    expect(hook.current.fetchStatus).toBe('idle');
  });

  it('stays disabled when explicitly disabled via options even with a token', () => {
    const hook = renderWithClient(
      () => useValidateSetupToken('tok-1', { enabled: false }),
      newClient(),
    );

    expect(validateSetupToken).not.toHaveBeenCalled();
    expect(hook.current.fetchStatus).toBe('idle');
  });

  it('re-validates (invalidates the query) when the app returns to the foreground', async () => {
    validateSetupToken.mockResolvedValue({ email: 'a@b.c', purpose: 'PasswordReset' });
    const client = newClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    renderWithClient(() => useValidateSetupToken('tok-1'), client);

    expect(appStateHandler).toBeTruthy();
    act(() => {
      appStateHandler?.('active');
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['setup-token', 'tok-1'] });
  });

  it('does not re-validate when the app transitions to a non-active state', () => {
    validateSetupToken.mockResolvedValue({ email: 'a@b.c', purpose: 'AccountSetup' });
    const client = newClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    renderWithClient(() => useValidateSetupToken('tok-1'), client);

    act(() => {
      appStateHandler?.('background');
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('does not re-validate on foreground when disabled (no token)', () => {
    const client = newClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    renderWithClient(() => useValidateSetupToken(undefined), client);

    act(() => {
      appStateHandler?.('active');
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('removes the AppState subscription on unmount', () => {
    const hook = renderWithClient(() => useValidateSetupToken('tok-1'), newClient());
    hook.unmount();
    expect(removeListener).toHaveBeenCalledTimes(1);
  });
});
