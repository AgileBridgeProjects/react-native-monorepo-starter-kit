# OTA Updates (EAS Update) — The Law

How StarterKit ships JS-only changes to installed mobile builds without a store release,
and why every rule below exists. This system was ported wholesale from a sibling production
project, where raw `eas update` calls failed silently for weeks: a removed CLI flag
broke publishing outright, and fingerprint-based runtime versions made delivery
nondeterministic. Do not "simplify" this setup back to raw `eas update` calls.

## The one command

```bash
# From apps/expo — CI and humans use the same entry point:
node scripts/publish-ota.mjs --profile <dev|uat|production> [--message "…"] [--dry-run]
```

The script does three things no raw `eas update` call does:

1. **Env sync** — pushes the eas.json build-profile `env` block to the matching EAS
   server environment, then publishes with `--environment`. `eas update` bundles with
   the *server* environment's vars only (local `.env` is ignored on SDK 55+), so
   without the sync an OTA bundle can bake in a different `EXPO_PUBLIC_API_URL` than
   the installed builds. eas.json stays the single source of truth.
2. **Runtime guardrail** — compares the resolved `runtimeVersion` against the newest
   finished build on the channel per platform. Platforms that match get the update;
   if none match the script **skips** with a GitHub warning annotation and remediation
   steps (exit 0, not a red failure) instead of publishing an update that zero devices
   would receive — a pending build is an operational state, not an error in the push.
3. **Stable flags** — the eas-cli invocation lives in one place. The CLI is pinned in
   every workflow (`eas-version:` in `.github/workflows/deploy-mobile-update*.yml`)
   because an unpinned `latest` silently broke publishing for weeks when `--profile`
   was removed. Bump the pin deliberately and test with `--dry-run`.

## Channel / branch / environment map

| Git branch | Update channel | EAS environment | Installed via |
|---|---|---|---|
| `dev` | `dev` | `preview` | TestFlight / Play internal |
| `uat` | `uat` | `uat` (custom) | TestFlight / Play internal |
| `main` | `production` | `production` | App Store / Play Store |

Pushes to `dev` trigger `.github/workflows/deploy-mobile-update.yml`; pushes to `uat`
trigger `deploy-mobile-update-uat.yml`. The `production` channel is **not** on a push
trigger — see § Shipping an OTA to production. Dev-client profiles (`simulator`,
`dev-client`) have no OTA: they run Metro, and expo-updates is disabled outright in
`app.config.js`.

> **EAS environments must exist.** `eas env:push` targets the environment named in
> `PROFILE_ENVIRONMENTS` inside `scripts/publish-ota.mjs` (`dev→preview`, `uat→uat`,
> `production→production`). `preview` and `production` are built-in; the `uat`
> environment is custom and must be created on the EAS project before the first uat
> publish. The `EXPO_TOKEN` secret must be set on each GitHub environment.

### Path filter is coarse — a second gate narrows it

The workflow `paths:` filter includes root `package.json`/`package-lock.json` so a real
Expo/shared dependency bump isn't missed. But this is an npm-workspaces monorepo with
one shared lockfile, so *any* dependency change anywhere (backend tooling, web-only
deps) rewrites the root lockfile too — the path filter alone fired on nearly every
merge, not just JS-only Expo changes. A second step,
`node scripts/check-ota-relevant-changes.mjs --before <sha> --after <sha>`, re-diffs
the same push and only lets the EAS setup/publish steps run (`if: steps.ota-relevant
.outputs.relevant == 'true'`) when `apps/expo/**`, `packages/shared/**`, or an
`apps/expo`/`packages/shared` entry inside `package-lock.json` actually changed.

## Shipping an OTA to production

`main` is **not** a push trigger for `deploy-mobile-update.yml`. Production OTA is a
`workflow_dispatch` from `main` with a typed confirmation phrase. Nothing reaches live
App Store / Play Store users without someone choosing to send it.

### Why — the Apple line

App Store Review Guideline 2.5.2 and the EAS Update terms permit over-the-air JS
delivery only while it does not **materially change the app's features or purpose**
from what was reviewed. A push trigger cannot tell a copy tweak from a feature drop,
so it would publish both, and the second is a guideline breach nobody decided to take.
The judgement call is the gate, and a judgement call needs a human.

### What may ship over the air

| Change | Route |
|---|---|
| Copy, i18n, styling, layout fixes | ✅ OTA |
| Bug fix in existing JS logic | ✅ OTA |
| New screen or feature inside an already-reviewed flow | ✅ OTA — but say so in the dispatch message |
| A new user-facing feature, a new flow, a new purpose for the app | ❌ store submission |
| Anything changing pricing, subscriptions, or account/data handling | ❌ store submission |
| Anything on the native surface (deps, `patches/`, `app.json`, `app.config.js`, plugins, native config) | ❌ full build + `RUNTIME_VERSION` bump — see below |

When in doubt it is a store submission. An OTA that Apple decides was a material
change puts the whole app's standing at risk; a store submission costs a review cycle.

### Runbook

> **Prerequisite — the dispatch route only exists on the ref you dispatch from.**
> `workflow_dispatch` reads the workflow file as it exists on the selected branch. If
> *Run workflow* on `main` offers no `confirm` input, `main` is behind `dev` and this gate
> has not been promoted there yet. Promote first — there is no other route to the
> `production` channel.

1. **Decide.** Read the table above against the actual diff on `main`. If it is a
   store submission, stop — dispatch `Deploy Mobile (prod)` instead and promote in the
   store consoles.
2. **Check the runtime.** `runtime` in `apps/expo/version.json` must match the
   newest finished production build per platform, or no installed device receives the
   update. `publish-ota.mjs` verifies this and green-skips rather than publishing into
   the void — a "skipped" run means a full build is needed first, not that it worked.
3. **Dispatch.** Actions → *Deploy Mobile (OTA update)* → Run workflow → branch `main` →
   type `publish-to-production` in the confirm input. Any other branch or any other
   phrase fails the run on its first step.
4. **Verify.** Expo dashboard → project → Updates → `production` branch: the new update
   group should list both platforms on the expected `runtimeVersion`. Then open the store
   app on a device, background it, reopen it — the update applies on the next cold start
   (see § In-app behaviour).
5. **If it is wrong**, publish the previous commit the same way — there is no "unpublish".
   Roll forward, never wait.

### Who approves

Whoever dispatches it owns it. The `production` GitHub environment is still attached to
the job, so adding required reviewers there is the one-click escalation if that changes.

### Store builds are dispatch-only too

`deploy-mobile-prod.yml` (production iOS and Play binaries) is also `workflow_dispatch`
only, for the same reason. An earlier version fired on every `main` push touching
`apps/expo/**`, which burned EAS builds and pushed unasked-for binaries into TestFlight
and Play internal.

The dispatch takes a `release-notes` input and stages each store release — an App Store
version with the build attached, a Play production release committed with
`changesNotSentForReview` — so the only console action left is the submit button.
`docs/deployment/prod-mobile-store-setup.md` has the detail.

> **Repo setup, not code.** The `production` GitHub environment must carry a
> deployment-branch policy of `main` only. That policy, not anything in the workflow
> file, is what stops a production binary building from a feature branch. Check it with
> `gh api repos/:owner/:repo/environments/production/deployment-branch-policies`.

### Bootstrapping a fresh fork

`mobile-version.mjs` counts commits since the highest `mobile-v*` tag, and a fresh fork
has none. Seed one before the first Expo PR, or the check has no anchor:

```bash
git tag -a mobile-v1.0.0 -m "baseline" && git push origin mobile-v1.0.0
```

`tag-mobile-version.yml` maintains the tag from there.

## Versioning — `apps/expo/version.json`

The mobile app has two version numbers and neither is chosen by a person:

| Key | What it is | Moves when |
|---|---|---|
| `production` | Store version (`CFBundleShortVersionString` / `versionName`) applied to the **`production` profile only** | The branch's Conventional Commits since the last release say so |
| `runtime` | expo-updates `runtimeVersion` shared by every OTA profile | The branch touches the native surface |

`dev` / `uat` / `dev-client` keep app.json's frozen `1.0.0` on purpose: they are separate app
records with separate histories, and their build numbers already `autoIncrement` (`eas.json`,
`appVersionSource: "remote"`) so testers can tell builds apart. Only the store lineage needs a
meaningful version.

### The store lineage starts clean

A fresh fork has submitted nothing to a store, so there is no released version to stay
above: `version.json` ships at `production: "1.0.0"`, `mobile-v1.0.0` is seeded by hand as
the never-shipped baseline (see § Bootstrapping a fresh fork), and `RELEASED_STORE_VERSION`
in `mobile-version.mjs` is `null`. Fill that constant in at the first real store release and **move
it at every store release after that**; from then on the script lifts any derived version at or
below it, because Apple rejects a version string that is not higher than the released one. It
is a hand-maintained floor, deliberately separate from the `mobile-v*` tag: the tag records
"reached `main`", the constant records "a store accepted it", and the two can differ.

### How a bump happens

`scripts/mobile-version.mjs` is the only writer. One piece of logic, three call sites:

1. **`/pr`** (`.agents/commands/pr.md` step 1.4) runs `apply` and commits `version.json` on its
   own as `chore(release): mobile X.Y.Z, runtime A.B.C` before pushing — the automatic path.
2. **`.husky/pre-push`** runs `check --if-mobile` and refuses the push with the exact command
   when the file is behind. `npm run version:apply -w apps/expo` fixes it. `--if-mobile` makes
   it a no-op for branches that touch none of `apps/expo/`, `packages/shared/` or `patches/`,
   and `MOBILE_VERSION_SKIP="reason"` is the deliberate escape, mirroring `E2E_SKIP`.
3. **`ci-expo.yml`** runs `check` against the PR's base — the backstop. Note it is gated
   twice: the job needs `draft == false` and an Expo-relevant path, and `/pr` opens every PR
   as a draft. So the backstop only arrives when the PR is marked ready, and the pre-push hook
   is what covers it before then.

`dev` and `main` both require a PR, so nothing can commit a bump *after* a merge — the bump
lives inside the PR that earns it. That is also why it is right before any build is cut: `main`
only ever receives a `version.json` that the last mobile PR into `dev` already settled.
`scripts/check-standards.mjs` asserts all of this wiring.

### The rules the script applies

**`production`** = `bump(last release, highest level since it)` where

- *last release* is the highest `mobile-v*` tag. `tag-mobile-version.yml` creates one whenever
  `version.json` reaches `main`, so everything after the tag is unreleased. With no tag at all
  the base branch's `version.json` is the anchor and only this branch's commits count, which
  inflates every PR — that is why `mobile-v1.0.0` was seeded before the scheme went live.
- only commits touching `apps/expo/` or `packages/shared/` count — a backend `feat` does not
  bump the app; merge commits are ignored.
- `feat!:` / `BREAKING CHANGE:` → major, `feat` → minor, `fix` / `perf` / `revert` → patch,
  `chore` / `docs` / `refactor` / `test` / `ci` / `build` → nothing. `.husky/commit-msg`
  enforces Conventional Commits, so the input is trustworthy.

Anchoring on the *release* rather than on the PR's merge-base is what keeps the number sane:
ten `feat` PRs in one cycle produce **one** minor bump (`1.0.0 → 1.1.0`), and only the PR that
raises the pending level touches `version.json`, so merge conflicts on it are rare. A later
`feat!` lifts the pending `1.1.0` to `2.0.0`.

A hand-set value is kept only up to **one level above** the derived target. A bigger jump is
refused: the version ratchets one way and Apple never accepts a lower string afterwards, so a
fat-fingered `55.0.1` would be permanent. Fix a rejected value with `apply`.

**`runtime`** = base runtime **+1 patch** when the branch touches the native surface (the list is
in § When the runtime moves). This is **per branch, not per release**: dev-channel builds are
cut ad hoc, so two native PRs in one cycle need two bumps or an OTA could reach the intermediate
build with JS it cannot run. `version.json` itself is not a native path — a store version has no
effect on JS/native compatibility.

Two rules follow from the runtime, both enforced:

- **A runtime bump drags the production version with it.** A new runtime means a full build must
  ship, and a store build needs a version Apple has not released. Without this, a cycle of
  `chore`/`refactor` commits plus a native change would rebuild the binary and resubmit it under
  the already-released version string.
- **Promotion PRs skip the runtime half.** A `dev → uat` or `uat → main` PR carries the cycle's
  native files in its diff but introduces no native change of its own — `dev` already accounted
  for them. Without the exemption a promotion after a `[js-only]` cycle would demand a bump
  nobody owes, with no correct way to satisfy it. The exemption is judged on **both** refs: a
  hotfix branched off `main` shares the base but is new work, so it still owes a bump. An
  unreadable head ref counts as new work, because the safe fallback is to demand the bump.

`[js-only]` in the PR title (`--js-only` / `JS_ONLY=true` locally) waives the **runtime half
only**, for a native-path change that is verifiably JS-only. The production half is never waived.

**Every runtime bump is stamped.** Two native PRs cut from the same `dev` derive the same next
runtime, and before the stamp they wrote the byte-identical line, so git merged them silently
and `dev` carried one runtime for two different binaries. `apply` now also writes
`runtimeBump`, the branch's own HEAD, whenever it raises the runtime. The two lines differ, the
second PR hits a real merge conflict on `version.json`, and its author re-derives. Nobody else
is asked to rebase: a PR that did not bump the runtime never writes the marker. This is why the
repo does **not** need GitHub's "require branches to be up to date" rule for this. `check`
refuses a runtime raised by hand without a fresh marker, and `apply` repairs it.

### Release tags

`tag-mobile-version.yml` tags `main` with `mobile-v<production>` on every push that changes
`version.json`, refuses a value that is not `MAJOR.MINOR.PATCH`, and never moves an existing tag.
Tags are not branches, so `GITHUB_TOKEN` suffices and no ruleset needs a bypass actor. The tag
means "this version reached `main`"; the store submission itself is still a manual step.

### Edge cases you will actually meet

- **Hotfix straight to `main`.** Branch off `main` and push with
  `MOBILE_VERSION_BASE=origin/main` (the hook defaults to `origin/dev`). The fix bumps patch
  above the tag, the tag workflow records it, and the back-merge carries it to `dev`, where the
  next PR anchors on it. A hotfix is **not** treated as a promotion despite its base, so a
  native change in one still owes a runtime bump. Until `main` has received its first promotion
  the seeded tag is not in `main`'s ancestry, so a hotfix branch will count more commits than it
  should.
- **`version.json` conflicts when you merge `dev` in.** Another native PR landed first and its
  `runtimeBump` differs from yours. That is the mechanism working. Take `dev`'s copy, finish
  the merge, then re-derive:

  ```bash
  git checkout --theirs -- apps/expo/version.json && git add apps/expo/version.json
  git commit --no-edit
  npm run version:apply -w apps/expo
  git commit -m "chore(release): mobile X.Y.Z, runtime A.B.C" -- apps/expo/version.json
  ```

  `apply` sees `dev`'s new runtime as the base and derives the one above it.
- **A promotion PR fails the check.** `dev → uat` and `uat → main` run the same check. It fails
  only when `main` was hotfixed to a version `dev` also used — two different `1.0.3`s. Run
  `apply` on `dev` in a small PR and promote again.
- **A branch that predates `version.json`.** `check` says the file is missing: merge `dev` in.
- **You need a major.** Write `feat!:` (or a `BREAKING CHANGE:` footer). A major on a store
  listing should be a commit someone wrote on purpose, not a dropdown default.

### Known gaps

- **A mistyped `runtime` is permanent.** `production` is capped at one level above the derived
  target, but `runtime` is not, and it deliberately never ratchets down: lowering a runtime is
  strictly worse than a typo, because it silently strands every installed build. A merged
  `55.0.1` therefore blocks OTA until a full build ships per channel. Read the number in the
  `chore(release)` commit before approving it.
- Dependencies outside `apps/expo/package.json` do not trigger a runtime bump: a native module
  added to `packages/shared/package.json`, a root `overrides` entry, or a lockfile-only change.
  The last is the widest: most expo dependencies are range-specified, so `npm update` or a
  Dependabot lockfile PR can move a native module's resolved version with `package.json`
  untouched. `package-lock.json` is left off the native surface on purpose — the lockfile
  changes on every dependency PR in the monorepo, and demanding a full EAS build per channel for
  each web- or backend-only bump would teach people to reach for `[js-only]` by reflex. When a
  lockfile-only PR could plausibly move a native module, bump by hand: touch a native-surface
  file in the same PR, or run `apply` after editing `runtime` up one patch.
- The pre-push hook validates `HEAD`, not the refs being pushed.
- `[js-only]` is a plain substring match on the PR title and can be edited away after the check
  ran; `pull_request` does not fire on `edited`.

## runtimeVersion — manual, never fingerprint

`runtime` in `apps/expo/version.json` (surfaced by `app.config.js` as `RUNTIME_VERSION`) is a
plain string shared by all OTA profiles, moved by `scripts/mobile-version.mjs` (§ Versioning).
**Do not switch back to `runtimeVersion: { policy: 'fingerprint' }`**:
fingerprint hashes are not reproducible across the machines involved (EAS build
servers vs GitHub runners vs Windows laptops), so updates get silently rejected by
installed builds. That irreproducibility was the root cause of "OTA doesn't work".

### When the runtime moves

`mobile-version.mjs` bumps it (see § Versioning) when a PR touches the native surface:

- `apps/expo/app.json` or `app.config.js` (plugins, permissions, schemes, icons, …)
- `apps/expo/plugins/**` or `apps/expo/modules/**`
- any `google-services*.json` / `GoogleService-Info*.plist`
- a dependency section of `apps/expo/package.json` (a `scripts` edit does not count)
- a build profile's `env`, `ios` or `android` block in `apps/expo/eas.json` (a `submit`, `cli`
  or `channel` edit does not count). `EXPO_PUBLIC_DEEP_LINK_HOST` is the reason: it is set only
  there, and `app.config.js` bakes it into iOS `associatedDomains` and the Android
  intent-filter host, both compiled into the binary
- anything under the root `patches/` (patch-package can change a native module)

Every entry was checked against `git check-ignore` before it was listed: a pattern for a
gitignored file can never match a diff and would be dead code that reads like coverage.

`patches/` sits outside `apps/expo/`, so it needs two extra pieces of wiring to be reachable at
all: `MOBILE_SCOPE` in `mobile-version.mjs` (what `--if-mobile` treats as a mobile branch) and
the `expo` paths filter in `ci-expo.yml`. Both are asserted by `check:standards`. Add a new
mobile tree to both or the pattern becomes unenforceable.

When unsure whether a change is native, let it bump — a needless bump costs one build; a missing
bump ships JS that crashes older binaries at startup. `[js-only]` in the PR title exists for the
case you can verify (a `scripts` edit, a comment) and waives the runtime half only.

**Order matters.** The bump is in the PR, so it is on `dev` / `main` before any build is cut
from them. Do not cut builds from a branch whose PR has not merged.

### After a bump

OTA delivery to existing installs **stops** until a full EAS build with the new
runtime ships on each channel (`Deploy Mobile` workflows). Until that build ships, the
OTA workflow **skips with a warning** (green run, not a red failure) on each push —
this is expected, not a broken pipeline. Sequence:

1. Merge the PR with the bump.
2. Run the Deploy Mobile workflow for the affected channel(s) — testers/users install
   the new build.
3. OTA publishing resumes automatically on the next push.

### The runtime must never be conditional on the build profile

EAS resolves `runtimeVersion` **twice** — once on the machine that starts the build, once
on the builder — and fails the build when the two disagree:

```text
Runtime version calculated on local machine not equal to runtime version calculated during build.
```

The builder always has `EAS_BUILD_PROFILE` set. Whether the profile's `eas.json` `env`
block reaches the *local* evaluation has proven unreliable across eas-cli versions — CI
(pinned 20.5.1) has always been fine, a locally installed CLI has not — so anything in
`app.config.js` keyed off it can resolve one way on the builder and another on a laptop,
and the build dies before signing. Dev-client builds carried a fixed `dev-client` runtime
label for exactly this reason and hit exactly this failure; they now share the one runtime
and switch expo-updates off instead.

Every profile therefore resolves the same `runtimeVersion`, including with no
`EAS_BUILD_PROFILE` set at all. Keep it that way.

The fields that are still profile-keyed carry the same exposure, so **start every local
build through the npm scripts** (`npm run build:dev:ios -w apps/expo`), which go via
`scripts/eas-build.mjs` and export the variable before the CLI reads the config. Resolved
against a no-profile local evaluation, the drift is:

| Profile | Drifts locally without the variable |
|---|---|
| `development`, `development-device` | Xcode target (`StarterKitMobileDev`), iOS bundle id, Android package |
| `uat` | Xcode target (`StarterKitMobileUAT`), iOS bundle id, Android package |
| `huawei-dev`, `huawei-dev-client`, `huawei-uat` | Xcode target, Android package |
| `production` | iOS bundle id (`com.starterkit.ios`), Android package |
| `preview`, `e2e` | nothing — they happen to match the default |

A target-name drift fails the build outright ("Could not find target … in project.pbxproj").
An identifier drift is worse in principle: it points the build at another app's credentials.

dev/uat/preview keep app.json's frozen `1.0.0` on purpose: separate app identifiers, separate
histories, and their build numbers already `autoIncrement` (`eas.json`, `appVersionSource:
"remote"`) so testers can tell builds apart. Only the store lineage needs a meaningful version.

## OTA vs full build — decision table

| Change | OTA enough? |
|---|---|
| TS/TSX, styling, i18n copy, assets imported by JS | ✅ yes |
| `EXPO_PUBLIC_*` env value in eas.json | ✅ yes (script syncs it) |
| New/upgraded/removed npm dependency | ❌ full build + runtime bump |
| app.json / app.config.js / plugin config | ❌ full build + runtime bump |
| Expo SDK upgrade, native module, store metadata | ❌ full build + runtime bump |

## In-app behaviour

`hooks/use-ota-updates.ts` checks on launch and on foreground (throttled to 5 min),
downloads in the background, and `src/lib/update-banner.tsx` (mounted in the root
layout) shows a full-screen, non-dismissible "Restart now" prompt once an update is
downloaded — the Android hardware back button is blocked too. If the user never
interacts, the update applies on the next cold start regardless. Dev clients no-op.

## Verifying an update end-to-end

1. `node scripts/publish-ota.mjs --profile dev --dry-run` — confirms the runtime
   matches the latest builds (nothing is published).
2. Publish for real (or push to `dev`), then on a device with the installed build:
   background → foreground the app, wait for the prompt, tap **Restart now**.
3. Confirm on the [Expo updates dashboard](https://expo.dev/accounts/YOUR-EXPO-ACCOUNT/projects/starterkit/updates)
   that the update group's runtime equals the build's runtime.
