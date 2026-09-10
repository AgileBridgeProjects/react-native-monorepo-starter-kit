# Production mobile store releases

How `deploy-mobile-prod.yml` gets a build in front of reviewers without ever putting one
in front of users. Read § 1 before changing anything in that workflow.

Related: `docs/standards/ota-updates.md` § Shipping an OTA to production covers the
over-the-air route and when it is the wrong one.

---

## 1. How each store separates "upload" from "release" (the safety model)

| Store | Upload target | Can an upload ever reach live users? | Release action (manual) |
|---|---|---|---|
| **Apple App Store** | TestFlight via App Store Connect | **No — structurally impossible.** Uploaded builds sit in TestFlight. Going live requires: create a version on the app record → attach build → submit for review → release. Each is a deliberate ASC action. | Create version → submit with **"Manually release this version"** → press Release after approval |
| **Google Play** | A **testing track** (internal/closed) | **Not without a deliberate production write.** Tracks are isolated; internal-track releases reach only listed testers. `eas.json` pins the production submit profile to the `internal` track, so `eas submit` cannot reach the live track at all. | Play Console → Publishing overview → **Send changes for review** |

The target state: a dispatch produces store-ready binaries in TestFlight and the Play
internal track — reviewed-adjacent, promotable in minutes — and the *only* way either
goes live is a human in the store console.

Everything below exists to keep that true while removing the busywork around it.

---

## 2. Staged store releases

Without staging, the release ritual per store is four or five console clicks: pick the
build, create the version/release, type the version string, paste the notes.
`deploy-mobile-prod.yml` does all of that, and the only action left per store is the
submit button.

| Store | What the pipeline stages | Your one click |
|---|---|---|
| **Apple** | `scripts/asc-stage-version.mjs` waits for ASC to finish processing the TestFlight build, finds or creates the App Store version record for the build's marketing version (renaming a leftover version in preparation if there is one — ASC allows only one), attaches the build, writes What's New on every localization (copying them from the live version if ASC has not), and copies the App Review information (demo account, notes, contact) forward when the new version has none. `releaseType` is `AFTER_APPROVAL`, the ASC UI default. | App Store Connect → the version → **Add for Review** → Submit |
| **Play** | `scripts/play-stage-release.mjs` opens an edit, checks the versionCode is among the uploaded bundles, writes a `completed` production release with the notes on every listing language, validates, and commits with **`changesNotSentForReview=true`**. | Play Console → Publishing overview → **Send changes for review** |

**Release notes** come from the workflow's `release-notes` input. Leave the default for a
maintenance release, type real notes at dispatch time for a feature release, or leave the
default and edit the text in each console before submitting — the pipeline writes the
notes, it does not lock them. Blank notes fail preflight, and so do notes over 500
characters (the Play cap; Apple allows 4000, and one dispatch writes both stores).

### What holds the safety model up

- **Nothing submits for review from CI.** The ASC script never creates a review
  submission and the Play script never commits without `changesNotSentForReview=true`.
  Each store's release sits behind a human click. Both guarantees are asserted by
  `scripts/store-release.test.mjs`.
- **The Play service account needs "Release to production"** on the app (Play Console →
  Users and permissions → the service account → App permissions). Writing a release on
  the production track is a production-track write however it is committed. The guarantee
  that matters is the `changesNotSentForReview` flag, not the credential's scope.
- **iOS version records follow the binary.** The App Store version is created for the
  build's own `CFBundleShortVersionString` (`appVersion` from `eas build:list`), not read
  from `version.json`, so the record always matches the build Apple has.
- **Builds are resolved by profile, never `--latest`.** `--latest` picks the newest build
  for the *platform* across the whole EAS project and ignores the profile, which submits
  a uat IPA into the production record when two pipelines overlap. Every submit job runs
  `eas build:list --buildProfile <profile>` and submits by id. The shared
  `deploy-mobile-stores` concurrency group is what keeps "newest finished" unambiguous.

---

## 3. Repo setup this depends on

These live in GitHub settings, not in the repo, and copying the workflow does not create
them.

| Setting | Why |
|---|---|
| A `production` GitHub environment with a **deployment-branch policy of `main` only** | This is the actual gate that stops a production binary building from a feature branch. The workflow's own `environment: production` on every job is what makes GitHub enforce it. Verify with `gh api repos/:owner/:repo/environments/production/deployment-branch-policies` |
| `EXPO_TOKEN` on that environment | Every job |
| `ASC_API_KEY_ID`, `ASC_API_KEY_ISSUER_ID`, `ASC_API_KEY_P8_BASE64` | iOS submit + staging |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_BASE64` | Android submit + staging |
| Repo variables `ASC_APP_ID` and `PLAY_PACKAGE_NAME` | The staging scripts address the store records by id |

`preflight` fails the run and names whatever is missing for the dispatched platform. It
used to green-skip instead, which is worse: you ask for a store build and get a tick.

---

## 4. Failure modes worth knowing

- `stage-ios-version` waits up to 45 minutes for ASC processing and then fails with a
  re-run hint. The upload succeeded, so re-dispatching the workflow would burn another
  build. Re-run the failed job from the Actions UI once the build shows in TestFlight.
- A version string already `WAITING_FOR_REVIEW`, `IN_REVIEW` or live fails the iOS job by
  design. Remove it from review in ASC, or ship a higher `production` in `version.json`.
- `stage-play-release` refuses a versionCode that is not yet among the app's bundles (the
  internal-track submit did not land) and discards its edit on any error, so a failed run
  leaves no half-written release.
- A brand-new app has no live version to copy App Review information from, so the first
  submission still needs the demo account and notes filled in by hand.
- Both scripts accept `DRY_RUN=true`: ASC reads everything and prints the writes it would
  make; Play builds and *validates* the edit, then deletes it.

---

## 5. The whole release

1. Promote to `main`. `tag-mobile-version.yml` tags `mobile-v<production>`.
2. Actions → **Deploy Mobile (prod)** → Run workflow from `main`, choose the platform,
   write the release notes.
3. Wait for green. Binaries are in TestFlight and the Play internal track; both store
   records are staged with the build attached and the notes written.
4. Press the one button in each console.
