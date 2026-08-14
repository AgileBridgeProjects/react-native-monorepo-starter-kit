import { afterEach, describe, expect, it, vi } from 'vitest';

const extra: { appEnvironment?: unknown } = {};
vi.mock('expo-constants', () => ({
  default: {
    get expoConfig() {
      return { extra };
    },
  },
}));

/** `__DEV__` is a global injected by the RN bundler; tests drive it directly. */
function setDev(value: boolean) {
  (globalThis as { __DEV__?: boolean }).__DEV__ = value;
}

afterEach(() => {
  extra.appEnvironment = undefined;
  setDev(false);
});

describe('appEnvironment', () => {
  it.each(['dev-client', 'dev', 'uat', 'production'] as const)('passes through %s', async (env) => {
    extra.appEnvironment = env;
    const { appEnvironment } = await import('@/src/lib/app-environment');
    expect(appEnvironment()).toBe(env);
  });

  it.each([
    undefined,
    null,
    '',
    'staging',
    42,
  ])('falls back to production for %s', async (value) => {
    // Fails CLOSED on purpose: an unrecognised or missing value must be treated as the most
    // restricted environment, so a config mistake hides dev affordances rather than
    // shipping them to real users.
    extra.appEnvironment = value;
    const { appEnvironment } = await import('@/src/lib/app-environment');
    expect(appEnvironment()).toBe('production');
  });
});

describe('areDevToolsEnabled', () => {
  it.each(['dev-client', 'dev'] as const)('is enabled on %s', async (env) => {
    extra.appEnvironment = env;
    const { areDevToolsEnabled } = await import('@/src/lib/app-environment');
    expect(areDevToolsEnabled()).toBe(true);
  });

  it.each(['uat', 'production'] as const)('is DISABLED on %s', async (env) => {
    // UAT specifically: it is what gets demoed and signed off by people outside the team, so
    // it has to look like production. This assertion is the reason the module exists.
    extra.appEnvironment = env;
    const { areDevToolsEnabled } = await import('@/src/lib/app-environment');
    expect(areDevToolsEnabled()).toBe(false);
  });

  it('is enabled in a __DEV__ bundle even with no configured environment', async () => {
    // A plain `expo start` has no EAS_BUILD_PROFILE, so app.config stamps 'production'.
    setDev(true);
    extra.appEnvironment = 'production';
    const { areDevToolsEnabled } = await import('@/src/lib/app-environment');
    expect(areDevToolsEnabled()).toBe(true);
  });
});
