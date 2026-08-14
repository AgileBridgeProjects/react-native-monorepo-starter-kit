# Mobile Deployment — App Identities & Store Setup

What each EAS build profile ships as, and the one-time console ceremony every **new**
app identity needs before CI can build and submit it. Written after the first deploy
following the the identity split identity split failed on exactly these steps (2026-07-28).

For JS-only releases see `docs/standards/ota-updates.md`. For store review rules see
`docs/apple-app-store-review.md` / `docs/google-play-store-review.md`.

## Identity map

One app record per environment — a setup that works for any multi-environment app
(e.g. "MyApp Dev" / "MyApp UAT" in App Store Connect). Each environment bakes its own API
URL in at build time, so they must be separate installable apps; a tester can hold all
of them at once.

| Profile | iOS bundle / Android package | Name on device | Distribution | ASC record |
|---|---|---|---|---|
| `simulator` / `dev-client` | `com.example.starterkit.devclient` | StarterKit (DC) | direct install, **never submitted** | — |
| `dev` | `com.example.starterkit.dev` | StarterKit (Dev) | TestFlight / Play internal | `—` |
| `uat` | `com.example.starterkit.uat` | StarterKit (UAT) | TestFlight / Play internal | `—` |
| `production` | `com.example.starterkit` (base) | StarterKit | App Store / Play | `—` |

**The base identity ships only from `production`.** Nothing pre-release lands in the
store app's record, and the record stays clean until launch.

The dev client has a fourth identity of its own (`.devclient`) because the dev app owns
`.dev`. When both claimed `.dev` they were one app to the OS, so installing either one
replaced the other — that is the collision this layout exists to prevent.

### Firebase footnote — what those config files actually do here

StarterKit has **no Firebase SDK**: auth and data are Supabase, and push is
`expo-notifications` — APNs on iOS, so `GoogleService-Info*.plist` is inert there
(`app.config.js` falls back to the `.dev` plist for the dev client purely so prebuild
never fails on a missing file). The only live touchpoint is **Android**, where Expo
delivers push via FCM and the build consumes `google-services.json`; every identity —
including `.devclient` — has a package entry in it so Android builds pass the
google-services Gradle step.

Two pieces of dormant config debt, for whenever they start to matter:

1. **Firebase configs are not committed in this starter kit** — register your own
   Firebase apps per identity and commit the generated config files; no
   Firebase apps exist. Harmless today. Before **Android push** is exercised for real
   (pre-launch at the latest), register proper StarterKit apps (ideally in a StarterKit
   project), regenerate both config files, and upload the matching FCM service account
   to the Expo project.
2. **Google sign-in is not enabled in the product yet** — the configured OAuth client
   ids are placeholders. When the feature is switched on, create your own
   OAuth clients per bundle id; the dev client's goes in
   `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME_DEVCLIENT` in the `dev-client` / `simulator`
   profiles in `eas.json`.

## One-time setup for a NEW identity

CI (`Deploy Mobile (dev)`) provisions what it can, but each brand-new bundle id /
package needs these once, in order:

### iOS

1. **Provisioning profile** — created automatically during the first CI build: the
   build job passes the App Store Connect API key via `EXPO_ASC_*` env vars, so
   non-interactive credential setup can talk to Apple. (Without those vars the build
   dies with `Distribution Certificate is not validated for non-interactive builds` —
   that was the 2026-07-28 failure.) Always **reuse** the org's existing Apple
   Distribution certificate — it signs every AgileBridge app; revoking or regenerating
   it breaks all of them.
2. **App Store Connect app record** — cannot be created by CI. In ASC: Apps → ＋ →
   New App → pick the bundle id (registered by step 1) → name/language/SKU. Creating
   the record publishes nothing: TestFlight is invite-only and no store listing exists
   until one is written and submitted for review.
3. **`eas.json`** — set the submit profile's `ios.ascAppId` to the new record's
   numeric Apple ID (App Information page). Submitting with a stale id fails loudly:
   Transporter rejects the bundle-id mismatch.

### Android

There is **no `ascAppId` equivalent** — Google Play identifies the app by the package
name inside the AAB, so `eas.json` needs no change. The ceremony is console-side:

1. **Keystore** — EAS auto-generates one for the new package on its first build, no
   interaction needed. That keystore becomes the app's **permanent signing key**:
   never delete or regenerate it (`eas credentials --platform android` shows it).
2. **Play Console app record** — create the app in Play Console (package is fixed by
   the first artifact uploaded, so get it right).
3. **Manual first upload** — Google requires the first AAB to be uploaded through the
   Play Console UI; service-account submissions (`eas submit`) only work from the
   second artifact onward. Download the AAB from the EAS build page and upload it to
   the internal track by hand, once.

## Deploy workflow notes

- `Deploy Mobile (dev)` is `workflow_dispatch` only. After merging a fix, dispatch a
  **fresh run** — re-running a failed run rebuilds the original commit without the fix.
- Firebase: `google-services.json` / `GoogleService-Info.plist` already carry client
  entries for every identity in the map above. A new identity needs its Firebase app
  registered and fresh config files committed **before** the first build.
