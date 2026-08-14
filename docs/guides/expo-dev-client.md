# Expo Dev Client Guide

The Expo dev client is a custom development build of the app that replaces Expo Go.
It provides the same fast-refresh experience but with access to all native modules
(expo-secure-store, expo-image, etc.) that Expo Go does not support.

The `expo-dev-client` package is already installed in the project.

---

## Quick Start

The fastest path to a running dev client:

```bash
cd apps/expo

# Build for iOS Simulator (no Apple Developer account needed)
eas build --profile simulator --platform ios

# OR build for Android Emulator / device
eas build --profile simulator --platform android

# Start the dev server
npx expo start --dev-client
```

---

## Build Profiles

The project has two development build profiles in `eas.json`:

| Profile | Use case | iOS output |
|---|---|---|
| `simulator` | Simulators (iOS) + emulators/devices (Android) | `.app` (simulator only) |
| `dev-client` | Physical iOS devices | `.ipa` (requires provisioning) |

Android `.apk` files work on both emulators and physical devices regardless of profile.

---

## 1. iOS Simulator

No Apple Developer account is needed for simulator builds.

```bash
cd apps/expo

# Build via EAS cloud
eas build --profile simulator --platform ios

# After build completes, install and run on simulator
eas build:run --platform ios
```

The `eas build:run` command downloads the build and installs it on your default iOS Simulator.

Alternatively, download the `.tar.gz` from the [EAS build page](https://expo.dev), extract it,
and drag the `.app` file onto the Simulator window.

---

## 2. Physical iOS Device

Requires an Apple Developer account and device registration.

### Register your device

```bash
# Register a device UDID with EAS
eas device:create
```

Follow the prompts — EAS will generate a URL that the device owner opens in Safari to register
the device UDID automatically.

### Build for the device

```bash
eas build --profile dev-client --platform ios
```

EAS will prompt you to set up provisioning profiles if this is the first time. Select
**Let EAS handle it** for the easiest setup.

### Install on device

- **QR code**: scan the QR code on the EAS build page with your phone camera
- **CLI**: `eas build:run --platform ios` (requires the device to be connected via USB)

---

## 3. Android Emulator / Physical Device

```bash
cd apps/expo

# Build via EAS cloud
eas build --profile simulator --platform android

# Install and run on connected device or emulator
eas build:run --platform android
```

For physical devices: enable **USB debugging** in Android Developer Options and connect via USB.

For emulators: ensure an AVD (Android Virtual Device) is running in Android Studio before
running `eas build:run`.

---

## 4. Connecting to the Dev Server

Once the dev client is installed on your device/simulator:

```bash
cd apps/expo

# Start the dev server in dev-client mode
npx expo start --dev-client
```

The dev client app will show a launcher screen with options to:

- **Automatically discover** the dev server on the local network
- **Enter the URL manually** (shown in your terminal, e.g., `http://192.168.x.x:8081`)

### Physical device tips

- Ensure the device is on the **same Wi-Fi network** as your development machine
- If auto-discovery fails, enter the URL manually from the terminal output
- On Android, you can also use `adb reverse tcp:8081 tcp:8081` for USB connection

---

## 5. Local Prebuild (Alternative to EAS Cloud)

If you prefer building locally instead of using EAS cloud (faster iteration, no build queue):

### Generate native projects

```bash
cd apps/expo

# Generate ios/ and android/ directories
npx expo prebuild
```

This creates native Xcode and Android Studio projects based on your `app.json` configuration.

### Build with Xcode (iOS — macOS only)

1. Open `ios/StarterKitMobile.xcworkspace` in Xcode
2. Select your target device/simulator
3. Click **Run** (Cmd+R)

### Build with Android Studio (Android)

1. Open the `android/` directory in Android Studio
2. Wait for Gradle sync to complete
3. Select your target device/emulator
4. Click **Run** (Shift+F10)

### Important notes

- The `ios/` and `android/` directories are already in `.gitignore` — they are generated, not committed
- Run `npx expo prebuild --clean` to regenerate from scratch if native config changes
- Local prebuild requires: macOS + Xcode for iOS, Java SDK + Android Studio for Android

---

## 6. When to Rebuild the Dev Client

**Rebuild required:**

- New native module added (e.g., `expo-camera`, `react-native-maps`)
- Expo SDK version upgraded
- `app.json` changes affecting native config (bundle ID, permissions, plugins)
- New Expo plugin added to the `plugins` array

**No rebuild needed (hot reload handles it):**

- JavaScript/TypeScript code changes
- Styling changes (Tailwind/NativeWind)
- New screens or components (JS-only)
- React Query / Zustand store changes
- Navigation changes (Expo Router)

---

## 7. Troubleshooting

### "Unable to connect to dev server"

- Check that device and dev machine are on the same Wi-Fi network
- Try entering the URL manually from the terminal
- On Android: `adb reverse tcp:8081 tcp:8081`
- Restart the dev server: `npx expo start --dev-client --clear`

### "Development build is not installed"

- The dev client app is a separate build from Expo Go — you must build it first
- Run `eas build --profile simulator --platform <ios|android>`

### "Invariant Violation: Native module cannot be null"

- This usually means a native module is missing from the dev client build
- Rebuild the dev client to include the new native dependency

### iOS Simulator build fails with signing error

- Simulator builds do not require signing — ensure you are using the `simulator` profile (not `dev-client`)
- If issues persist: `eas credentials --platform ios` and reset credentials
