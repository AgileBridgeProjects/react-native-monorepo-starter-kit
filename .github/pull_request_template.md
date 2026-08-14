## What

<!-- One sentence: what does this PR do? -->

## Why

<!-- Why is this change needed? Link to spec or issue if applicable. -->

Closes #

## How

<!-- Brief description of the approach. Skip if obvious from the diff. -->

## E2E

<!--
Run the specs your diff touches, then paste the line it prints below:

    npm run e2e:affected

The `E2E Attestation` check verifies the SHA matches this PR's head commit, so
re-run and re-paste after any new push. If the runner says no specs were selected,
say so here instead — the check will pass on its own.

No coverage for your change? Add a rule to e2e/scripts/affected-specs.mjs.
Genuinely not applicable? Apply the `skip-e2e` label and explain why here.
-->

```text
e2e: sha=... result=passed specs=... at=...
```

## Checklist

- [ ] Follows the [coding conventions](../docs/contributing.md)
- [ ] Uses design tokens from `constants/tokens.ts` (no hardcoded colors/spacing)
- [ ] Uniwind `className` used for styling (no `StyleSheet.create` in pages)
- [ ] Named exports used (no default exports for reusable components)
- [ ] `@/` alias used for internal imports
- [ ] Tests added/updated in `__tests__/`
- [ ] `npm run check` passes locally
- [ ] `npm run e2e:affected` passes and the line is pasted above (or `skip-e2e` labelled, with a reason)

## App Store Compliance

<!-- Complete this section for every PR that touches apps/expo/ — skip for backend-only PRs -->

### Apple App Store

- [ ] No new/changed permissions without updated `Info.plist` purpose strings
- [ ] No OTA-delivered code that introduces significant new functionality (EAS Update is safe for bug fixes only — Guideline 2.5.2)
- [ ] All network requests use HTTPS; any ATS exceptions are documented
- [ ] If account creation added/modified: in-app account deletion path exists (Guideline 5.1.1v)
- [ ] If third-party social login added: Sign in with Apple is also offered (Guideline 4.8)
- [ ] No new background mode declarations without actual implementation
- [ ] Push notification changes (if any) require explicit user opt-in
- [ ] No use of private or undocumented Apple APIs
- [ ] Reviewed against [docs/apple-app-store-review.md](../docs/apple-app-store-review.md) for feature-specific rules

### Google Play Store

- [ ] No new permissions added to `AndroidManifest.xml` that are not actively used
- [ ] Dangerous permissions have runtime request with a clear user-visible rationale
- [ ] All network requests use HTTPS; no cleartext HTTP in production
- [ ] If account creation added/modified: in-app account deletion path exists
- [ ] Digital goods sold in-app use Google Play Billing (not custom payment flows)
- [ ] Data Safety form in Play Console will need updating if new data-collection SDKs are added
- [ ] OTA update does not introduce significant new native functionality
- [ ] Target SDK version meets current Play policy minimum (API 35 for new apps)
- [ ] FCM push notification changes (if any) have `google-services.json` correctly configured
- [ ] Reviewed against [docs/google-play-store-review.md](../docs/google-play-store-review.md) for feature-specific rules

### Huawei AppGallery _(skip if not targeting AppGallery distribution)_

- [ ] No new permissions added to `AndroidManifest.xml` that are not actively used
- [ ] Sensitive permissions have clear user-facing purpose rationale before requesting
- [ ] All network requests use HTTPS; no cleartext HTTP in production
- [ ] If account creation added/modified: in-app account deletion path exists
- [ ] Push notification changes use HMS Push Kit (not FCM only) for Huawei compatibility
- [ ] GMS-dependent APIs (Maps, Location, Sign-In) have HMS equivalents or graceful fallback
- [ ] Digital goods sold in-app use HMS IAP for AppGallery builds
- [ ] Privacy policy is accessible from within the app (not just the store listing)
- [ ] `agconnect-services.json` is present and updated if new HMS services are added
- [ ] Reviewed against [docs/huawei-appgallery-review.md](../docs/huawei-appgallery-review.md) for feature-specific rules

## Screenshots / Screen recordings

<!-- Mobile app: include before/after screenshots for any UI changes -->
<!-- Include iOS and Android if the change has platform-specific rendering -->
