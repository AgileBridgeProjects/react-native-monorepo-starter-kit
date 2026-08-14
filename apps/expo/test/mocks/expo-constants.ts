/**
 * Vitest stand-in for `expo-constants`, aliased in vitest.config.ts.
 *
 * The real package can't be resolved under Node: its build re-exports
 * `./Constants.types` without a file extension, which the ESM resolver rejects. Aliasing is
 * better than a `vi.mock` in each test — otherwise every test that transitively reaches
 * `expo-constants` (anything rendering a screen that reads the app environment) has to know
 * about a dependency it doesn't care about.
 *
 * `extra` is empty, so `appEnvironment()` falls back to `'production'` and dev-only UI is
 * hidden by default in tests. A test that wants a specific environment mocks the module
 * itself — see `__tests__/src/lib/app-environment.test.ts`.
 */
export default {
  expoConfig: { extra: {} },
};
