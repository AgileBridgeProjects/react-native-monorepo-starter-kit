/**
 * Dynamic Expo config — wraps app.json and overrides runtimeVersion per build profile.
 *
 * Icon mapping:
 *   simulator / dev-client  →  icon-dev.png     (LOCAL badge)
 *   dev                     →  icon-preview.png (DEV badge, TestFlight / internal APK)
 *   uat                     →  icon-uat.png     (UAT badge)
 *   production              →  icon.png         (no badge)
 *
 * App identity per profile. Two profiles sharing a bundle id / package / scheme are
 * ONE app to the OS — installing either replaces the other.
 *
 * ONE APP RECORD PER ENVIRONMENT, a layout that suits any multi-environment app
 * (e.g. "MyApp Dev" / "MyApp UAT" in App Store Connect). Each environment bakes in its
 * own API URL at build time, so they have to be separate installable apps — and a
 * tester can hold all of them at once:
 *   simulator / dev-client  →  .devclient  "StarterKit (DC)"   — local dev client, never submitted
 *   dev                     →  .dev        "StarterKit (Dev)"  — TestFlight / Play internal
 *   uat                     →  .uat        "StarterKit (UAT)"  — TestFlight / Play internal
 *   production              →  base        "StarterKit"        — App Store / Play, launch only
 *
 * The base identity ships ONLY from `production`, so nothing pre-release ever lands in
 * the store app's record. The dev client has a fourth identity of its own because the
 * `dev` app owns `.dev`: when both claimed it, installing one replaced the other.
 *
 * Every profile shares version.json's runtime. Dev client builds (simulator, dev-client)
 * disable expo-updates entirely rather than carrying a runtime label of their own; see
 * RUNTIME_VERSION below for the bump policy and the `updates` spread near the bottom for
 * why the label had to go.
 */

/**
 * Both version numbers come from ./version.json, which scripts/mobile-version.mjs
 * derives and CI verifies — never edit them by hand (docs/standards/ota-updates.md
 * § Versioning).
 *
 * RUNTIME_VERSION — expo-updates runtimeVersion. An EAS Update is delivered only to
 * installed builds whose runtimeVersion matches this string exactly. Keeping it a plain
 * string (instead of the fingerprint policy) makes OTA deterministic: fingerprint hashes
 * differ between the machines that build binaries (EAS servers) and the machines that
 * publish updates (GitHub Actions / dev laptops), which silently killed every update.
 *
 * mobile-version.mjs bumps the PATCH part when a PR touches the native surface: app.json,
 * this file, eas.json, plugins/, modules/, any google-services*.json /
 * GoogleService-Info*.plist, a dependency section of apps/expo/package.json, or a root
 * patches/ file. After a bump a full EAS build must be cut per channel before OTA resumes
 * for that channel — scripts/publish-ota.mjs refuses to publish to builds on an older
 * runtime and says so.
 *
 * PRODUCTION_APP_VERSION — CFBundleShortVersionString / versionName for the store
 * listings, applied to the `production` profile only (see the spread below). It moves
 * per release from the branch's Conventional Commits; dev/uat/dev-client keep app.json's
 * frozen 1.0.0 because they are separate app records whose build numbers autoIncrement.
 */
const { production: PRODUCTION_APP_VERSION, runtime: RUNTIME_VERSION } = require('./version.json');

const IS_DEV_CLIENT_BUILD =
  process.env.EAS_BUILD_PROFILE === 'simulator' || process.env.EAS_BUILD_PROFILE === 'dev-client';

const IS_DEV_BUILD = process.env.EAS_BUILD_PROFILE === 'dev';
const IS_UAT_BUILD = process.env.EAS_BUILD_PROFILE === 'uat';
const IS_PRODUCTION_BUILD = process.env.EAS_BUILD_PROFILE === 'production';

/**
 * Which environment this binary IS, exposed to the runtime through `extra` (read it via
 * `appEnvironment()` in src/lib/app-environment.ts — never re-derive it).
 *
 * Build-time only otherwise: the IS_* flags above come from EAS_BUILD_PROFILE, which does
 * not exist at runtime, so anything that needs to behave differently per environment had no
 * way to ask.
 *
 * Defaults to `'production'` when the profile is unrecognised — a plain `expo start` has no
 * EAS_BUILD_PROFILE at all. That direction is deliberate: an unknown build is treated as the
 * most restricted one, so a misconfiguration hides a dev-only affordance rather than shipping
 * it. Local Metro is picked up at runtime via `__DEV__` instead.
 */
const APP_ENVIRONMENT = IS_DEV_CLIENT_BUILD
  ? 'dev-client'
  : IS_DEV_BUILD
    ? 'dev'
    : IS_UAT_BUILD
      ? 'uat'
      : 'production';

/**
 * Resolve the deep-link host per build profile.
 *
 * Pre-launch (no App Store / Play Store listing yet), there is no
 * dedicated domain for the mobile app — Universal Links / App Links piggyback
 * on the already-deployed Admin Portal host, which serves both the portal's own
 * /setup-account page AND the mobile fallback at /mobile-setup-account (see
 * apps/web/public/.well-known/ and apps/web/src/app/mobile-setup-account/).
 * Production will use the final custom domain once provisioned.
 */
// Only the UAT block below consumes this (it sets EXPO_PUBLIC_DEEP_LINK_HOST via eas.json);
// dev / dev-client / production builds take associatedDomains + intentFilters from the static
// app.json value instead. Falls back to the dev Admin Portal domain.
const DEEP_LINK_HOST = process.env.EXPO_PUBLIC_DEEP_LINK_HOST ?? 'yourapp.example.com';

/**
 * iOS Firebase config file for the dev client's `.devclient` identity.
 *
 * Low stakes, kept accurate: this app has no Firebase SDK — push is expo-notifications
 * (APNs on iOS, so the plist is inert there; FCM only on Android, where the packaged
 * google-services.json carries a `.devclient` entry). The `.dev` fallback exists purely
 * so prebuild never fails on a missing file, and self-heals if a real
 * GoogleService-Info.devclient.plist is ever committed. See docs/mobile-deployment.md
 * § Firebase footnote for when any of this starts to matter.
 */
function devClientGoogleServicesFile() {
  const fs = require('node:fs');
  const path = require('node:path');
  const own = './GoogleService-Info.devclient.plist';
  return fs.existsSync(path.join(__dirname, own)) ? own : './GoogleService-Info.dev.plist';
}

/** @param {{ config: import('@expo/config').ExpoConfig }} context */
module.exports = ({ config }) => {
  // Resolve the correct icon for this build profile (iOS + Android use the same image)
  const appIcon = IS_DEV_CLIENT_BUILD
    ? './assets/images/icon-dev.png'
    : IS_DEV_BUILD
      ? './assets/images/icon-preview.png'
      : IS_UAT_BUILD
        ? './assets/images/icon-uat.png'
        : config.icon;

  return {
    ...config,
    icon: appIcon,
    // Store builds carry the derived version lineage; every other profile keeps app.json's
    // 1.0.0. See PRODUCTION_APP_VERSION above.
    ...(IS_PRODUCTION_BUILD && { version: PRODUCTION_APP_VERSION }),
    extra: {
      ...config.extra,
      appEnvironment: APP_ENVIRONMENT,
    },
    // One app record per environment (the standard multi-env layout
    // described in docs/mobile-deployment.md): dev / uat / production are separate installable apps with
    // their own bundle ids, store records, and baked-in API URLs, so a phone can hold
    // all three at once. The base identity ships ONLY from the production profile.
    //
    // The Metro-attached dev client gets its own fourth identity (.devclient) because
    // the pipeline's dev app owns `.dev` — when both claimed it they collapsed into
    // one app on the device, which is the collision that started all of this.
    ...(IS_DEV_CLIENT_BUILD && {
      name: `${config.name} (DC)`,
      scheme: 'starterkit-mobile-devclient',
      ios: {
        ...config.ios,
        bundleIdentifier: `${config.ios.bundleIdentifier}.devclient`,
        googleServicesFile: devClientGoogleServicesFile(),
      },
      android: {
        ...config.android,
        package: `${config.android.package}.devclient`,
        adaptiveIcon: {
          ...config.android?.adaptiveIcon,
          foregroundImage: './assets/images/android-icon-foreground-dev.png',
        },
      },
    }),
    // Dev-environment builds (TestFlight / Play internal) — the "StarterKit Dev" app.
    ...(IS_DEV_BUILD && {
      name: `${config.name} (Dev)`,
      scheme: 'starterkit-mobile-dev',
      ios: {
        ...config.ios,
        bundleIdentifier: `${config.ios.bundleIdentifier}.dev`,
        googleServicesFile: './GoogleService-Info.dev.plist',
      },
      android: {
        ...config.android,
        package: `${config.android.package}.dev`,
        adaptiveIcon: {
          ...config.android?.adaptiveIcon,
          foregroundImage: './assets/images/android-icon-foreground-preview.png',
        },
      },
    }),
    // UAT builds use a separate bundle ID so they coexist with dev + production
    ...(IS_UAT_BUILD && {
      name: `${config.name} (UAT)`,
      scheme: 'starterkit-mobile-uat',
      ios: {
        ...config.ios,
        bundleIdentifier: `${config.ios.bundleIdentifier}.uat`,
        googleServicesFile: './GoogleService-Info.uat.plist',
        associatedDomains: [`applinks:${DEEP_LINK_HOST}`],
      },
      android: {
        ...config.android,
        package: `${config.android.package}.uat`,
        adaptiveIcon: {
          ...config.android?.adaptiveIcon,
          foregroundImage: './assets/images/android-icon-foreground-uat.png',
        },
        intentFilters: [
          {
            action: 'VIEW',
            autoVerify: true,
            data: [{ scheme: 'https', host: DEEP_LINK_HOST, pathPrefix: '/mobile-setup-account' }],
            category: ['BROWSABLE', 'DEFAULT'],
          },
        ],
      },
    }),
    // Override Google Sign-In iosUrlScheme per environment (each bundle ID has its
    // own OAuth client). The splash screen is NOT overridden here any more — it used
    // to be forced to the bright primary blue, which fought the 2026-07 rebrand's
    // navy splash; app.json's expo-splash-screen block is the single source of truth.
    plugins: config.plugins?.map((plugin) => {
      if (Array.isArray(plugin) && plugin[0] === '@react-native-google-signin/google-signin') {
        // Each bundle id needs the OAuth client registered against it — Google rejects a
        // client used from a different bundle id. This scheme belongs to `.dev`, so it
        // follows the dev-environment app. `production` inherits app.json's base scheme.
        if (IS_DEV_BUILD) {
          return [
            plugin[0],
            {
              ...plugin[1],
              iosUrlScheme: 'com.googleusercontent.apps.YOUR-DEV-IOS-OAUTH-CLIENT-ID',
            },
          ];
        }
        // The dev client's own `.devclient` OAuth client — see the prerequisites section
        // of docs/mobile-deployment.md. Until it is created, Google sign-in inside the
        // dev client fails on a bundle-id mismatch (email/password and Microsoft are
        // unaffected); every other auth path and every other profile is fine.
        if (IS_DEV_CLIENT_BUILD && process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME_DEVCLIENT) {
          return [
            plugin[0],
            {
              ...plugin[1],
              iosUrlScheme: process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME_DEVCLIENT,
            },
          ];
        }
        if (IS_UAT_BUILD) {
          return [
            plugin[0],
            {
              ...plugin[1],
              iosUrlScheme: 'com.googleusercontent.apps.YOUR-UAT-IOS-OAUTH-CLIENT-ID',
            },
          ];
        }
      }
      return plugin;
    }),
    // Dev clients load their JS from Metro and are never an OTA target, so expo-updates
    // is switched off outright. They used to carry a fixed `dev-client` runtimeVersion
    // instead, which broke every dev-client build started from a machine whose eas-cli
    // does not inject the profile env locally: EAS resolves runtimeVersion twice, once
    // where the build starts and once on the builder, and aborts when the two disagree.
    ...(IS_DEV_CLIENT_BUILD && {
      updates: { ...config.updates, enabled: false },
    }),
    // One runtime for every profile, never conditional on EAS_BUILD_PROFILE — see the
    // comment above. Do NOT switch back to the fingerprint policy either: its hashes are
    // not reproducible across build servers vs the machines that publish OTAs, which
    // silently drops every update.
    runtimeVersion: RUNTIME_VERSION,
  };
};
