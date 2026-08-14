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

Pushes to `dev`/`main` trigger `.github/workflows/deploy-mobile-update.yml`; pushes to
`uat` trigger `deploy-mobile-update-uat.yml`. Dev-client profiles (`simulator`,
`dev-client`) have no OTA (they run Metro).

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

## runtimeVersion — manual, never fingerprint

`RUNTIME_VERSION` in `apps/expo/app.config.js` is a manual string shared by all OTA
profiles. **Do not switch back to `runtimeVersion: { policy: 'fingerprint' }`**:
fingerprint hashes are not reproducible across the machines involved (EAS build
servers vs GitHub runners vs Windows laptops), so updates get silently rejected by
installed builds. That irreproducibility was the root cause of "OTA doesn't work".

### When to bump RUNTIME_VERSION

Bump on **any native-surface change** — CI enforces this on PRs via
`scripts/check-runtime-version.mjs` when these paths change:

- `apps/expo/package.json` (any dependency change)
- `apps/expo/app.json` or `app.config.js` (plugins, permissions, schemes, icons, …)
- `apps/expo/plugins/**` or `apps/expo/modules/**`
- `google-services.json` / `GoogleService-Info*.plist`

If the change is verifiably JS-only (e.g. a `devDependency` bump), add `[js-only]` to
the PR title to skip the check. When unsure, bump — a needless bump costs one build; a
missing bump ships JS that crashes older binaries at startup.

### After a bump

OTA delivery to existing installs **stops** until a full EAS build with the new
runtime ships on each channel (`Deploy Mobile` workflows). Until that build ships, the
OTA workflow **skips with a warning** (green run, not a red failure) on each push —
this is expected, not a broken pipeline. Sequence:

1. Merge the PR with the bump.
2. Run the Deploy Mobile workflow for the affected channel(s) — testers/users install
   the new build.
3. OTA publishing resumes automatically on the next push.

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
3. Confirm on the [Expo updates dashboard](https://expo.dev/accounts/agilebridge/projects/starterkit/updates)
   that the update group's runtime equals the build's runtime.
