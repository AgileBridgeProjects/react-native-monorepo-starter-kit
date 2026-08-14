import Constants from 'expo-constants';

/** The environments a build can be. Mirrors the EAS build profiles in eas.json. */
export type AppEnvironment = 'dev-client' | 'dev' | 'uat' | 'production';

/**
 * Which environment this build is, as stamped into `extra.appEnvironment` by app.config.js.
 *
 * Read from `extra` rather than re-derived: `EAS_BUILD_PROFILE` only exists at build time, so
 * the config is the single place that mapping lives.
 *
 * Falls back to `'production'` when the value is missing or unrecognised — the most
 * restricted environment, so a broken config hides environment-gated affordances instead of
 * exposing them. A plain `expo start` legitimately has no profile; that case is picked up by
 * `__DEV__` in {@link areDevToolsEnabled}, not here.
 */
export function appEnvironment(): AppEnvironment {
  const value = Constants.expoConfig?.extra?.appEnvironment;
  return value === 'dev-client' || value === 'dev' || value === 'uat' || value === 'production'
    ? value
    : 'production';
}

/**
 * Whether developer-only tooling (the profile screen's dev tools card, and in future the
 * time-provider and timezone overrides used for demos) may be shown.
 *
 * True for the Metro-attached dev client and the `dev` build, plus any `__DEV__` bundle so a
 * plain `expo start` is covered. Deliberately FALSE on `uat` — UAT is used for demos and
 * sign-off by people outside the team, so it must look like production.
 *
 * Written as a function, not a constant, so tests can vary the environment per case (see the
 * convention in feature-flags.ts).
 */
export function areDevToolsEnabled(): boolean {
  if (__DEV__) return true;
  const environment = appEnvironment();
  return environment === 'dev-client' || environment === 'dev';
}
