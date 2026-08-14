# Google Play Store Review Standards

> **Source:** [Google Play Developer Policy Center](https://play.google.com/about/developer-content-policy/) and [Google Play Console Help](https://support.google.com/googleplay/android-developer/) — Last reviewed April 2026
>
> **Mandatory for all Expo PRs.** Any pull request that touches `apps/expo/` MUST be reviewed
> against this document before merging. See the [PR checklist](#pr-checklist) at the bottom.

---

## Before You Publish

Google's pre-submission checklist. Failing these causes the most common review rejections:

- [ ] App tested on physical Android device/emulator for crashes and ANRs
- [ ] All metadata is accurate, complete, and not misleading
- [ ] Privacy policy linked in Play Console and accessible in-app
- [ ] **Data Safety section** in Play Console completed and accurate (covers every SDK)
- [ ] All backend services live and accessible during review
- [ ] App signed via **Play App Signing**
- [ ] Android App Bundle (`.aab`) submitted — not plain APK for new apps
- [ ] Content rating questionnaire completed via IARC in Play Console
- [ ] In-app account deletion path exists if account creation is offered
- [ ] Contact email in Play Console is monitored and accessible

---

## 1. Content Policy

### 1.1 Restricted Content

- No pornographic, sexually explicit, or obscene content
- No graphic violence beyond the IARC rating declared in Play Console
- No content promoting discrimination, hatred, or violence based on race, religion, gender, sexual orientation, ethnicity, etc.
- No content glorifying self-harm, suicide, or eating disorders
- No promotion of illegal drugs, tobacco, or alcohol to minors
- No child sexual abuse material (CSAM) — zero tolerance, immediate account termination

### 1.2 User-Generated Content (UGC)

Apps featuring UGC **must**:

- Proactively moderate content or provide robust moderation tools — [the identity split](https://linear.app/agilebridge/issue/the identity split): automated send-time screening (`ContentModerationService` / `TextScreeningEngine`), see `docs/moderation-taxonomy.md`
- Include an in-app mechanism to report offensive or illegal content — [the identity split](https://linear.app/agilebridge/issue/the identity split) (report capture shipped in the identity split as `MessageReport`)
- Respond to abuse reports in a timely manner — the Director/Club Admin review queue is [the identity split](https://linear.app/agilebridge/issue/the identity split), not yet built
- Block known repeat offenders — [the identity split](https://linear.app/agilebridge/issue/the identity split), not yet built; `ModerationEvent` already records the repeat-offender signal this will consume

### 1.3 Dangerous or Deceptive Apps

- No malware, spyware, ransomware, or applications that damage the user device or data
- No apps that exploit system or security vulnerabilities
- No apps that facilitate phishing, fraud, or impersonation

---

## 2. Privacy and Data Safety

### 2.1 Privacy Policy

- A **privacy policy** is mandatory for all apps
- Must be linked in the Play Console store listing and accessible from within the app
- Must disclose: what data is collected, how it is used, third-party sharing, retention and deletion policy, and how to withdraw consent

### 2.2 Data Safety Section ⚠️ (Critical)

- Every app must complete the **Data Safety form** in Play Console accurately
- Covers every SDK and library that accesses user data (Firebase, Sentry, Amplitude, Expo modules, analytics SDKs, etc.)
- Google does **not** auto-populate this — it must be filled manually
- Inaccurate or incomplete forms trigger policy violations after launch

### 2.3 Permissions

- Only request permissions that are **strictly necessary** for core app functionality
- **Dangerous permissions** (location, camera, microphone, contacts, storage, SMS, Call Log) require runtime requests with a clear, user-visible rationale
- **Sensitive permission declarations** (SMS, Call Log, Device Admin, Accessibility Service, `SYSTEM_ALERT_WINDOW`) require a valid use-case declaration submitted to Google for review
- Audit `AndroidManifest.xml` before submission — remove any permission not actively used
- Expo's managed workflow auto-includes permissions for installed plugins; always verify the merged manifest

### 2.4 Account Deletion

If the app supports account creation:

- Must provide a clear **in-app path to delete the account and associated data**
- Declare this capability in Play Console (App Content → Data deletion)
- Deletion or a deletion request must remove all personally identifiable data

### 2.5 Deceptive Behaviour

- App name, icon, description, and screenshots must accurately represent the actual in-app experience
- Cannot use names or icons that impersonate other apps, organisations, or brands
- Must not claim device-specific functionality (e.g. "real-time heart rate monitoring") that the app does not provide
- Must not display misleading ads or ads that trigger other apps without explicit user interaction

### 2.6 Device and Network Abuse

- Must not alter device settings without explicit user consent
- Must not use excessive battery, CPU, or memory for unrelated background tasks
- No background cryptocurrency mining
- No downloading and executing arbitrary native code at runtime

---

## 3. Monetisation and Ads

### 3.1 In-App Purchases / Google Play Billing ⚠️

- All digital goods and services consumed within the app **must use Google Play Billing** — no direct web payments, crypto payments, or custom payment flows for in-app purchases
- Subscription terms must be clearly disclosed before purchase: duration, what is provided, price, and how to cancel
- Loot boxes or randomised virtual items must disclose the odds of each item type before purchase
- Free trials must be clearly labelled and easy to cancel

### 3.2 Ads Policy

- Ads must not simulate system notifications, OS dialogs, or other app UI
- Interstitial ads must not block app use in a disruptive or deceptive manner
- Ads must not use deceptive close-button placement or timing
- Rewarded ads require clear, voluntary opt-in from the user

---

## 4. Intellectual Property

- All assets and content must be created by the developer or properly licensed
- Cannot use names, logos, or trademarks of other brands without authorisation
- Do not reproduce copyrighted content (media, images, code) without a licence
- Do not impersonate Huawei, Google, or other platform brands

---

## 5. Technical Requirements

### 5.1 Target API Level ⚠️

- New apps must target the **current required API level** (API 35 as of April 2026)
- Existing app updates: minimum **API 34**; check Play Console for the current requirement
- Must handle behaviour changes for the declared `targetSdkVersion`
- New apps must support **64-bit** architectures (`arm64-v8a`, `x86_64`)

### 5.2 Android App Bundle

- Submit as **Android App Bundle** (`.aab`) — APK-only submissions are no longer accepted for new apps
- EAS Build produces `.aab` by default for production builds; verify `buildType` in `eas.json`
- Do not distribute self-signed release APKs to end users through Play Store

### 5.3 App Signing

- **Play App Signing** is mandatory for all new apps
- Upload the app signing key to Play Console; Google re-signs the final artifact delivered to devices

### 5.4 Network

- All production API calls must use **HTTPS**
- No cleartext HTTP connections in production; remove any `android:usesCleartextTraffic="true"` unless strictly justified and documented

### 5.5 Performance (Android Vitals)

- Must not crash or produce ANRs (Application Not Responding) during review
- Google monitors crash and ANR rates in **Android Vitals** after launch; high rates trigger policy warnings

### 5.6 Background Work

- Use `WorkManager` for deferrable background tasks — avoid raw `Service` or `AlarmManager` for background processing
- **Background location access** (when app is not in use) requires the `ACCESS_BACKGROUND_LOCATION` permission, a policy form submission, and clear user justification

### 5.7 Push Notifications

- Use **Firebase Cloud Messaging (FCM)** for push notifications on Android
- Ensure `google-services.json` is present and correctly configured in the build
- Push notifications must not be required for the app to function

---

## 6. Special Categories

### 6.1 Financial Apps

- Loan apps must disclose all terms; APR ≤ 36%; minimum repayment period ≥ 60 days
- No unregulated investment advice or lending without appropriate disclaimers

### 6.2 Health and Fitness

- No unvalidated health measurement claims without regulatory clearance
- Health apps collecting sensitive data must disclose data use and apply appropriate security controls

### 6.3 Gambling

- Real-money gambling apps require Play Console approval, regional operator licensing, and geo-restriction
- Simulated gambling mechanics (e.g. loot boxes) must disclose item odds before purchase

### 6.4 VPN Apps

- Must use the Android `VpnService` API
- Must not monetise, log, or share user traffic data

---

## Common Rejection Reasons

| Reason | Policy Area |
|---|---|
| Crashes or ANRs during review | Technical Quality |
| Incomplete or inaccurate Data Safety form | Privacy (2.2) |
| Missing in-app privacy policy link | Privacy (2.1) |
| No in-app account deletion for apps with account creation | Privacy (2.4) |
| Requesting excessive or undeclared permissions | Permissions (2.3) |
| Inaccurate screenshots or misleading description | Deceptive Behaviour (2.5) |
| Digital goods not using Google Play Billing | Monetisation (3.1) |
| Target API level below the current minimum | Technical (5.1) |
| Missing or incorrect IARC content rating | Content (1) |
| App name impersonates another brand | Intellectual Property (4) |

---

## Expo / React Native Specific Considerations

1. **Target API level:** Configured via `targetSdkVersion` in `android/build.gradle` (or EAS managed build). EAS Build defaults are generally current — verify against the current Play policy minimum before each submission.

2. **Permissions:** Expo's managed workflow auto-includes permissions based on installed plugins. Always audit the final `android/app/src/main/AndroidManifest.xml` and remove permissions not actively used. Run `npx expo prebuild` to inspect the merged manifest.

3. **Android App Bundle:** Set `buildType: "app-bundle"` in `eas.json` for production profiles. Confirm the built artifact is `.aab` before uploading to Play Console.

4. **Data Safety form:** Must be completed **manually** in Play Console — it is not auto-populated. Audit all SDKs: Sentry, Firebase, Expo modules (analytics, notifications), and any third-party library that touches device or user data.

5. **OTA Updates (EAS Update):** Google Play is **less restrictive than Apple** on JavaScript bundle OTA updates. Updating the JS bundle is generally compliant; adding significant new native functionality still requires a full store release.

6. **Account Deletion:** If the app supports sign-up, declare account deletion support in Play Console under App Content → Data Deletion, and provide a clear in-app path.

7. **Push Notifications (FCM):** Ensure `google-services.json` is present in `android/app/` and referenced correctly. For Expo managed workflow, configure via `app.json` plugin: `expo-notifications`.

8. **ProGuard / R8:** Ensure minification rules are correct in `android/app/proguard-rules.pro` for production builds. Incorrect rules can cause silent crashes in the release variant.

9. **Play Integrity API:** Consider implementing the Play Integrity API if the app is sensitive to tampering or requires backend trust verification of the Android client.

10. **Content Rating (IARC):** Complete the IARC questionnaire in Play Console. Incorrect ratings — particularly for apps with simulated violence, gambling mechanics, or user-generated content — trigger post-launch violations.

---

## PR Checklist

Use this checklist for every pull request that touches `apps/expo/`:

```text
### Google Play Store Compliance (Expo PRs only)
- [ ] No new permissions added to AndroidManifest.xml that are not actively used
- [ ] Dangerous permissions have runtime request with a clear user-visible rationale
- [ ] All network requests use HTTPS; no cleartext HTTP in production
- [ ] If account creation added/modified: in-app account deletion path exists
- [ ] Digital goods sold in-app use Google Play Billing (not custom payment flows)
- [ ] Data Safety form in Play Console will need updating if new data-collection SDKs are added
- [ ] OTA update does not introduce significant new native functionality
- [ ] Target SDK version meets current Play policy minimum (API 35 for new apps)
- [ ] FCM push notification changes (if any) have google-services.json correctly configured
- [ ] Reviewed against docs/google-play-store-review.md for any feature-specific rules
```

---

## References

- [Google Play Developer Policy Center](https://play.google.com/about/developer-content-policy/)
- [Play Console Help — Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Android Permission Best Practices](https://developer.android.com/guide/topics/permissions/overview)
- [Google Play Billing](https://developer.android.com/google/play/billing)
- [Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756)
- [Android App Bundle](https://developer.android.com/guide/app-bundle)
- [Play Integrity API](https://developer.android.com/google/play/integrity)
- [Android Vitals](https://developer.android.com/topic/performance/vitals)
- [EAS Build — Android (Expo)](https://docs.expo.dev/build/android/)
- [EAS Update (Expo)](https://docs.expo.dev/eas-update/introduction/)
