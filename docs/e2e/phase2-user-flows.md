# ABC-123 Phase 2 — E2E User-Flow Reference (Expo web build)

> Source-verified flow spec for Expo-web E2E (Playwright) + later Maestro. **Step 1 deliverable** —
> the flows are documented and checked against the live code; no test code is written until these
> are approved. Built from Keelan's flow spec (`memory/phase2-e2e-flows.md`) cross-referenced against
> `apps/expo/src`, the existing `e2e/` suite, and the Phase-1 testID registries.

Status: 🟢 ALL 7 features verified against source (Auth · Home · Learn · Games · Scoreboard · Rewards · Profile)

## ✅ PHASE 2 COMPLETE — verified green (2026-07-01)

Authoritative full-suite run on a fresh `--clear` expo-web bundle (all source testIDs live),
across all three viewports (desktop 1280 / tablet 834 / mobile 390):

**726 passed · 0 failed · 66 skipped** (242 pass / 22 skip per viewport × 3).

All 7 features green: auth (44), home (41), learn (18), profile (36), rewards (24),
scoreboard (22), games (57) per viewport. The 22 skips/fixmes are intentional + documented:
drag-gesture question types (→ Maestro), real Google/OTP popups (headless-undrivable),
per-category scoreboard (needs a games `playGameToScoreboard` seam), and a few real-login/
real-backend specs gated on creds. Local iteration harness: `playwright.expo-local.config.ts`.

Known non-blocking follow-ups (flagged by agents): missing i18n key `common:portal.openNavigation`;
optional shared-component testIDs (`WebNavLink` badge, `BackButton`). Next: Phase 3 (Maestro).

## Step 2 status (build) — committed

- ✅ Foundation: DRY `selectors.ts` (re-exports real registries), mobile/tablet/desktop viewport projects.
- ✅ All 7 feature suites written (POMs + ~30 specs + fixtures) + cleanups + source testIDs. Unit suite
  re-verified green (314 files / 2725 tests) after the testID snapshot updates.
- ✅ Verified runnable: auth login **10/10 green** on first run against a live expo-web server.

## Synthetic auth injector (option c) — DESIGN + OPEN DEBUG (not yet working)

Goal: authenticate in-app E2E specs deterministically, with **no live Firebase login and no captured
session** (so specs don't depend on `global-setup` creds or an expiring token). Live-safe by design.

How auth actually restores (verified in source): Firebase web SDK persists the user in IndexedDB
(`firebaseLocalStorageDb` → `firebaseLocalStorage`, key `firebase:authUser:{apiKey}:[DEFAULT]`). On load,
`auth-initializer.tsx` reacts to the restored user → maps it to `AuthUser` (companyId from the token's
`company_id` claim via `extractCompanyId`) → `setAuth` → `resolveOrganisationContext` (companyId present →
`setActiveOrg`, single-org fast path). The zustand auth-store is **NOT persisted** — it's repopulated at
runtime from Firebase. So injecting the IDB record (with a `company_id` claim + a name) *should* land on home.

Built + tested an injector (`buildSyntheticExpoIdb`/`injectSyntheticExpoAuth`) that writes a synthetic IDB
record with a far-future `expirationTime` + an unsigned JWT carrying `company_id`/`email`/name claims.
**Result: it did NOT authenticate — home still timed out.** Reverted from `injectExpoFirebaseAuth` to keep
the working captured-session default (so CI in-app specs aren't broken).

**Leading hypothesis for the next pass:** Firebase likely **force-refreshes** the restored token against
`https://securetoken.googleapis.com/v1/token` (it can't trust the unsigned token), and the fake refresh
token 400s → SDK signs the user out → app redirects to login → timeout. **Fix to try:** also
`page.route('**/securetoken.googleapis.com/**', …)` (and `**/identitytoolkit.googleapis.com/**`) to return a
valid-shaped refresh response `{ id_token, refresh_token, expires_in, user_id, project_id }`, so the SDK
accepts the session offline. Pair the injector + these route mocks in a shared `injectSyntheticExpoAuth`
helper, validate against `home.spec` (single test) until it lands on home, then switch the in-app specs'
`beforeEach` from `injectExpoFirebaseAuth` to it. Alternative: run the Firebase Auth emulator in E2E and
mint a real (emulator-signed) token — heavier infra but fully legitimate tokens.

## In-app central verify — remaining

Once synthetic auth lands on home: run all 7 suites × 3 viewports, fix the per-feature failures that
unexecuted specs carry (mock-shape, timing, selectors), and wire the flagged shared-infra items:
`WebNavLink` badge testID, `BackButton` testIDs, a shared notification-permission util, `playGameToScoreboard`,
the web sign-out testID, and `global-setup` no-name/per-provider fixtures (gating a few skip/fixme specs).
Auth specs (unauthenticated) already pass and need no synthetic session.

## Decisions needed from Keelan before implementation (Step 2)

1. **Drag-based question types** (FillInBlanks, StatementBlanking, MatchTheTerms, WordBucket, StatementBuilding)
   are flaky to drive on Playwright web. Proposal: web E2E covers tap types (Quiz, IdentifyInImage) fully + asserts
   drop-zone presence/payload for drag types; **full drag interactions go to Maestro.** OK?
2. **Social/phone sign-in** can't complete in headless web (no Firebase emulator). Proposal: drive the button to
   popup only + inject a per-provider session for post-auth assertions; **email is the only fully-real auth.** OK?
3. **Sounds, downloads, full offline-play, landscape, haptics, real animations** are native-only → **Maestro, not web E2E.**
   Web covers the deterministic slices (online-complete-retry for offline; final-state for animations). Agreed scope?
4. **Stat arithmetic** (pass-rate, score math, window math) — keep as unit tests; E2E asserts rendered values only. OK?
5. **Pre-work PR** (no new tests, just fixing the foundation) — reconcile `e2e/expo/selectors.ts` ⇄ all `.copy.ts`,
   delete dead `register.page.ts` + stale period-picker/splash/ABC-123 specs, add missing source testIDs. Do this first?

## Cross-cutting corrections discovered during verification (update the raw spec)

- **`e2e/expo/selectors.ts` is broadly stale** — it claims to mirror the feature `*_TEST_IDS` but is
  missing many (auth, home ×11, learn ~12, profile: all of SETTINGS/HELP/SEASON_HISTORY + `logoutButton`)
  and contains **phantom selectors** (`home-activity-grid`, `home-cta-button` — not rendered anywhere).
  **First Phase-2 task: full reconcile of selectors.ts ⇄ every `.copy.ts`.**
- **Sounds/SFX are a no-op on web** (`sfx.ts` returns early when `Platform.OS==='web'`). "Sounds play /
  don't play when muted" is **Maestro-only**; web E2E can only assert the negative (no error/no audio).
- **League-up & streak celebration overlays mount app-wide** (via `ToastTriggers`), not on Home —
  they fire after a game on any screen. Test by chaining off game completion or seeding MMKV + mocking xp.
- **"Losing streak / going down" is league *demotion*** (overlay), not a StreakCard state. Split it.
- **Animations:** assert FINAL state, and force `prefers-reduced-motion: reduce` (Playwright
  `emulateMedia`) to take static branches — never assert intermediate frames.
- **Image-derived background colours:** soft assertion only (style present/non-default) or stub
  `useImageColors`; don't assert exact hex.
- **Native-only (Maestro, not web E2E):** downloads/offline content, landscape orientation, AppState
  background flush, native video/PDF WebView, haptics, real Google/Microsoft/phone sign-in.
- **Time-dependent logic** (e.g. streak "at risk" on Sat/Sun via `new Date().getDay()`): mock the clock
  (`page.clock`) or it's flaky in CI.

---

## Cross-cutting rules (apply to every flow)

- **Two viewports, every flow.** Mobile web (~390×844) AND tablet/desktop (~1280×800). The web app
  must work on both; layouts diverge at component-specific breakpoints (auth = 768px). The existing
  Playwright config has only ONE expo project (Desktop Chrome) — **mobile + tablet projects must be
  added** (`e2e/playwright.config.ts`).
- **Auth is injected, not performed.** `global-setup.ts` does one real email/password UI login, dumps
  Firebase IndexedDB to `.auth/*-idb.json`, and tests replay it via `injectExpoFirebaseAuth(page)` /
  `loginAsAdmin(page)` (`addInitScript` before page JS). No Firebase Auth Emulator is used.
- **Mock the API boundary** for deterministic state (empty/error/large/offline) via `page.route`
  per feature datasource. Real backend only where persistence must be proven.
- **POM mandatory**, selectors in `e2e/expo/selectors.ts` (must mirror the `*_TEST_IDS` in each
  feature's `.copy.ts`). No hardcoded selectors in specs. No `waitForTimeout`.
- **Chain flows** for multi-assertion journeys (sign-in → home state; play → results → reward → scoreboard).

## Pre-work / infra gaps to fix before writing specs

1. **Add viewport projects** (mobile + tablet) to `e2e/playwright.config.ts` (currently desktop-only).
2. **Re-sync `e2e/expo/selectors.ts`** — it's stale vs the Phase-1 registries (see Auth §; missing
   microsoft/phone/forgotPassword/setup/selectOrg/components blocks, has dead `registerLink`).
3. **Delete dead `e2e/expo/pages/register.page.ts`** (register was removed) and fix `login.page.ts`.
4. **Add missing source testIDs** (per feature, see each section) — e.g. password fields, sign-out,
   forgot-password link, "back to email", and apply already-declared-but-unused ids.
5. **Firebase mock sessions:** to E2E the *post-auth* outcome of Google/Microsoft/phone, capture a
   one-time IDB record per provider in global-setup and inject it (can't drive the real provider UI).

---

## 1. Authentication ✅ verified

**Architecture facts that shape these flows:**

- Auth route group registers only `login`, `otp-verify`, `setup-account`. `forgot-password.tsx` is
  routed but not a `<Stack.Screen>`.
- **Select-organisation is NOT in the auth group** — it's `app/select-org.tsx`; post-login routing to
  it happens in `app/(tabs)/_layout.tsx`: `orgs.length > 1 && activeCompanyId === null` →
  `replace('/select-org')`; single org → auto-`switchOrg`; org-load failure → Firebase-token `companyId`.
- **Complete-profile gate** is an inline gate in `(tabs)/_layout.tsx` (`if (!user?.name) return
  <CompleteProfileGate/>`) — assert by testID, not URL.
- **Layout breakpoint 768px** (`auth-screen-layout.tsx WEB_SPLIT_MIN_WIDTH`): ≥768 split-panel
  (hero left + form right); <768 stacked hero + wave + card. Same testIDs in both → one POM works.
- **Custom-auth users** (username, no `@`): login appends `CUSTOM_AUTH_EMAIL_DOMAIN`; forgot-password
  *rejects* that domain (`emailNotEligible`) — they can only reset via an admin-issued setup link.

**Flows + key testIDs** (source of truth: `auth.copy.ts AUTH_TEST_IDS`):

| Flow | Route / gate | Key testIDs | Notes |
|---|---|---|---|
| Email sign-in (+/-) | `/(auth)/login` email mode | `login-email-input`, `login-password-input`, `login-submit-button` | success → `replace('/')`; wrong pw / invalid acct → inline `<Alert>` (no testID — match text or add one); zod email+password validation |
| Phone/OTP | login phone mode → `/(auth)/otp-verify?phone=` | `login-phone-button`, `phone-login-phone-input`, `phone-login-submit-button`, `otp-verify-code-input`, `otp-verify-submit-button`, `otp-verify-back-button` | web needs invisible reCAPTCHA (`login-recaptcha-container`); `__DEV__` auto-bootstrap for phone users w/o companyId |
| Google | login | `login-google-button`, overlay `oauth-loading-overlay`(+`-slow` after 20s, +`-cancel`) | web GIS popup → `signInWithCredential` |
| Microsoft | login | `login-microsoft-button` | PKCE web flow; same overlay + conflict sheet |
| Provider conflict | — | `provider-conflict-dismiss` (sheet container testID declared but NOT applied — add it) | shows only for `ProviderConflictFailure`; inline alert suppressed; 3 message variants |
| Forgot-password | `/(auth)/forgot-password` | `forgot-password-back-button`, `-email-input`, `-submit-button`, `-success-card` | OWASP: always shows success on settle; rejects custom-auth domain |
| Setup / reset-via-link | `/(auth)/setup-account?token=&purpose=` | `setup-invalid-link`, `setup-validating`, `setup-token-invalid`, `setup-back-button`, `setup-submit-button`, rule rows `password-rule-${key}` | password fields lack testIDs (**add** `setup.passwordInput/confirmPasswordInput`, wire `PasswordField`); `purpose=reset` → on success `/login?resetSuccess=1` |
| Select-organisation | `/select-org` | `select-org-screen`, `select-org-item-${companyId}`, drawer `drawer-switch-org` | `AsyncStateView` loading/error; select → `switchOrg` → `replace('/')` |
| Complete-profile gate | inline | `complete-profile-name-input`, `complete-profile-submit` | rendered when authed user has no name |
| Change-password | edit profile | `change-password-submit` (fields lack testIDs — same `PasswordField` gap) | |
| Sign-out | profile/settings | **no testID yet — add one** | for sign-out → login chain |

**Existing E2E:** `login.spec` (render, validation, valid-login skip-gated, invalid-creds), `google-sign-in.spec`
(render + popup-opens only), `otp-verify.spec` (render + back, no real OTP), `org-switch.spec` (multi-org mocked).
**Gaps:** Microsoft, phone-send-OTP submit, forgot-password, setup/reset (3 states), complete-profile gate,
provider-conflict sheet, OAuth overlay cancel/slow, change-password, sign-out, and **mobile-viewport variants of all**.

**Edge/negative cases to add:** wrong password, invalid account, custom-auth forgot-password rejection,
forgot-password always-succeeds (OWASP), cancelled OAuth (click overlay cancel), OAuth slow (20s), provider
conflict, expired/missing setup token, org-list network failure, authed user hitting `/(auth)/*` redirects to `/`.
Rate-limit = generic Firebase error (no dedicated UI). reCAPTCHA-not-ready web phone early-return (hard to assert — document).

**Firebase verdict (Keelan's question):** Email/password = fully E2E-testable (real login in global-setup +
per-test IDB injection). **Google / Microsoft / phone CANNOT complete E2E** (Google blocks headless; no emulator;
real SMS/reCAPTCHA) — drive the *button* up to popup only, and assert post-auth outcomes by injecting a per-provider
IDB session captured once in global-setup. Provider internals are unit-tested. Document these as known E2E limits.

**Mobile vs tablet/desktop:** single 768px split; testIDs are layout-independent so one POM serves both —
run every auth spec at ~390px and ~1280px. (Layout-container ids `gradientHero/screenLayout/waveDivider` are
declared in the registry but not applied — apply them if asserting which layout rendered.)

**Chainable flows:** (1) email sign-in → home renders league/activity; (2) multi-org → select-org → home;
(3) SSO no-name → complete-profile gate → home; (4) reset-link → `/login?resetSuccess=1` banner → sign in;
(5) phone → OTP (mocked) → home; (6) forgot-password round trip; (7) cancel OAuth → stay on login;
(8) sign-out → login.

---

## 2. Home ✅ verified

**State control (mock these):** `**/api/xp/summary**`, `**/api/xp/unseen**`, `**/api/league/weekly-summary**`,
`**/api/activity**?period=`, `**/api/profile**`, `**/api/rewards**`, `**/api/topics**`, `**/api/assignments**`,
`**/api/company**`. League-change + streak dedup via MMKV/localStorage keys (`league:{co|default}:lastSeen`/`:season`).

**Flows + testIDs** (`home.copy.ts HOME_TEST_IDS`):

- **Empty:** mock topics `[]`/all-100% + assignments empty → `home-continue-reading` & `home-continue-playing`
  NOT attached; activity section still shows; streak "No games scheduled". Also test suggestion-vs-continue
  heading flip (`startReading↔continueReading`, `startPlaying↔continuePlaying`).
- **Season stats strip** (`home-season-stats-strip`): rings `home-stat-pass-rate`/`-rewards`/`-explored`
  (`passRate=gamesPassed/totalSessions`, `—` when 0). **`home-stat-games-won` is defined but NOT rendered — drop it.** Keep arithmetic as unit test; E2E asserts render + %/fraction text.
- **League card** (`home-league-section`/`-name`/`-xp`/`-progress`, top-league `home:topLeague`): XP banner
  `home-xp-earned-overlay` (format `+{amount} XP — {source}`, `pointerEvents:none`, timer-advance 2400ms —
  **existing tap-to-advance tests are suspect, re-verify**). League-up overlay testID **literal** `home-league-change-overlay`;
  parametrise **all** transitions (bronze→silver→gold→diamond), demotion, season-reset (only bronze→gold exists today).
- **Streak card** (`home-streak-counter`): states none / getting / multi-week / secured / at-risk (Sat-Sun,
  **mock the clock**) / no-target. **Activity fixtures must add `currentStreakWeeks`/`weeklyTargetMet`/`weeklyGoalXp`/`dailyXp`/`days`.**
  Streak overlay `home-streak-celebration-overlay` (app-wide host). NOTE: "losing streak" = league demotion, not a streak state.
- **Bottom cards:** `home-continue-reading` (`{progress}% complete`, varying %, tap→module/topic),
  `home-continue-playing` (`{score}% best score`, tap→game start) — **no specs exist, full gap.**
- **Viewport:** desktop shows `<h1>` greeting + notifications aside (`lg:w-80`, absent on mobile) + side-by-side
  stats/league + no hero strip/pull-refresh; mobile has `HeroColorBackground` (company colour) + stacked. Test both.
- **selectors.ts:** add 11 missing IDs; **delete phantom `home-activity-grid` + `home-cta-button`** (existing `activity.spec` leans on the phantom).

## 3. Learn ✅ verified

**Routes/containers:** `/learning`=`learning-centre-screen`, `/topics/[id]`=`topic-cover-screen`,
`/modules/[id]`=`module-cover-screen`, `/media`=`module-media-screen`, `/pdf|video|image`=`{pdf,video,image}-viewer-screen`.
**API:** `GET /api/learn/topics[?search=]`, `/topics/:id`, `/topics/:t/categories/:c`, `PATCH …/progress`.

- **Empty:** topics `[]` → `noTopicsTitle`; search header hidden when empty/loading (**existing "renders search input" empty-mock test is fragile — verify**). Topic-cover empty = `noCategoriesTitle`.
- **Single-category card** (`topic-card-<id>`, `categoryCount<2`): taps straight to `module-cover` (topic-cover auto-`replace`s too). Progress: scroll `module-cover` → `markRead` at 80% → assert `PATCH …/progress` (`markRead:true`). **Progress bar has NO testID — add one.** "Game On" `learn-get-game-on-button` (renders only when a matched active assignment exists; disabled on cooldown/locked-by-order) → `/(detail)/games/[id]/start`. **No test clicks it through — key chain gap.**
- **Multi-category** (`categoryCount>=2`): `/topics/[id]` → `module-list-card-<categoryId>` rows → tap → module. **No test taps a row through.**
- **Content viewers:** web renders `<iframe>` (pdf), `<video controls autoplay>`, `expo-image` (image); each calls `useMarkMediaRead` (mark-read on open). **No specs/POMs/selectors for the 3 viewers — full gap.** Media elements lack testIDs.
- **Search** `learn-search-input` (debounced 400ms → `?search=`). **Filter** `learn-category-filter` pills `category-pill-<id>` (all/not_started/in_progress/completed) — **only renders when ≥2 progress states present; client-side; zero E2E coverage.**
- **Edge:** completed/new chips (`topic-completed-chip-<id>`/`topic-new-chip-<id>` — not in selectors); progress flush on blur (web-testable); new-topics nav badge (no testID).
- **Viewport:** grid 1/2/3 col (mobile/tablet/desktop); web ≥tablet hides native header → in-content `BackButton`+`h3` (close affordance differs per viewport).
- **Native-only (Maestro):** downloads/offline topics, landscape, AppState-background flush.
- **selectors.ts mirrors only ~10 of 22 LEARN ids — reconcile + add viewer/filter/chip ids.**

## 4. Games ✅ verified

- **⚠️ Existing `game-session.spec.ts` is FAILING** — it waits for a **splash screen** (`game-splash-screen`)
  and a `game-view-results-button` that **no longer exist** (declared in `games.copy.ts` but never rendered).
  Current flow: last answer → `game-submitting-overlay` → `router.replace(.../results)` (no splash, no view-results
  button). **Rewrite those specs; remove `splashScreen`/`viewResultsButton` from copy.**
- **⚠️ selectors.ts badly stale** — `GAMES_TEST_IDS` mirror has 4 of 11 ids; `GAMES_SESSION_TEST_IDS` missing all
  play-flow states; `QUESTION_TEST_IDS` + `GAMES_CARD_TEST_IDS` **entirely absent**. Reconcile before authoring.
- **⚠️ `MatchTheImage` is dead code** — not a `QuestionType` enum value, not in `SUPPORTED_QUESTION_TYPES`, not in
  the dispatcher. Do NOT write a play-through for it (spec lists it — flag). The 7 live types are below.

**Landing** (`games-screen`): `games-search-input` (client-side substring filter — no API), `games-status-filter`
\- pills `games-status-pill-{all|new|passed|cooldown|mastered}` (**only shown when ≥2 chips have matches**),
`games-info-banner`, `games-loading-skeleton`. Cards = `ContentCard`: root `game-card-{id}`
(**non-unique across multi-category cards — uses assignment id, not `_cardKey`; gap**), CTA `game-card-play-{id}`,
status badge `game-card-status-{id}` (**only for mastered/passed; "NEW" badge has no testID**). `games-help-button` declared — verify it renders.

**Enforced display order (verified):** `keepDisplayOrder===true && categories>1` → `GameCardGroup`
(`game-card-group-{name}` + `-header-`); category *i* locked while `cats[i-1].neverPlayed` (`lockedReason='display_order'`,
CTA `completeStepFirst`, press fires `lockedByOrderToast`, no nav). Step 2 unlocks once step 1 played once. On
tablet/desktop (numColumns>1) groups render full-width above the grid; mobile renders inline → **viewport assertion**.

**Attempts/cooldown (verified `game-card.utils.ts deriveStatus` precedence):** inactive→locked; prev-category-never-played→locked;
future `cooldownEndsAt`→cooldown (`cooldownTimer`, live `useCooldown`); `bestScore≥100`→mastered; `≥70`→passed;
`attempts===0`→not_attempted; `attempts≥maxAttempts`→locked (`retryTomorrow`); else playable. So **fail→replay immediately**
(playable, `playAgain`), **pass+attempts-exhausted→`retryTomorrow`**, rollover is server-driven via fixture fields.
Start-screen negatives: 429→`cooldownActiveError`, 409→`maxAttemptsError`, else `startGameError` (button stays, no nav).
Dev bypass `EXPO_PUBLIC_DISABLE_COOLDOWN=true`.

**Start guard (verified — "can't navigate away during start"):** Android hardware-back blocked while loading;
back button hidden; swipe-back disabled for game screens (`(detail)/_layout.tsx gestureEnabled:!isGameScreen` +
iOS `SwipeBackBlocker`); stale result dropped if user leaves; double-tap guarded. POST `/api/game-sessions`
`{assignmentId, categoryId, includeAnswers: !web}` → **web strips answers → server-side evaluation**.

**Question types (7 live; dispatcher `question-dispatcher`):** Quiz→`question-option-{id}` (tap, web-feasible);
IdentifyInImage→`question-target-{id}` (tap, web-feasible); FillInTheBlanks+StatementBlanking→shared FillInBlank
`question-blank-{id}` (drag); MatchTheTerms→`question-match-slot-{id}` (drag); WordBucket→`question-bucket-{id}` (drag);
StatementBuilding→`question-blank-{id}` (drag). **Tap types are web-E2E-feasible; the 4 drag types are flaky on Playwright →
defer to Maestro** (or assert drop-zone presence only). Feedback: `question-feedback-banner` (correct/wrong), confetti
`game-confetti-overlay`, error `game-error-vignette`, urgency `game-urgency-vignette`, `game-timer-label` (30s, expiry→empty
answer=wrong). **Sounds via `useSfx` (web no-op) → mute assertions are unit/Maestro, not web E2E.**

**Completion/offline:** last answer → `game-submitting-overlay` → drain answers → `/complete` → results. Failure:
offline→`queueOfflineCompletion` (proceeds with local completion); else `game-completion-error` + `game-completion-retry-button`.
Full **offline play→pending→sync requires a prior download (native-only) → Maestro**; the **web-testable offline slice** is
online-complete-fails-offline → reconnect → `/sync` (use `context.setOffline` + route abort).

**Results** (`game-results-screen`): score, pass/fail chip, XP card (when `xpEarned>0`), all answers with check/x,
`{n} of {total} correct`. **Retry `game-retry-button` only when passed; ABSENT when failed.** `game-continue-button`
→ scoreboard step (online) / finish.

**Per-game category scoreboard:** it's the `step:'scoreboard'` sub-route of `app/(detail)/games/[id]/results.tsx`
(online only; offline skips). Renders `CategoryScoreboardScreen`→`ScoreboardView` (reuse SCOREBOARD ids). **Screen lacks
its own testID — add `game-category-scoreboard`.**

**Viewport:** mobile → top `game-session-header` (horizontal `game-progress-pill-{i}`); tablet/desktop web → left
`game-session-sidebar` (vertical `game-progress-row-{i}` + live correct count); both have `game-abandon-button`. Desktop
question panel uses CSS `zoom` 1.5. Branch viewport tests on which chrome is visible.

**Mocking:** `GET /api/game-assignments` (fixtures drive all status/cooldown/attempts/grouping), `POST /api/game-sessions`
(+429/409/400/500), `/answers` (stateful pass/fail script), `/complete` (score/xp/results), `/abandon`, `/sync`.
Auth via `injectExpoFirebaseAuth`.

**Chains:** (1) play→results→reward unlock (invalidates rewards); (2) play→results→category scoreboard (online);
(3) display-order: play step 1 → step 2 unlocks; (4) fail→`playAgain` vs pass-exhausted→`retryTomorrow`;
(5) online-complete-offline→reconnect→sync.

## 5. Scoreboard ✅ verified

- **⚠️ STALE:** existing spec + selectors reference a **period picker that no longer exists** (board is driven by
  `scoreMetric` points/percentage from app-store, no week/month/season). **Delete the 2 period-picker tests +
  `periodButton` selector/POM.** Add missing source ids `skeleton`,`categoryRetryButton`,`categoryViewResultsButton`.
- **testIDs** (`scoreboard.copy.ts`): `scoreboard-heading` (**web/tablet only — absent on global mobile**),
  `top-three-section`, `top-three-card-{rank}`, `trainee-card-{rank}`, `scoreboard-scroll-view`, `scoreboard-skeleton`,
  `category-scoreboard-retry-button`, `category-scoreboard-view-results-button`.
- **Missing testIDs (add):** empty/error/no-department/offline views (only text today via `AsyncStateView` — pass a testID),
  celebration overlay (`CelebrationOverlay` accepts testID but none passed), no-others empty, current-user-row flag, load spinners.
- **No-results:** mock `{entries:[],topThree:[],totalCount:0}` → `scroll-view` absent + `empty.title`; 404 → `noDepartment.title`.
- **Large datasets (100/1000+):** list is ALWAYS a windowed view (anchored to current user, 2 above/10 below =13;
  `loadMore` skip+10; `loadEarlier` global-only). Assert correct API windows requested on scroll (params `Metric/Page/PageSize/AnchorToCurrentUser/Skip`) + DOM stays windowed. **60s datasource cache — vary query keys or force `refresh()`.**
- **Rank up/down + celebration:** MMKV `scoreboard:lastSeenRank` (global) / `:lastSeenCategoryRank:{id}` vs returned rank →
  up/down/first-appearance; 20-step ≤2s animation. **E2E asserts END STATE + celebration trigger, not frames (motion = unit test).**
  Celebration for 1st/2nd/3rd: seed lastSeen lower, mock `currentUserEntry.rank`=1/2/3; `podiumEntry.title` (from ≥4) vs `podiumRise.title` (within top-3); tap to dismiss.
- **Global vs category:** category reached only post-game via `app/(detail)/games/[id]/results.tsx`; passed→retry+back buttons, failed→back only (`passed && onRetry` guard); `GET /api/scoreboard/category/{id}`.
- **Edge:** ties (dup rank-3 → only podium shows, list starts at 4); current-user highlight is style-only (add hook); my-rank off-screen auto-scroll (`scrollToIndex(userIndex-2)`).
- **Viewport:** global heading web-only; category web hard `maxWidth:768`; collapsible header native-only.

## 6. Rewards ✅ verified

- **⚠️ STALE:** "Reward unlock toast (ABC-123)" tests (games-landing toast + `notifiedIds` localStorage) assert
  **removed UI** — delete/rewrite against the in-screen `CelebrationOverlay` (`useRewardUnlockCelebration`, MMKV `celebratedIds`).
- **Triggers are BACKEND-side** (`GameSessionCompleted`/`LeagueChanged`/`LoginStreakReached`) — app only reads
  `GET /api/rewards/available` + `/earned` (raw arrays, NOT paged). "All triggers fire" = backend unit/integration
  (already covered). E2E value = the full chain `GameSessionCompleted → API → UI shows reward`, UI being trigger-agnostic.
- **testIDs** (`rewards.copy.ts`): `rewards-screen`, `rewards-unlock-celebration-overlay`, `rewards-progress-hero`,
  `rewards-progress-card`, `reward-fallback-icon`; cards via `toTestId(reward.name)` (**verify `toTestId` matches the e2e
  `getRewardCardId` reimpl — latent break**). **selectors.ts missing celebrationOverlay/progressHero/progressCard/fallbackIcon.**
- **Flows:** no-rewards (`noRewardsTitle`/offline variant); locked (grayscale + lock overlay, no duotone, **lock overlay needs testID**);
  **company colours** — duotone applies only to `!isLocked && isPreset` (custom uploads never tinted); assert web `<img>` style
  has `url(#duotone-rewards)` AND the injected filter `feFuncR tableValues` match the company hex (**current test checks
  filter presence, not the company values — gap**); native can't inspect → snapshot-only.
- **Stackable:** `instanceCount>1` → `×N` badge, `>99`→`99+`; detail shows `earnedCountWithDate`. **No coverage; badge needs testID.**
- **Detail overlay:** tap card → overlay (web `createPortal`); marks seen (`PATCH /api/rewards/{id}/seen`) for new; backdrop closes.
  **Detail-overlay container + close have NO testID — add them. No open/close coverage.**
- **Edge:** NEW chip clears on seen + `seenThisSession` pinning; fallback icon when no image; filter chips (≥2 sections);
  offline-with-cache persistence. **Deterministic unlock:** mock `available` with `isUnlocked:true,hasSeen:false` + clear
  localStorage `rewards:{userId}:celebratedIds` → overlay auto-fires on rewards screen.
- **Viewport:** 2/3/4 columns (phone/tablet/desktop); web≥tablet shows `<h1>` + constrained hero.

## 7. Profile / Settings / Help ✅ verified

- **⚠️ DEFECTS:** `profile-name-field` testID is **defined but never rendered** (existing POM `tapNameField` clicks a
  ghost — edit is reached via the **Edit-profile menu item which has no testID**); settings/help/edit menu rows have **no
  testIDs** (keyed by label); `e2e/expo/selectors.ts` **omits all of `SETTINGS_TEST_IDS`/`HELP_TEST_IDS`/`SEASON_HISTORY_TEST_IDS`
  - `logoutButton`** — add `editProfileMenuItem`/`settingsMenuItem`/`helpMenuItem`/`seeAllSeasonsLink` and mirror everything.
  Avatar oversize boundary is **5 MB** (stale "8 MB" comment).
- **testIDs:** `PROFILE_TEST_IDS{logoutButton,screen,displayName,email,avatarButton}`, `EDIT_PROFILE_TEST_IDS{screen,avatarButton,displayNameInput,saveButton}`,
  `HELP_TEST_IDS{screen,subjectInput,bodyInput,sendButton,successView,doneButton}`, `SETTINGS_TEST_IDS{notificationsSwitch,soundsSwitch,volumeSlider,darkModeSwitch,reduceMotionSwitch,scoreMetricSwitch}`, `SEASON_HISTORY_TEST_IDS{loading,empty,list}`.
- **Edit profile:** name (save disabled until changed; <2 chars → native Alert = on web stays on screen; refetch on focus via shared `['profile']` key); avatar (web = hidden `<input type=file>`, drive via `filechooser`; `POST /api/users/me/avatar` raw XHR then `PATCH` blobPath; oversize/error → no upload; **prefer unit for oversize**); **change-password GATED** by `authMethod ∈ {Credentials, CustomAuthentication}` → assert section present for those, ABSENT for Google/Microsoft365/PhoneOtp; `POST /api/users/me/change-password`.
- **Settings:** notifications (mock `expo-notifications` grant/deny; permission gates ON), sounds, volume (only when sounds on; hard to drive → unit), dark-mode (theme class), reduce-motion, score-metric. **Pure client store (zustand+MMKV) — no API; assert persistence across nav.**
- **Sign out:** `logoutButton` → `replace('/(auth)/login')`; disabled offline; **hidden on web-tablet (sidebar instead) — two POM paths.**
- **Help:** subject(<3)/body(<10) validation; `POST /api/support/help` → `successView`+`doneButton`; error → stays on form.
- **Season history:** "See all" only when `>1` season (no testID); `loading`/`empty`/`list`; `GET /api/league/season-history`+`/season-highlights`.
- **Chains:** edit name/avatar → reflected on home header (shared query key); toggle dark-mode → persists across nav.
- **Viewport:** web-tablet hides header + logout (sidebar), shows `<h1>`; content width-capped. Test both.
