# Apple App Store Review Standards

> **Source:** [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — Last updated February 6, 2026
>
> **Mandatory for all Expo PRs.** Any pull request that touches `apps/expo/` MUST be reviewed
> against this document before merging. See the [PR checklist](#pr-checklist) at the bottom.

---

## Before You Submit

Apple's pre-submission checklist. Failing any of these triggers the most common rejection
category (Guideline 2.1 — App Completeness, which accounts for >40% of unresolved rejections):

- [ ] App tested on-device for crashes and bugs
- [ ] All app info and metadata is complete and accurate
- [ ] Contact information is up to date in App Store Connect
- [ ] Demo account credentials (or a built-in demo mode) provided in App Review notes
- [ ] Backend services are **live and accessible** during review
- [ ] Non-obvious features explained in App Review notes
- [ ] All links (support URL, privacy policy) are functional
- [ ] Placeholder content removed (no dummy text, empty pages, test images)

---

## 1. Safety

### 1.1 Objectionable Content

- No defamatory, discriminatory, or mean-spirited content (race, religion, gender, sexual orientation, ethnicity, etc.)
- No realistic depictions of violence, killing, or torture
- No encouragement of illegal weapon use or firearm purchases
- No overtly sexual or pornographic material
- No inflammatory religious commentary or misleading religious texts
- No fake device data or trick/joke functionality (e.g. fake location trackers)
- No content that capitalises on violent events, terrorist attacks, or epidemics

### 1.2 User-Generated Content

Apps with UGC **must** include:

- A method for filtering objectionable material — [the identity split](https://linear.app/agilebridge/issue/the identity split): automated send-time screening (`ContentModerationService` / `TextScreeningEngine`), see `docs/moderation-taxonomy.md`
- A mechanism to report offensive content with timely responses — [the identity split](https://linear.app/agilebridge/issue/the identity split) (report capture shipped in the identity split as `MessageReport`; the Director/Club Admin review queue is [the identity split](https://linear.app/agilebridge/issue/the identity split))
- Ability to block abusive users — [the identity split](https://linear.app/agilebridge/issue/the identity split) (not yet built — flag this bullet as outstanding before submitting a build with in-app messaging enabled)
- Published contact information — `Support:HelpEmail` (see `docs/standards/monorepo.md`)

### 1.3 Kids Category

If targeting children:

- No external links or purchases outside a parental gate
- No third-party analytics or advertising (with narrow exceptions)
- Must comply with COPPA, GDPR, and all applicable children's privacy laws
- No personally identifiable information sent to third parties

### 1.4 Physical Harm

- Medical apps must clearly disclose data/methodology and remind users to consult a doctor
- No unvalidated health measurement claims (e.g. "measures blood pressure via camera sensor" without clearance)
- No encouragement of tobacco, illegal drugs, or excessive alcohol
- No DUI checkpoints not published by law enforcement

### 1.5 Developer Information

- App and Support URL must include easy-to-find contact information
- Contact information must be accurate and up to date

### 1.6 Data Security

- Implement appropriate security measures for all user data collected
- Prevent unauthorised use, disclosure, or access by third parties

---

## 2. Performance

### 2.1 App Completeness ⚠️ (Most Common Rejection)

- Submission must be a **final version** — no placeholder text, empty websites, or temp content
- App tested on-device; no crashes or obvious technical problems
- Demo account provided if login is required
- Backend services live during review
- In-app purchases complete and accessible to the reviewer

### 2.2 Beta Testing

- Do **not** submit beta/demo/trial versions to the App Store — use TestFlight
- TestFlight builds must still comply with App Review Guidelines

### 2.3 Accurate Metadata

- App description, screenshots, and previews must accurately reflect the actual experience
- No hidden, dormant, or undocumented features
- In-app purchases must be disclosed in description and screenshots
- Screenshots must show the app in use (not just title art or splash screen)
- Select the most appropriate App Store category
- Age rating must be answered honestly
- App name limited to **30 characters**; metadata must not include pricing or irrelevant keywords
- Icons, screenshots, and previews must be appropriate for a 4+ age rating in metadata
- "What's New" text must clearly describe significant changes (not just "bug fixes" for major changes)

### 2.4 Hardware Compatibility

- iPhone apps should run on iPad whenever possible
- App must not rapidly drain battery, generate excessive heat, or run unrelated background crypto mining
- App must not suggest restarting the device or disabling system settings unrelated to core functionality

### 2.5 Software Requirements

- Use only **public Apple APIs**; app must run on the currently shipping OS
- App must be self-contained — no downloading or executing code that adds features at runtime
- App must be fully functional on **IPv6-only networks**
- Web browsing must use WebKit framework
- Apps must not alter system-level switches (Volume, Ring/Silent)
- Background services only used for their intended purpose (VoIP, audio, location, etc.)
- Apps using facial recognition for auth must use `LocalAuthentication` (not ARKit)
- Must request explicit user consent before recording/logging user activity (camera, mic, screen)
- Widgets, extensions, and notifications must be related to the app's core content
- Must request explicit user consent before recording, logging, or making a record of user activity

---

## 3. Business

### 3.1 Payments & In-App Purchase (IAP)

- Unlocking features or functionality **requires** in-app purchase (no licence keys, QR codes, crypto, etc.)
- In-app purchase credits/currencies must **not expire**; a restore mechanism is required
- "Loot boxes" must **disclose odds** of each item type before purchase
- Auto-renewable subscriptions must provide ongoing value and last at least 7 days
- Subscription info must clearly describe what the user gets before they subscribe
- Upgrades/downgrades must be seamless; users must not inadvertently subscribe to duplicates
- Non-subscription apps may offer a free trial via a Non-Consumable IAP at Price Tier 0 (naming: "XX-day Trial")
- NFT selling/listing/transferring is allowed via IAP; NFT ownership must not unlock app features
- Physical goods and services consumed outside the app **cannot** use in-app purchase

### 3.2 Prohibited Business Practices

- No fake reviews, paid/incentivised ratings, or chart manipulation
- No forcing users to rate, review, or download other apps to access functionality
- No binary options trading apps
- Personal loan apps must disclose all terms; max APR ≤ 36%; no repayment deadline ≤ 60 days

---

## 4. Design

### 4.1 No Copycats

- Must be an original app; do not copy another app's name, UI, or icon
- Cannot use another developer's icon, brand, or product name without approval

### 4.2 Minimum Functionality

- App must include features, content, and UI beyond a repackaged website
- App must provide lasting entertainment value or adequate utility
- App must function without requiring installation of another app
- If additional resources are downloaded on first launch, disclose size and prompt the user

### 4.3 No Spam

- Do not create multiple Bundle IDs of the same app
- Avoid saturating already-crowded categories without providing a uniquely high-quality experience

### 4.4 Extensions

- Extensions must comply with Apple's Extension Programming Guide
- Must disclose what extensions are available in marketing text
- Extensions may not contain ads or in-app purchases
- Keyboard extensions must provide keyboard input and a method to advance to the next keyboard

### 4.5 Apple Sites and Services

- Do not scrape Apple sites (App Store, apple.com, etc.)
- Push Notifications must not be required for app to function
- Push Notifications for marketing only allowed with explicit opt-in consent from the user; must provide opt-out
- Game Center Player IDs must not be displayed to users or third parties

### 4.7 Mini Apps / Streaming Games / Chatbots

- All such software must follow all privacy guidelines and Guideline 3.1 for payments
- App may not expose native platform APIs to hosted software without Apple permission

### 4.8 Login Services (Sign in with Apple)

If using a third-party social login (Facebook, Google, Twitter, LinkedIn, Amazon, WeChat) as the **primary account** setup method, you **must also** offer Sign in with Apple or another login that:

- Limits data to name and email address only
- Allows users to hide their email address
- Does not collect app interactions for advertising

Exceptions: enterprise/education accounts, government ID systems, or apps that are clients for a specific third-party service.

### 4.9 Apple Pay

- Must provide all material purchase info before sale
- Must follow Apple Pay branding guidelines and HIG
- Recurring payments must disclose: renewal term, what is provided, actual charges, and how to cancel

---

## 5. Legal

### 5.1 Privacy ⚠️ (Critical)

#### 5.1.1 Data Collection and Storage

- **Privacy policy** is required in App Store Connect metadata AND within the app (easily accessible)
- Privacy policy must disclose: what data is collected, how it is collected, all uses, third-party sharing, retention/deletion policy, and how to withdraw consent
- Must secure user consent before collecting any user or usage data (even anonymised data)
- Purpose strings in `Info.plist` must clearly and completely explain the data use
- Only request permissions relevant to core functionality (**data minimisation**)
- Must not trick or manipulate users into granting unnecessary data access
- If app supports account creation, must also support **in-app account deletion**

#### 5.1.2 Data Use and Sharing

- Must not use, transmit, or share personal data without explicit permission
- Must use **App Tracking Transparency APIs** to request tracking consent
- Cannot require users to enable push notifications, location, or tracking to access the app
- Data collected for one purpose may not be repurposed without further consent
- Do not build contact databases from Contacts or Photos APIs
- HealthKit, HomeKit, ARKit, ClassKit, and facial/depth mapping data must **not** be used for advertising or data mining

#### 5.1.3 Health and Research

- Health/fitness data may not be used for advertising or data mining
- Must not write false data to HealthKit
- Human subject health research must obtain informed consent and ethics board approval

#### 5.1.4 Kids

- Must comply with COPPA, GDPR, and all applicable regulations
- Apps intended for kids must not include third-party analytics or ads (with narrow exceptions)
- Apps collecting data from minors must include a privacy policy

#### 5.1.5 Location Services

- Only use Location Services when directly relevant to core functionality
- Must obtain consent before collecting/transmitting location data
- Must include a purpose string explaining why location access is needed

### 5.2 Intellectual Property

- All content must be created by you or licensed for your use
- Do not use protected trademarks, copyrights, or patented ideas without permission
- Do not include misleading, false, or copycat metadata
- Get explicit authorisation before streaming or downloading third-party media content

### 5.3 Gaming, Gambling, and Lotteries

- Real money gaming apps must have regulatory licensing and be geo-restricted
- Must be free on the App Store
- May not use in-app purchase to buy credit/currency for real money gaming

### 5.4 VPN Apps

- Must use `NEVPNManager` API; offered only by organisations (not individuals)
- Must clearly disclose data collection before purchase or use

### 5.5 Mobile Device Management

- MDM capability must be requested from Apple
- Only available to commercial enterprises, educational institutions, or government agencies

### 5.6 Developer Code of Conduct

- Treat all App Store reviewers and customers with respect
- Do not manipulate ratings, charts, reviews, or referrals
- Use Apple's provided API (`SKStoreReviewRequestAPI`) for review prompts — custom prompts are not allowed
- Developer identity and business information must be accurate and up to date
- Maintain high app quality; excessive negative reviews or refund requests may affect Developer Program membership

---

## Common Rejection Reasons (Top Causes)

| Reason | Guideline |
|---|---|
| Crashes or bugs | 2.1 |
| Broken or missing links (support URL, privacy policy) | 2.1, 5.1 |
| Placeholder content | 2.1 |
| Missing demo account / backend not live during review | 2.1 |
| Privacy policy missing, incomplete, or inaccessible | 5.1.1 |
| Unclear or missing permission purpose strings | 5.1.1 |
| Inaccurate screenshots | 2.3 |
| Substandard or non-native UI | 4.2 |
| Missing Sign in with Apple when third-party login is used | 4.8 |
| Requiring account creation to use basic app features | 5.1.1(v) |
| No in-app account deletion when account creation is offered | 5.1.1(v) |
| IAP used incorrectly or features unlocked without IAP | 3.1.1 |
| Metadata does not match actual app experience | 2.3 |

---

## Expo / React Native Specific Considerations

These are additional points relevant to shipping a React Native / Expo app through App Store review:

1. **OTA Updates (Expo Updates / EAS Update):** Over-the-air updates may only deliver bug fixes and minor feature changes. OTA updates that introduce **significant new functionality** violate Guideline 2.5.2 (no runtime code execution that changes features). Stick to bug fixes and copy/asset changes via OTA.

2. **Permissions:** Every permission usage description key in `Info.plist` (e.g. `NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription`) must be present and contain a clear, honest purpose string. Missing or vague strings are a top rejection trigger.

3. **App Transport Security (ATS):** All HTTP connections must be HTTPS. Any `NSAppTransportSecurity` exceptions in `Info.plist` must be documented and justifiable — Apple scrutinises these.

4. **WebView:** If using a `WebView` component, it must use WebKit (WKWebView). Third-party browser engines require an entitlement.

5. **Background Modes:** Only declare background modes your app actually uses in `Info.plist`. Declaring unused modes (e.g. `audio`, `location`) without implementation is a flag for review.

6. **Sign in with Apple:** Required if any third-party social login is offered as primary account setup (Guideline 4.8).

7. **Account Deletion:** If your app supports account creation (e.g. registration/login), it must also provide a clear in-app path to delete the account (Guideline 5.1.1(v)).

8. **Privacy Nutrition Labels:** Complete the App Privacy questionnaire in App Store Connect accurately. Every SDK and library that accesses user data must be declared (including analytics SDKs like Sentry, Amplitude, Firebase, etc.).

9. **IPv6:** Test that all network calls work on an IPv6-only network (Guideline 2.5.5). Use Apple's IPv6 network testing guide.

10. **Age Rating:** Answer all age rating questions in App Store Connect honestly. For StarterKit (a game management app), consider content about violence, gambling mechanics, or user-generated content carefully.

11. **Push Notifications:** The app must function without push notifications. Marketing push notifications require explicit opt-in consent (Guideline 4.5.4).

12. **App Store Connect Metadata:** App name ≤ 30 characters. Description, keywords, and screenshots must accurately represent the current version.

---

## PR Checklist

Use this checklist for every pull request that touches `apps/expo/`:

```text
### Apple App Store Compliance (Expo PRs only)
- [ ] No new or changed permissions without updated `Info.plist` purpose strings
- [ ] No OTA-delivered code that introduces significant new functionality (EAS Update safe for bug fixes only)
- [ ] All network requests use HTTPS; any ATS exceptions are documented
- [ ] No runtime-downloaded code that changes app features (Guideline 2.5.2)
- [ ] If account creation is added/modified: in-app account deletion path exists
- [ ] If third-party social login added: Sign in with Apple also offered
- [ ] Screenshots / metadata updated if UI changes are material
- [ ] Push notification usage (if changed) requires explicit user opt-in
- [ ] No use of private/undocumented APIs
- [ ] No background mode declarations added without actual implementation
- [ ] Reviewed against docs/apple-app-store-review.md for any feature-specific rules
```

---

## References

- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (live, authoritative)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [App Store Connect Help](https://developer.apple.com/help/app-store-connect/)
- [Requesting Permission (Privacy)](https://developer.apple.com/documentation/uikit/protecting_the_user_s_privacy)
- [App Tracking Transparency](https://developer.apple.com/documentation/apptrackingtransparency)
- [Offering Account Deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- [Sign in with Apple](https://developer.apple.com/sign-in-with-apple/)
- [TestFlight Beta Testing](https://developer.apple.com/testflight/)
- [EAS Update (Expo)](https://docs.expo.dev/eas-update/introduction/)
