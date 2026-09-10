# Mobile Deployment Guide (Dev / Internal Testing)

This guide walks through setting up TestFlight (iOS) and direct APK distribution (Android)
for the StarterKit mobile app using EAS Build + EAS Submit.

---

## Prerequisites

- Apple Developer Program membership ($99/year) — [developer.apple.com](https://developer.apple.com)
- Android testers must enable **Install from unknown sources** on their device (one-time)
- EAS CLI installed: `npm install -g eas-cli`
- `EXPO_TOKEN` secret already configured in GitHub (repo settings > Environments > dev > Secrets)
- EAS project linked: project ID `YOUR-EAS-PROJECT-ID`, owner `YOUR-EXPO-ACCOUNT`

---

## 1. Apple Developer / App Store Connect Setup

### 1.1 Create an App ID

1. Go to [Apple Developer > Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list)
2. Click **+** to register a new identifier
3. Select **App IDs** > **App**
4. Description: `StarterKit Mobile`
5. Bundle ID: **Explicit** > `com.keelanmatthews.starterkitmobile`
6. Enable any capabilities you need (Push Notifications, Sign in with Apple, etc.)
7. Click **Continue** > **Register**

### 1.2 Create the App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com) > **My Apps** > **+** > **New App**
2. Platform: **iOS**
3. Name: `StarterKit Mobile`
4. Primary Language: English
5. Bundle ID: select `com.keelanmatthews.starterkitmobile` from the dropdown
6. SKU: `starterkit-mobile` (any unique string)
7. Click **Create**

### 1.3 Generate an App Store Connect API Key

This key is used by EAS Submit to upload builds to TestFlight without manual intervention.

1. Go to [App Store Connect > Users and Access > Integrations > App Store Connect API](https://appstoreconnect.apple.com/access/integrations/api)
2. Click **Generate API Key** (or **+** if keys already exist)
3. Name: `EAS Submit - StarterKit`
4. Access: **App Manager** (minimum required for uploads)
5. Click **Generate**
6. **Download the `.p8` file immediately** — you can only download it once
7. Note the **Key ID** (shown in the table, e.g., `ABC123DEFG`)
8. Note the **Issuer ID** (shown at the top of the page, e.g., `12345678-abcd-...`)

### 1.4 Base64-encode the Key

```bash
# macOS
base64 -i AuthKey_ABC123DEFG.p8 | pbcopy

# Linux
base64 -w 0 AuthKey_ABC123DEFG.p8 | xclip -selection clipboard

# Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("AuthKey_ABC123DEFG.p8")) | Set-Clipboard
```

### 1.5 Add GitHub Secrets

Go to your GitHub repo > **Settings** > **Environments** > **dev** > **Environment secrets** and add:

| Secret name | Value |
|---|---|
| `ASC_API_KEY_P8_BASE64` | The base64-encoded `.p8` file content |
| `ASC_API_KEY_ID` | The Key ID from step 1.3 (e.g., `ABC123DEFG`) |
| `ASC_API_KEY_ISSUER_ID` | The Issuer ID from step 1.3 |

### 1.6 Set Up TestFlight Internal Testers

1. In App Store Connect > your app > **TestFlight** tab
2. Click **Internal Testing** in the sidebar
3. Click **+** to create a new group (e.g., "Dev Team")
4. Add testers by email — they must have Apple IDs and accept the TestFlight invitation
5. Builds submitted via EAS will automatically appear for internal testers

---

## 2. Android Distribution (Direct APK)

Android testing uses direct APK distribution — no Play Console setup required.

The pipeline builds an APK and uploads it to EAS. Testers download it directly from
[expo.dev](https://expo.dev) > your project > Builds, or you can share the download link.

### Tester setup (one-time per device)

1. On the Android device, go to **Settings** > **Apps** > **Special app access** > **Install unknown apps**
2. Enable it for the browser or file manager they'll use to open the APK
3. Download the APK from the shared link and tap to install

---

## 3. Running the Pipeline

### Via GitHub Actions (recommended)

1. Go to your repo on GitHub > **Actions** tab
2. Select **"Deploy Mobile to TestFlight and Play Store (dev)"** from the sidebar
3. Click **Run workflow**
4. Select platform: `all`, `ios`, or `android`
5. Click **Run workflow**

The pipeline will:

1. Build the iOS and/or Android artifacts via EAS Build (parallel jobs)
2. Submit the iOS build to TestFlight
3. Make the Android APK available for direct download on [expo.dev](https://expo.dev)

### Monitor Progress

- **Build logs**: GitHub Actions run > job steps
- **TestFlight**: App Store Connect > your app > TestFlight
- **Android APK**: GitHub Actions run > **Artifacts** section (download link, expires after 7 days)

### Via CLI (manual)

```bash
cd apps/expo

# Build
eas build --platform ios --profile dev
eas build --platform android --profile dev

# Submit (after build completes)
eas submit --platform ios --profile dev --latest
eas submit --platform android --profile dev --latest
```

### Huawei (AppGallery) — GMS-less flavour

AppGallery is a **separate distribution** with no `eas submit` channel, so it's its own
`platform: huawei` option on both the dev and uat workflows (not part of `all`):

1. Actions → **Deploy Mobile (dev)** or **Deploy Mobile (uat)** → **Run workflow** → platform: **`huawei`**.
2. `build-huawei` runs `eas build --profile huawei-dev` (dev) / `--profile huawei-uat` (uat) — APK.
3. **`huawei_upload` toggle (off by default)** — when on, `submit-huawei` downloads that APK
   and uploads it to AppGallery via `scripts/appgallery-upload.mjs` (Connect Publishing API).
   Left off, the run is **build-only** → install the APK directly (sideload).

> **UAT specifics**: the `huawei-uat` profile (package `com.example.starterkit.huawei.uat`,
> channel `huawei-uat`) pulls its `agconnect-services.uat.json` from the `AGCONNECT_SERVICES_UAT_JSON`
> sensitive var on the EAS **preview** environment (no Key Vault sync needed at build time), and
> the upload step reads `agc-client-id` / `agc-client-secret` from `kv-starterkit-uat`. Set the
> workflow's `AGC_APP_ID` to the UAT AppGallery app id once the UAT app is created.

**To just test on a device**, leave `huawei_upload` off and install the EAS APK directly
(`eas build:list` → download, or `adb install`).

> **AppGallery upload prerequisites** (only needed when `huawei_upload` is on): the Connect API
> client must have a role with **App release** permission (a valid token but HTTP 403 means it
> doesn't), and submitting *for review* (`AGC_SUBMIT=true`) needs the store listing complete.

**Upload behaviour**: the script stops at a **draft** by default. Submitting for review
(`AGC_SUBMIT=true`) needs the store listing complete (category, screenshots, privacy policy,
data-safety, content rating). The script refuses to upload unless the target `AGC_APP_ID`
resolves to `AGC_EXPECTED_PACKAGE` — a guard so it can never touch the production app.

CLI equivalent:

```bash
cd apps/expo
eas build --platform android --profile huawei-dev          # build APK
# download the APK, then from repo root:
AGC_CLIENT_ID=… AGC_CLIENT_SECRET=… AGC_APP_ID=118138035 \
  AGC_EXPECTED_PACKAGE=com.example.starterkit.huawei.dev \
  node scripts/appgallery-upload.mjs path/to/app.apk
```

**Connect API client** (one-time, per developer account): AppGallery Connect → your team →
**Users and permissions → Connect API → Create**, assign a role with **App release**
permission. Store the client ID/secret in Key Vault as `agc-client-id` / `agc-client-secret`
(tag `app=cicd`, **not** `app=expo` — they must not sync into the EAS build env).

---

## 4. GitHub Secrets Checklist

All secrets should be added under **Settings > Environments > dev > Environment secrets**:

| Secret | Source | Required for |
|---|---|---|
| `EXPO_TOKEN` | [expo.dev > Account > Access Tokens](https://expo.dev/settings/access-tokens) | All EAS operations |
| `ASC_API_KEY_P8_BASE64` | App Store Connect API key (base64) | iOS TestFlight submit |
| `ASC_API_KEY_ID` | App Store Connect API key ID | iOS TestFlight submit |
| `ASC_API_KEY_ISSUER_ID` | App Store Connect API issuer ID | iOS TestFlight submit |

---

## 5. Troubleshooting

### iOS: "No matching provisioning profile"

EAS manages provisioning profiles automatically. If you see this error:

- Run `eas credentials` and follow the prompts to set up iOS credentials
- Ensure your Apple Developer membership is active

### iOS: "API key not authorized"

- Check that the API key has **App Manager** or higher access in App Store Connect
- Verify `ASC_API_KEY_ID` and `ASC_API_KEY_ISSUER_ID` match the key in App Store Connect

### Android: "App not installed" error on device

- Ensure **Install from unknown sources** is enabled for the browser/file manager used to open the APK
- If a previous version is installed, uninstall it first if the signing key has changed

### General: "EXPO_TOKEN is not set"

- Add the `EXPO_TOKEN` secret to the `dev` environment in GitHub repo settings
- Generate a token at [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens)
