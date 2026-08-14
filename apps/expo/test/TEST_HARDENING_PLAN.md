# Expo Unit-Test Hardening Plan — ABC-123 Phase 1

> Goal: unit coverage so robust that a green run is sufficient confidence for a production
> deploy. If anyone adds/moves/changes a button, field, state, or branch, a test fails unless
> the change was intentional and the test was updated with it.
>
> **Scope:** `apps/expo` only (not the admin portal). Tooling: Vitest +
> `@testing-library/react-native` / `react-test-renderer`. Run: `npm run test` from `apps/expo/`.

## Baseline (2026-06-30)

- 91 test files / 612 tests — all green.
- 311 non-ignorable source files; **224 had no matching test** at start of Phase 1.
- Several existing tests are shallow "renders without crashing" smoke checks and must be
  hardened to the bar below (audit column: `harden`).

---

## The Robustness Bar (per file)

Every test file must hold the implementation to account. Use the matrix per file type:

### Screen / page component

- [ ] Renders **every** distinct element via its `testID` / role / copy key (title, every field,
      every button, dividers, helper text). A removed/renamed element fails a test.
- [ ] Every **state**: loading (skeletons), error, empty, success/populated, offline (where applicable).
- [ ] Every **interaction**: each press/submit/toggle fires the correct handler with the correct args.
- [ ] Every **navigation**: asserts exact `router.push/replace` pathname + params.
- [ ] Every **conditional branch** (mode switches, feature flags, role/permission, param-driven copy).
- [ ] Form **validation**: invalid input blocks submit; valid input submits transformed payload.
- [ ] Accessibility: key controls expose label/role/state (`disabled`, `selected`).

### Presentation / application hook

- [ ] Initial state. Every state transition. Success + error of each mutation/query.
- [ ] Side-effects asserted (navigation, store writes, toast, haptics-suppressed-but-called).
- [ ] Edge cases: empty data, nullish inputs, rapid re-renders, stable-input no-reset.

### Game-logic / pure util

- [ ] Every branch + boundary value. Empty/overflow/invalid inputs. Determinism where claimed.

### Datasource / infrastructure

- [ ] Happy path via MSW. Each error status → typed Failure mapping. Request shape (URL, body).

### Component (presentational)

- [ ] Renders all props/variants (`cva`). Conditional children. Press handlers. Disabled/loading.

### Conventions (hard law — from `frontend-mobile.md` + `test/README.md`)

- `describe`/`it`, never bare `test()`. `toBeTruthy()`/`toBeFalsy()`, never `toBe(true/false)`.
- Fixtures from `test/factories/` only. Global mocks from `test/setup.ts` — never re-declare.
- Tests live in `__tests__/` mirroring source 1:1.
- Prefer `testID` registries in each feature's `.copy.ts`. Add registry entries where missing
  (notifications, rewards lack a full registry) so screens are addressable, not text-matched.

---

## Page-by-page roadmap (execution order = user journey + risk)

Status: ✅ done-to-bar · 🟡 exists, needs hardening · ⬜ missing

### 1. Auth (entry gate — highest prod risk)

- ✅ **All 5 screens done to bar:** login-screen (30), forgot-password-screen (13),
  select-organisation-screen (7), otp-verify-screen (12), setup-account-screen (16) — all + snapshots.
- Hooks: ⬜ use-auth, use-change-password, use-complete-setup, use-current-session,
  use-microsoft-sign-in, use-organisations, use-request-password-reset, use-update-display-name,
  use-validate-setup-token, use-dev-bootstrap-phone · ✅ use-google-sign-in, use-phone-confirmation,
  use-finalize-auth-session
- Datasources: ⬜ microsoft-auth, organisations, user-setup · ✅ firebase-auth · ⬜ firebase-error-codes, microsoft-pkce
- Components: ⬜ all 18 (auth-screen-layout, password-field, password-rules-checklist, org-card,
  social/google/microsoft/phone buttons, gradient-cta-button, oauth-loading-overlay,
  provider-conflict-sheet, change-password-section, wave-divider, …)
- Utils: ⬜ auth.utils · Registry: ✅ added `forgotPassword` + `setup` testIDs to `auth.copy.ts`

### 2. Home (landing tab) — 23 untested

- Screen: ✅ home-screen (audit) · Datasources: ⬜ activity, gamification
- Hooks: ⬜ use-activity, use-company-info, use-continue-reading, use-league-change, use-logo-matrix,
  use-recommended-game, use-streak-celebration, use-unseen-xp, use-xp-summary
- Components: ⬜ activity-section, continue-playing-card, continue-reading-card, home-header,
  home-hero, league-section, league-change-overlay(+host), season-stats-cards, season-stats-strip,
  streak-celebration-overlay(+host) · ✅ hero-color-background, media-progress-card,
  native-filtered-image, web-filter, xp-earned-overlay

### 3. Games (core loop) — 38 untested

- Screens: ⬜ game-play-screen · ✅ games-screen (GOLD STANDARD), game-start-screen, game-results-screen
- Question cards (7): ⬜ multiple-choice, fill-in-blank, match-terms, match-the-image,
  identify-in-image, statement-building, word-bucket  ← critical, one per game type
- Hooks: ⬜ use-auto-advance, use-drag-zones, use-tap-answer, use-question-zoom, use-animation-styles,
  use-game-downloads, use-offline-assignments, use-game-assignments, use-loading-phrases
- Stores: ⬜ active-session.store, offline-game.store
- Components: ⬜ game-card(+group), game-play-flow, game-question-dispatcher, game-session-header,
  game-session-sidebar, draggable-option-chip, drag-ghost-chip, confetti/vignette overlays,
  game-submitting-overlay, abandon-game-modal.ios/.android
- Datasource: ⬜ games.datasource · Domain: ⬜ games.failure, sync-error · Util: ⬜ parse-fib-prompt,
  download-question-images

### 4. Learning Centre — 10 untested

- Screens: ⬜ image-viewer, pdf-viewer, video-viewer · ✅ learning-centre, module-cover, module-media, topic-cover
- Hooks: ⬜ use-mark-media-read, use-progress-flush, use-new-topics-count, use-themed-header, use-update-progress
- Store: ⬜ offline-topic.store · Datasource: ⬜ learn.datasource

### 5. Rewards — 8 untested

- Screen: ⬜ rewards-screen · Components: ⬜ achievement-grid, reward-detail-overlay,
  rewards-progress-card, rewards-progress-hero · Hook: ⬜ use-reward-unlock-celebration
- Datasource: ⬜ rewards.datasource · Util: ⬜ utils

### 6. Scoreboard — 10 untested

- Screen: ⬜ category-scoreboard-screen · Components: ⬜ podium-rank-card, trainee-rank-card,
  scoreboard-view, scoreboard-skeleton
- Hooks: ⬜ use-my-rank, use-rank-traversal, use-traversal-orchestration, use-windowed-scoreboard
- Datasource: ⬜ scoreboard.datasource

### 7. Profile / Settings / Help — 13 untested

- Screens: ⬜ edit-profile, help, season-history, settings · 🟡 profile-screen (audit)
- Components: ⬜ season-summary-cards, weekly-activity-section · 🟡 profile-info-card, profile-stats-section (1 test each)
- Hooks: ⬜ use-help, use-profile, use-season-highlights, use-season-history
- Datasources: ⬜ help, profile · Util: ⬜ weekly-activity-chart-layout

### 8. Notifications — 5 untested

- 🟡 notifications-screen (1-test smoke) · Screen detail ✅ (audit)
- Hooks: ⬜ use-device-token-registration, use-notification-listeners, use-side-panel-animation
- Datasource: ⬜ push-notifications · Component: ⬜ notification-detail-skeleton · Store: ⬜ notifications-store

### 9. Shared `components/ui` — 48 untested

- High-traffic primitives first: action-sheet(.ios/.android), content-card, content-sheet,
  donut-stat, form-field, info-banner, markdown, phone-input, progress-bar, stat-block,
  status-chip, period-switcher, primary-screen-layout, back-button, logout-button,
  download-progress/state-button, image-with-fallback, streak-flame/day-block, notification-badge/button,
  collapsible, celebration-overlay, gradient-header, tab-header, app-drawer, native-notification-panel,
  keyboard-dismiss-view, swipe-back-blocker, spacer, bar-chart, icon, icon-symbol(.ios/.web),
  liquid-glass-tab-layout, android-tab-screen, motion-lines-background, external-link,
  web-nav-* (sidebar/drawer/layout/link/brand-header/mobile-header)

### 10. Shared `src/lib` — 30 untested

- http: ⬜ api-client, orval-mutator, query-client, query-config, resolve-blob-url
- hooks: ⬜ use-breakpoints, use-collapsible-header, use-debounce, use-download-state,
  use-image-colors, use-landscape-orientation
- utils: ⬜ chart-layout, deterministic-random, download-file, format-countdown, format-date,
  haptics, shuffle · i18n: ⬜ formatters · text: ⬜ strip-markdown
- ⬜ toast, toast-triggers, media-type-icons, auth-error-logger, crash-reporting (firebase/noop),
  firebase/config, push/hms-push, storage/mmkv-storage.web

---

## Shared harness (use in every new test — DRY is mandatory)

- `test/utils/rtr.tsx` — typed react-test-renderer helpers: `renderTree`, `TestNode`, `byTestId`,
  `queryAllByTestId`, `hostByTestId` (rendered accessibilityState), `inputByTestId` (drills
  wrapper→host TextInput), `textChildren`, `pressableWithText`, `firePress`, `fireChangeText`.
- `test/mocks/ui.tsx` — `makeUiMock(overrides)` (full wired `@/components/ui` incl. AsyncStateView
  state-machine, ResponsiveGrid, Alert, Button, OtpInput, etc.) + `controllerField(control, name, extra)`
  for react-hook-form-wired inputs. Use:
  `vi.mock('@/components/ui', async () => (await import('@/test/mocks/ui')).makeUiMock());`
- `test/mocks/shared.ts` — `i18nPassthrough()`, `tokensMock()`, `iconMock()` (static, safe in factories).
- `test/factories/` — add a factory per entity (added `makeLinkedOrg`). Never inline fixtures.
- Router mocks stay inline per file (they read per-test spy fns lazily → avoids hoist TDZ).

Gotchas baked into the exemplars:

- Do NOT `import { type ReactTestInstance }` — it's a namespace in this version's types; use `TestNode`.
- `vi.mock` factories are hoisted: never CALL a top-level helper inside a factory (TDZ). Reference
  helpers only inside lazily-invoked render closures.
- Wire `FormField`/`PhoneInput` mocks through the real `react-hook-form` `Controller` so submit
  logic (transforms, validation) is exercised, not stubbed.
- `findByProps(testID)` returns the composite wrapper; use `inputByTestId`/`hostByTestId` for the host.
- Each screen gets behavioural tests + `toMatchSnapshot()` for default + each major state.

## Progress log

- 2026-06-30: Plan created. Baseline 91/612 green. Bar locked = behavioural + structural snapshots
  (deepest), source testIDs allowed. Built `test/utils/rtr.tsx` shared harness. Done to bar:
  `login-screen` (1→30), `forgot-password-screen` (new, 13). Added `AUTH_TEST_IDS.forgotPassword`
  registry + wired testIDs into forgot-password screen. Suite 92 files / 654 tests green.
- 2026-06-30 (cont.): Built shared `test/mocks/ui.tsx` (`makeUiMock` + `controllerField`) and
  `test/mocks/shared.ts` (i18n/tokens/icon). Added `makeLinkedOrg` factory. Completed ALL auth
  screens to bar: select-organisation (7), otp-verify (4→12), setup-account (16) + snapshots; added
  `setup` testIDs to `auth.copy.ts` + wired state containers. Suite **94 files / 685 tests green**,
  typecheck + biome clean.
- 2026-06-30 (WAVE 1 — 6 parallel subagents via `SUBAGENT_BRIEF.md`): ✅ DONE TO BAR:
  Auth hooks/datasources/utils (16 files, 114 tests — auth now 100% done);
  Notifications (6 files + screen 1→23; added `NOTIFICATIONS_TEST_IDS`; HMS env-gated branch is the
  only intentional gap); Rewards (7 files, 49 tests; created `REWARDS_TEST_IDS`);
  Learn (10 files, 79 tests; PDF native WebView branch untestable — react-native-webview is
  externalised in vitest config, FIX = add a webview mock alias centrally);
  Scoreboard (9 files, 113 tests; created `SCOREBOARD_TEST_IDS`; podium-rank-card require→import);
  Games question-cards + dispatcher (8 files, 112 tests; created `QUESTION_TEST_IDS` + `games.factory.ts`;
  drove drag payload path by mocking useDragZones/DraggableOptionChip — raw pan-gesture wiring + real
  use-drag-zones measurement deferred to the games-hooks agent).
  Integrated: **152 files / 1277 tests green, tsc clean, biome clean** (2 pre-existing source warnings
  in game-card-group/games-screen remain — covered by upcoming waves).
  NEXT WAVE 2: games flow+session UI, games hooks/stores/datasource, home (split), profile,
  auth components. WAVE 3: components/ui (×3), lib (×2). Reuse `games.factory.ts` (don't recreate).
- 2026-06-30 (WAVE 2 — 6 parallel subagents): ✅ DONE TO BAR: Auth components (18 files, 139 — auth
  now 100%); Games flow+session UI (12 files, 124 — games folder 387/387); Home (23 files, 155);
  Profile (16 files, 157, + 2 shallow hardened); components/ui batch A (16 files, 95) + batch B
  (16 files, 147). Created home/profile/games factories + HOME/HELP/SETTINGS/SEASON_HISTORY/
  GAMES_SESSION/GAMES_CARD registries. Several asset `require()`→`import` source fixes (harness only
  stubs static asset imports). Integrated: **250 files / 2073 tests green, tsc clean, biome clean**
  (2 pre-existing source warnings remain: game-card-group `any`, games-screen non-null).
  WAVE 3 (final): games hooks/stores/datasource/drag-components; components/ui batch C (icons,
  web-nav, drawers); lib http+hooks; lib utils; lib misc.
- 2026-06-30 (WAVE 3 — 5 parallel subagents): ✅ DONE TO BAR: Games hooks/stores/datasource/drag
  (18 files, ~236 — games now 100%, 25 files/302 in folder); components/ui batch C (16 files, 141 —
  components/ui now 100%); lib http+hooks (10 files, ~143); lib utils (9 files, ~108); lib misc
  (9 files, ~92 — lib now 100%). Added dedicated `setup-account-screen.schema` test (5).

## ✅ PHASE 1 COMPLETE — 2026-06-30

- **313 test files / 2720 tests — all green.** tsc 0 errors. biome 0 errors (3 pre-existing source
  warnings only: game-card-group `any`, games-screen non-null, image-with-fallback array-index-key).
- Coverage gap: **224 untested source files → 0 meaningful** (only `crash-reporting/types.ts` remains,
  which is pure type declarations with no runtime). Baseline was 91 files / 612 tests.
- Bar applied everywhere: behavioural (every element/state/branch/interaction/nav/validation) + structural snapshots.
- Documented infra-limited gaps (NOT coverage holes; covered elsewhere or untestable in Node):
  1. HMS push branch gated by `EXPO_PUBLIC_PUSH_PROVIDER` (module-load env) — FCM path fully covered.
  2. PDF viewer NATIVE WebView branch — `react-native-webview` is externalised in vitest config;
     web/iframe + all other branches covered. FIX if wanted: add a webview mock alias in `vitest.shared.ts`.
  3. Raw pan/tap gesture worklets in `DraggableOptionChip`/`use-drag-zones` — worklets don't run in
     react-test-renderer; the drag PAYLOAD logic is covered end-to-end at the question-card level.
- Next: Phase 2 (E2E) — awaiting the user's user-flow list. Phase 3 (Maestro).
