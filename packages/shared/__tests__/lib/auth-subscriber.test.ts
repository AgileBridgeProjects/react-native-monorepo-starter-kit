import { beforeEach, describe, expect, it, vi } from 'vitest';
import { subscribeToAuth } from '../../src/lib/auth/auth-subscriber';
import { authTransitionGuard } from '../../src/lib/auth/auth-transition-guard';

function makeSupabase(session: unknown) {
  return {
    auth: {
      onAuthStateChange: (
        cb: (event: string, session: unknown) => void,
      ): { data: { subscription: { unsubscribe: () => void } } } => {
        cb('SIGNED_IN', session);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
    // biome-ignore lint/suspicious/noExplicitAny: minimal fake client for the subscriber's shape
  } as any;
}

const fakeSession = { access_token: 'token-1', user: { id: 'u-1', email: 'a@b.com' } };

describe('subscribeToAuth', () => {
  beforeEach(() => {
    authTransitionGuard.inProgress = false;
  });

  it('calls onAuthenticated for a normal SIGNED_IN event', () => {
    const onAuthenticated = vi.fn();
    subscribeToAuth(makeSupabase(fakeSession), {
      onAuthenticated,
      onUnauthenticated: vi.fn(),
      onSettled: vi.fn(),
    });

    expect(onAuthenticated).toHaveBeenCalledTimes(1);
  });

  it('skips onAuthenticated while an explicit sign-in flow is finalizing the same session', () => {
    authTransitionGuard.inProgress = true;
    const onAuthenticated = vi.fn();
    const onSettled = vi.fn();
    subscribeToAuth(makeSupabase(fakeSession), {
      onAuthenticated,
      onUnauthenticated: vi.fn(),
      onSettled,
    });

    expect(onAuthenticated).not.toHaveBeenCalled();
    // onSettled still runs — the listener short-circuits only the duplicate work.
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('still calls onAuthenticated once the guard clears', () => {
    authTransitionGuard.inProgress = false;
    const onAuthenticated = vi.fn();
    subscribeToAuth(makeSupabase(fakeSession), {
      onAuthenticated,
      onUnauthenticated: vi.fn(),
      onSettled: vi.fn(),
    });

    expect(onAuthenticated).toHaveBeenCalledTimes(1);
  });
});
