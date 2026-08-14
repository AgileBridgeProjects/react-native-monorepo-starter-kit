# New Environment Setup — Mobile App (Expo/EAS)

> Step-by-step guide for setting up a new environment (e.g. UAT, staging, production)
> for the StarterKit Expo mobile app. Covers Firebase, Google OAuth, Microsoft auth,
> EAS Build, App Store Connect, Google Play Console, and CI/CD.

## Prerequisites

- Access to: Firebase Console, Google Cloud Console, Azure AD Portal, App Store Connect,
  Google Play Console, EAS CLI (authenticated), GitHub repo admin
- The backend API for the new environment must already be deployed and accessible

---

## 1. Firebase Setup

### 1.1 Register iOS app

1. Firebase Console → Project Settings → Add app → iOS
2. Bundle ID: `com.example.starterkit.<env>` (e.g. `.uat`, `.staging`)
3. Download `GoogleService-Info.<env>.plist` → save to `apps/expo/`
4. Note the **iOS client ID** from the plist (under `CLIENT_ID`) — you'll need it for
   the Google Sign-In `iosUrlScheme` and `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`

### 1.2 Register Android app

1. Firebase Console → Project Settings → Add app → Android
2. Package name: `com.example.starterkit.<env>`
3. **Add SHA-1 fingerprint** from the EAS keystore (see §4.1 below)
   - If the keystore doesn't exist yet, run the first EAS build first (§6), then come
     back and add the fingerprint
4. Download updated `google-services.json` (covers all Android apps in the project)

### 1.3 Register Web app (for Firebase Auth)

1. Firebase Console → Add app → Web
2. Note the `firebaseConfig` values — you'll need them for `EXPO_PUBLIC_FIREBASE_*` env vars

### 1.4 Update google-services.json — WATCH FOR REGRESSIONS

**CRITICAL**: Firebase regenerates `google-services.json` for the entire project. Every time
you download it, diff against the existing file before replacing:

```bash
cp apps/expo/google-services.json apps/expo/google-services.json.bak
# Download new file from Firebase Console or CLI
diff apps/expo/google-services.json.bak apps/expo/google-services.json
```

**Known regression**: Firebase overwrites the `other_platform_oauth_client` → `ios_info`
cross-references for ALL Android clients, replacing them with the most recently created
iOS client. You MUST manually restore:

- **Production client** (`com.example.starterkit`): `ios_info.bundle_id` must be
  `com.example.starterkit` with `app_store_id: "6761183579"`
- **Dev client** (`com.example.starterkit.dev`): same as production
- **New env client**: should reference its own iOS client

Check every `appinvite_service.other_platform_oauth_client` block in the diff.

---

## 2. Google Cloud Console — OAuth Clients

### 2.1 Get the Android signing SHA-1

```bash
cd apps/expo
eas credentials --platform android
# Select the new env profile → view keystore → copy SHA-1 Fingerprint
```

### 2.2 Add SHA-1 to Firebase (preferred method)

1. Firebase Console → Project Settings → Your Apps → find the new Android app
2. Click **Add fingerprint** → paste SHA-1
3. Firebase auto-creates the native Android OAuth client in GCP

### 2.3 Verify in GCP

1. GCP Console → APIs & Credentials → OAuth 2.0 Client IDs
2. Confirm a new **Android** client exists for `com.example.starterkit.<env>`
3. If not auto-created, create manually:
   - Type: Android
   - Package name: `com.example.starterkit.<env>`
   - SHA-1: from step 2.1

### 2.4 Note all client IDs

You'll need these for `eas.json`:

| Var | Source |
|---|---|
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | GCP → Web client (shared across envs) |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | GCP → iOS client for this env's bundle ID |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | GCP → Web client (Android native uses google-services.json directly) |

### 2.5 Huawei / AppGallery (GMS-less) — Google Sign-In ⚠️ (easy to forget)

Huawei builds have **no Google Play Services**, so they cannot use the native Google SDK.
They fall back to a **system-browser OAuth flow** (`expo-auth-session`) that redirects to a
custom URI scheme (`com.example.starterkit.huawei.<env>:/oauthredirect`) against the
**Android** OAuth client. Two things differ from a normal env:

1. **`EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` must be the Huawei Android client itself**
   (the `client_type: 1` client created by registering the EAS Huawei keystore SHA-1 on the
   Huawei Firebase app), **not** the shared Web client. The browser flow's `client_id` and
   `id_token` audience key off this. Create it via:

   ```bash
   firebase apps:android:sha:create <huawei-android-appId> <EAS_HUAWEI_KEYSTORE_SHA1> --project <fb-project>
   firebase apps:sdkconfig android <huawei-android-appId> --project <fb-project>   # read the new client_type:1 id
   ```

2. **Enable "Custom URI scheme" on that Android OAuth client** — this is OFF by default and
   there is **no CLI for it**. Without it the browser flow fails with:
   > `Error 400: invalid_request — Custom URI scheme is not enabled for your Android client.`

   **GCP Console → APIs & Services → Credentials → the Huawei Android OAuth client →
   Advanced settings → Enable "Custom URI scheme" → Save** (propagates in a few minutes).

   ⚠️ **Do this for every Huawei env separately — dev, uat, AND production.** It's a
   per-client toggle, so the production Huawei Android client needs it flipped too. This is
   the single niche step most likely to be forgotten when promoting Huawei auth to prod.

---

## 3. Azure AD — Microsoft Auth

### 3.1 Register redirect URIs

1. Azure Portal → App Registrations → `fd83002f-ae88-4028-817a-d9579ae44d20`
2. Authentication → Platform configurations → Mobile and desktop applications
3. Add: `starterkit-mobile-<env>://auth/microsoft`

The app uses a single Azure AD registration with per-environment redirect URIs. The scheme
is read dynamically from `Constants.expoConfig?.scheme` at runtime — no code changes needed
as long as `app.config.js` sets the correct scheme for the new profile.

### 3.2 Verify the scheme in app.config.js

The `IS_<ENV>_BUILD` detection and scheme override must exist in `app.config.js`:

```js
const IS_<ENV>_BUILD = process.env.EAS_BUILD_PROFILE === '<env>';

// In the config return:
...(IS_<ENV>_BUILD && {
  name: `${config.name} (<Env>)`,
  scheme: 'starterkit-mobile-<env>',
  // ...
}),
```

**DO NOT hardcode the scheme in auth hooks** — `use-microsoft-sign-in.ts` reads it
dynamically from `Constants.expoConfig?.scheme`.

---

## 4. App Store Connect (iOS)

1. Create a new app in App Store Connect
2. Bundle ID: `com.example.starterkit.<env>`
3. Note the **App ID** (numeric) — needed for `eas.json` submit config (`ascAppId`)
4. Set up TestFlight / internal testing group

---

## 5. Google Play Console (Android)

1. Create a new app with package name `com.example.starterkit.<env>`
2. Set up internal testing track
3. Upload the service account key or ensure the existing `eas-submit` service account
   has access to the new app

---

## 6. EAS Configuration

### 6.1 eas.json — Build profile

Add a new build profile in `apps/expo/eas.json`:

```json
"<env>": {
  "channel": "<env>",
  "autoIncrement": true,
  "env": {
    "EAS_BUILD_PROFILE": "<env>",
    "EXPO_PUBLIC_API_URL": "https://<env-api-url>",
    "EXPO_PUBLIC_DEEP_LINK_HOST": "<env-swa-hostname>",
    "EXPO_PUBLIC_FIREBASE_API_KEY": "...",
    "EXPO_PUBLIC_FIREBASE_APP_ID": "...",
    "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN": "...",
    "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID": "...",
    "EXPO_PUBLIC_FIREBASE_PROJECT_ID": "...",
    "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET": "...",
    "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID": "...",
    "EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID": "...",
    "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID": "...",
    "EXPO_PUBLIC_MICROSOFT_CLIENT_ID": "...",
    "EXPO_PUBLIC_MICROSOFT_TENANT_ID": "common"
  },
  "ios": { "distribution": "store" },
  "android": { "buildType": "app-bundle" }
}
```

**Why env vars are in eas.json, not EAS Environments**: Custom EAS environments
(`eas env:push <name>`) require a Production/Enterprise EAS plan. Free tier only supports
`production`, `preview`, `development`. Embedding vars in `eas.json` works on all plans.

### 6.2 eas.json — Submit profile

```json
"<env>": {
  "ios": {
    "ascAppId": "<app-store-connect-app-id>",
    "ascApiKeyId": "$ASC_API_KEY_ID",
    "ascApiKeyIssuerId": "$ASC_API_KEY_ISSUER_ID",
    "ascApiKeyPath": "./keys/asc-api-key.p8"
  },
  "android": {
    "serviceAccountKeyPath": "./keys/google-play-service-account.json",
    "track": "internal"
  }
}
```

### 6.3 iOS credentials — MUST run before first CI build

**CRITICAL**: The CI pipeline runs `eas build --non-interactive`. If iOS credentials
(distribution certificate + provisioning profile) don't exist in EAS for the new profile,
the non-interactive build will fail immediately with a credentials error.

You **must** generate credentials locally first:

```bash
cd apps/expo
eas credentials --platform ios
# Select the new env profile
# → Build Credentials → Set up a new build credential
# → Distribution Certificate → Reuse existing (if one exists) or generate new
# → Provisioning Profile → Generate new
```

Verify it's saved on EAS before triggering the pipeline:

```bash
eas credentials --platform ios
# Select the new profile — should show certificate + provisioning profile with no warnings
```

Only once credentials are confirmed in EAS should you trigger the CI workflow.

### 6.4 Android credentials

Android credentials (keystore) are auto-generated on the first EAS build. No manual setup
needed — but after the first build, go back to §2.2 and add the SHA-1 to Firebase.

---

## 7. app.config.js — Dynamic Config

Add the new environment's overrides:

```js
const IS_<ENV>_BUILD = process.env.EAS_BUILD_PROFILE === '<env>';

// In the icon resolution:
IS_<ENV>_BUILD ? './assets/images/icon-<env>.png' : ...

// In the config spread:
...(IS_<ENV>_BUILD && {
  name: `${config.name} (<Env>)`,
  scheme: 'starterkit-mobile-<env>',
  ios: {
    ...config.ios,
    bundleIdentifier: `${config.ios.bundleIdentifier}.<env>`,
    googleServicesFile: './GoogleService-Info.<env>.plist',
    associatedDomains: [`applinks:${DEEP_LINK_HOST}`],
  },
  android: {
    ...config.android,
    package: `${config.android.package}.<env>`,
    adaptiveIcon: {
      ...config.android?.adaptiveIcon,
      foregroundImage: './assets/images/android-icon-foreground-<env>.png',
    },
    intentFilters: [/* deep link filters for setup-account */],
  },
}),
```

Also update the Google Sign-In plugin `iosUrlScheme` override for the new env.

---

## 8. Asset Files

Ensure these exist in `apps/expo/assets/images/`:

- `icon-<env>.png` — iOS + general icon
- `android-icon-foreground-<env>.png` — Android adaptive icon foreground

And in `apps/expo/`:

- `GoogleService-Info.<env>.plist` — iOS Firebase config

---

## 9. CI/CD Workflow

Create `.github/workflows/deploy-mobile-<env>.yml` based on the UAT workflow. Key points:

- Use `workflow_dispatch` with platform input
- Jobs: `build-ios`, `build-android`, `submit-ios`, `submit-android`
- Each build job runs: `eas build --platform <platform> --profile <env> --non-interactive`
- Each submit job runs: `eas submit --platform <platform> --profile <env> --non-interactive`
- **Do NOT use `eas env:push`** — vars are in `eas.json` (see §6.1)

---

## 10. Rebuild with Cache Clear

For the first build after config changes (especially icon changes), use `--clear-cache`:

```bash
eas build --platform android --profile <env> --non-interactive --clear-cache
eas build --platform ios --profile <env> --non-interactive --clear-cache
```

---

## Checklist

- [ ] Firebase: iOS app registered, plist downloaded
- [ ] Firebase: Android app registered
- [ ] Firebase: Web app registered, config values noted
- [ ] Firebase: SHA-1 fingerprint added to Android app
- [ ] GCP: Native Android OAuth client exists for new package name
- [ ] google-services.json: Updated, diffed, regressions fixed
- [ ] Azure AD: Redirect URI `starterkit-mobile-<env>://auth/microsoft` added
- [ ] App Store Connect: New app created, App ID noted
- [ ] Google Play Console: New app created, internal testing track set up
- [ ] eas.json: Build profile with all `EXPO_PUBLIC_*` vars
- [ ] eas.json: Submit profile with ascAppId and track
- [ ] EAS: iOS credentials configured locally (`eas credentials --platform ios`) **before triggering CI**
- [ ] app.config.js: Build profile detection, scheme, bundle ID, icons, plist, plugins
- [ ] Asset files: Icon PNGs + GoogleService-Info plist in place
- [ ] CI/CD: Workflow file created
- [ ] First build: Run with `--clear-cache`
- [ ] Verify: Auth works on both iOS and Android
- [ ] Verify: App connects to correct backend API
- [ ] Verify: App icon displays correctly

---

## Lessons Learned (UAT Setup — June 2026)

1. **Never hardcode the app scheme in auth code** — always read from `Constants.expoConfig?.scheme`
2. **EAS custom environments require a paid plan** — embed `EXPO_PUBLIC_*` vars in `eas.json` instead
3. **Firebase overwrites iOS cross-refs** in `google-services.json` every time you download — always diff
4. **Android OAuth client needs SHA-1** — the keystore is only created on the first EAS build, so you may need to circle back after the first build to add the fingerprint
5. **iOS EAS credentials must be set up interactively** before the first non-interactive CI build
6. **EAS iOS credentials must be provisioned locally before the first CI build** — the pipeline runs `--non-interactive` and will fail immediately if no certificate/provisioning profile exists for the profile in EAS. Run `eas credentials --platform ios`, select the new profile, and confirm cert + provisioning profile are saved before triggering the workflow.
7. **The auth redirect scheme determines which app receives the callback** — if multiple apps share a scheme, Android picks one unpredictably
