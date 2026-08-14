# StarterKit Expo — E2E User-Flow Reference Spec

ABC-123 Phase 2, Step 1 — Flow reference doc (for review before implementing tests).

> This document is the canonical source of truth for what must be E2E-tested in the Expo app
> (via Playwright against the Expo web build, then ported to Maestro for native). Every flow is
> verified against the current source code and test-ID registries. Read before writing any spec.
>
> **Branch note:** Phase 2 E2E tests should be implemented on a fresh branch cut from `dev` (after
> Phase 1 unit tests were merged). The spec files listed below already exist on `feature/gam-503`;
> check them in before cutting the new branch.

---

## Legend

| Symbol | Meaning |
|---|---|
| ✅ | Spec file exists and covers this flow |
| 🔶 | Partially covered — gaps noted |
| ⬜ | Not yet implemented |
| ⚠️ | Discrepancy between source and spec / outstanding issue |
| 📐 | Must be tested at BOTH mobile (~390 px) and tablet/desktop (≥768 px) widths |

---

## Cross-cutting rules (apply to EVERY flow)

1. **Dual-viewport mandate** — every spec must be run (or parameterised) at:
   - **Mobile** `{ width: 390, height: 844 }` — iPhone 14 viewport
   - **Desktop** `{ width: 1280, height: 800 }` — tablet/laptop viewport
   Layout, bottom-tabs vs sidebar nav, panel vs full-screen, and responsive grids all change.
   Use Playwright `projects` or `use: { viewport }` overrides — not a separate config file.

2. **Auth strategy** — all authenticated specs use `injectExpoFirebaseAuth(page)` from
   `e2e/playwright/utils/auth.ts`. This injects a pre-saved IndexedDB Firebase session,
   avoiding real Firebase round-trips and rate-limit issues. Never call Firebase REST APIs inline.
   See §1 (Auth) for social-sign-in gaps.

3. **Mock by default, real API for integration** — mocked routes for rendering/state tests;
   real backend only for serialised integration flows (game session end-to-end, reward unlock,
   stat calculation chained across multiple screens).

4. **No `page.waitForTimeout()`** — always `waitForSelector`, `waitForResponse`, or a visible
   assertion with a `timeout` option. This is enforced by `e2e-testing.md`.

5. **POM convention** — every screen gets a Page Object in `e2e/expo/pages/`.
   All testID strings come from `e2e/expo/selectors.ts`, which mirrors the `.copy.ts` registries.
   Spec files never hardcode `data-testid` strings directly.

6. **Offline / pending session** — E2E offline tests are deferred to Maestro (native network
   toggle). Document here that the PENDING session sync flow (play offline → queue → sync)
   requires a Maestro-only test and must be noted in the Maestro spec.

---

## 1. Authentication

**Page objects:** `e2e/expo/pages/login.page.ts`, `otp-verify.page.ts`, `select-org.page.ts`
**Source:** `apps/expo/src/features/auth/presentation/`
**testID registry:** `AUTH_TEST_IDS` in `auth.copy.ts`

### 1.1 Email / password login ✅

**Spec:** `e2e/tests/expo/auth/login.spec.ts`

| Flow | Status | Notes |
|---|---|---|
| Form renders (email, password, submit) | ✅ | |
| Empty form → validation errors shown | ✅ | |
| Invalid email format → validation error | ✅ | |
| Short password → validation error | ✅ | |
| Valid credentials → redirects away from login | ✅ | Skipped when E2E_ADMIN_EMAIL unset |
| Invalid credentials → error toast shown | ✅ | |

**Gaps:**

- ⬜ Forgot-password link rendered on login screen → navigates to forgot-password screen
- ⬜ Phone sign-in button rendered → navigates to phone entry screen (see §1.4)

### 1.2 Forgot password ⬜

**Spec to create:** `e2e/tests/expo/auth/forgot-password.spec.ts`
**testIDs:** `AUTH_TEST_IDS.forgotPassword.*` — `emailInput`, `submitButton`, `successCard`, `backButton`

| Flow | Status |
|---|---|
| Screen renders with email input and submit button | ⬜ |
| Back button navigates to login | ⬜ |
| Empty submit → validation error | ⬜ |
| Invalid email format → validation error | ⬜ |
| Valid email → success card shown (no redirect; email sent message) | ⬜ |
| API 500 → error shown, screen still usable | ⬜ |

### 1.3 Google sign-in ✅ 🔶

**Spec:** `e2e/tests/expo/auth/google-sign-in.spec.ts`

| Flow | Status | Notes |
|---|---|---|
| Google button renders, enabled, correct aria-label | ✅ | |
| Clicking button opens Google OAuth popup | ✅ | Asserts firebase relay or accounts.google.com URL |
| Full OAuth completion (real login) | ⚠️ NOT FEASIBLE | Google detects headless; blocked by browser automation policy. Document this gap explicitly in the spec. |

**Gap:** OAuth loading overlay (`AUTH_TEST_IDS.components.oauthOverlay`) — renders while popup is open; cancel button present. Add to google-sign-in spec:

- ⬜ OAuth loading overlay appears after clicking social button
- ⬜ "Taking a while?" slow message appears after delay threshold
- ⬜ Cancel button dismisses overlay

### 1.4 Microsoft sign-in ⬜

**Spec to create:** `e2e/tests/expo/auth/microsoft-sign-in.spec.ts`
**testID:** `AUTH_TEST_IDS.login.microsoftButton`

Same pattern as Google sign-in spec — button renders, aria-label correct, clicking opens Microsoft OAuth popup (login.microsoftonline.com or firebase relay). Full OAuth completion not feasible.

### 1.5 Phone sign-in + OTP verify 🔶

**Specs:** `e2e/tests/expo/auth/otp-verify.spec.ts` (exists — rendering only)

| Flow | Status | Notes |
|---|---|---|
| OTP screen renders code input + submit | ✅ | |
| Back button navigates away | ✅ | |
| Phone login screen renders input + submit | ⬜ | testID: `AUTH_TEST_IDS.phoneLogin.phoneInput` |
| Invalid phone → validation error | ⬜ | |
| Valid phone → OTP sent → OTP verify screen shown | ⬜ | Mock Firebase SMS (use emulator or skip if unavailable) |
| Correct OTP code → login succeeds → navigates to app | ⬜ | |
| Wrong OTP → error shown | ⬜ | |

**Firebase note:** Phone auth requires Firebase Auth Emulator or real SMS. The Expo web build uses `signInWithPhoneNumber`. For E2E, use Firebase Auth Emulator (`firebase emulators:start`) with test phone number `+1 650-555-3434` / OTP `654321` — document this setup requirement in `e2e/.env.e2e.example`. If emulator is unavailable, mark this spec as `test.skip` and note the gap.

### 1.6 Select organisation (multi-org user) ✅

**Spec:** `e2e/tests/expo/auth/org-switch.spec.ts`

| Flow | Status |
|---|---|
| All organisations rendered from API | ✅ |
| Organisation names displayed | ✅ |
| Selecting an org navigates to tabs | ✅ |
| API 500 → screen still renders (no crash) | ✅ |

**Gaps:**

- ⬜ Single-org user: API returns one org → auto-selects, skips this screen
- ⬜ Org with logo image renders logo (vs initials fallback)
- ⬜ Drawer "Switch Organisation" button (`AUTH_TEST_IDS.drawer.switchOrg`) navigates back to this screen from within the app

### 1.7 Account setup (password-reset-via-link) ⬜

**Spec to create:** `e2e/tests/expo/auth/setup-account.spec.ts`
**testIDs:** `AUTH_TEST_IDS.setup.*` — `invalidLink`, `validating`, `tokenInvalid`, `backButton`, `submitButton`

| Flow | Status |
|---|---|
| Navigating to setup URL without token → invalid link state | ⬜ |
| Navigating with expired/invalid token → token invalid state | ⬜ |
| Valid token → form renders; submit sets password | ⬜ |
| Password rules checklist (`AUTH_TEST_IDS.components.passwordRules.rule(key)`) updates live | ⬜ |
| Back button navigates to login | ⬜ |

### 1.8 Complete-profile gate ⬜

**Spec to create:** `e2e/tests/expo/auth/complete-profile.spec.ts`
**testIDs:** `AUTH_TEST_IDS.components.completeProfile.*`

| Flow | Status |
|---|---|
| Gate shown when user has no display name | ⬜ |
| Name input accepts text | ⬜ |
| Empty name → submit disabled or validation error | ⬜ |
| Valid name → saved → gate dismissed, app loads normally | ⬜ |

### 1.9 Provider conflict sheet ⬜

**Spec to create:** inline in `google-sign-in.spec.ts` or `microsoft-sign-in.spec.ts`
**testIDs:** `AUTH_TEST_IDS.components.providerConflict.*`

| Flow | Status |
|---|---|
| Sheet shown when user tries to sign in with wrong provider | ⬜ |
| Dismiss button closes the sheet | ⬜ |

---

## 2. Home Screen

**Page object:** `e2e/expo/pages/home.page.ts`
**Source:** `apps/expo/src/features/home/presentation/`
**testID registry:** `HOME_TEST_IDS` in `home.copy.ts` + `e2e/expo/selectors.ts`

⚠️ **Discrepancy:** `selectors.ts` defines `HOME_TEST_IDS.activityGrid = 'home-activity-grid'` but the source `home.copy.ts` does not export an `activityGrid` key. Verify this testID is actually applied to the grid component in source before adding tests that depend on it. The spec currently uses it and it works — it may be applied in the component itself rather than via the copy.ts registry. Reconcile and add the key to `home.copy.ts` if missing.

### 2.1 Activity section ✅

**Spec:** `e2e/tests/expo/home/activity.spec.ts`

| Flow | Status |
|---|---|
| Week grid renders with days-played count | ✅ |
| Month grid renders after period toggle | ✅ |
| "No games scheduled" when `hasActiveAssignments=false` | ✅ |
| API 500 → section still renders; grid absent | ✅ |

**Gap:**

- ⬜ 📐 Period toggle layout differs on mobile (pill row) vs desktop (different placement) — verify both viewports render the toggle
- ⬜ Active days highlighted vs inactive days visually distinguishable (structural assertion)

### 2.2 League section ✅ 🔶

**Spec:** `e2e/tests/expo/home/league.spec.ts`

| Flow | Status |
|---|---|
| Bronze league shown with XP and progress bar | ✅ |
| Gold league shown with correct formatted XP | ✅ |
| Diamond (top) league — "You're at the top!" message | ✅ |
| API 500 → league section not rendered | ✅ |
| Promotion overlay on home screen (Bronze→Gold) | ✅ |
| Overlay dismisses on tap | ✅ |
| Promotion toast on non-home screen | ✅ |
| Toast does NOT appear on home screen (overlay handles it) | ✅ |
| Toast re-fires on reload (firedKeyRef resets) | ✅ |

**Gaps:**

- ⬜ Demotion overlay — when league drops (e.g. Gold→Silver) — does the overlay still appear, and with correct copy?
- ⬜ League badge image (`HOME_TEST_IDS.leagueBadge`) renders correct badge per league tier
- ⬜ 📐 League section layout on mobile (stacked) vs desktop (side-by-side card)
- ⬜ All 6 league tiers tested in promotion overlay (Bronze, Silver, Gold, Platinum, Diamond + top)

### 2.3 XP earned overlay ✅

**Spec:** `e2e/tests/expo/home/league.spec.ts` (XP Earned Animation section)

| Flow | Status |
|---|---|
| Overlay shown with amount + label for single event | ✅ |
| Overlay shows first event label in sequence | ✅ |
| Tap advances to next event | ✅ |
| No overlay when no unseen events | ✅ |
| API 500 → no overlay, league section still renders | ✅ |

**Gap:**

- ⬜ After all events dismissed → overlay disappears entirely
- ⬜ `DailyActivity` / `GameSession` / `ScoreboardBonus` label mapping all tested (currently: DailyActivity + GameSession covered, ScoreboardBonus partially)

### 2.4 Streak section ⬜

**testIDs:** `HOME_TEST_IDS.streakCounter`, `HOME_TEST_IDS.streakCelebrationOverlay`

| Flow | Status |
|---|---|
| No streak → streak counter shows 0 | ⬜ |
| 3-day streak → counter shows 3 | ⬜ |
| Streak celebration overlay fires when streak milestone is hit | ⬜ |
| Overlay dismisses on tap | ⬜ |
| Losing a streak (active days reset, counter back to 0) | ⬜ |
| 📐 Counter layout on mobile vs desktop | ⬜ |

### 2.5 Season stats strip ⬜

**testIDs:** `HOME_TEST_IDS.seasonStatsStrip`, `seasonStatRewards`, `seasonStatGamesWon`,
`seasonStatPassRate`, `seasonStatExplored`

| Flow | Status |
|---|---|
| Strip renders with all four stat cards | ⬜ |
| Rewards count shows correct value from API | ⬜ |
| Games won count shows correct value | ⬜ |
| Pass rate shown as percentage | ⬜ |
| Topics explored count shown | ⬜ |
| 0-state: all stats show 0 or dash when user has no activity | ⬜ |
| 📐 Strip scrolls horizontally on mobile; wraps or widens on desktop | ⬜ |

### 2.6 Continue reading / continue playing cards ⬜

**testIDs:** `HOME_TEST_IDS.continueReading`, `HOME_TEST_IDS.continuePlaying`

| Flow | Status |
|---|---|
| No topics in progress → "start reading" CTA shown | ⬜ |
| Topic partially read → "continue reading" card with progress bar | ⬜ |
| Tapping continue reading → navigates to correct topic cover | ⬜ |
| No active game assignments → "start playing" CTA shown | ⬜ |
| Active game assignment → "continue playing" card with game info | ⬜ |
| Tapping continue playing → navigates to game start screen | ⬜ |
| 📐 Cards are stacked on mobile; side-by-side on desktop | ⬜ |

### 2.7 Notifications bell ⬜

**testID:** `HOME_TEST_IDS.notificationsBell`

| Flow | Status |
|---|---|
| Bell renders in home header | ⬜ |
| Unread count badge appears when API returns unread notifications | ⬜ |
| Badge absent when all notifications read | ⬜ |
| Tapping bell opens notifications panel | ⬜ |

### 2.8 Hamburger menu / drawer ⬜

**testID:** `HOME_TEST_IDS.hamburgerMenu`

| Flow | Status |
|---|---|
| Hamburger button renders (mobile only, hidden on desktop nav) | ⬜ |
| Tapping hamburger opens the app drawer | ⬜ |
| Drawer contains "Switch Organisation" when user has multiple orgs | ⬜ |
| Tapping "Switch Organisation" → navigates to select-org screen | ⬜ |

---

## 3. Learn (Topics / Learning Centre)

**Page objects:** `learning-centre.page.ts`, `topic-cover.page.ts`, `module-cover.page.ts`, `module-media.page.ts`
**testID registry:** `LEARN_TEST_IDS` in `learn.copy.ts`

### 3.1 Learning centre list ✅ 🔶

**Spec:** `e2e/tests/expo/learn/learning-centre.spec.ts`

| Flow | Status |
|---|---|
| Screen container + search input render | ✅ |
| Topic cards rendered from API | ✅ |
| Empty state when API returns no topics | ✅ |
| Search term passed to API as query param | ✅ |

**Gaps:**

- ⬜ Category filter pill (`LEARN_TEST_IDS.categoryFilter`) renders when categories exist
- ⬜ Selecting a category pill (`LEARN_TEST_IDS.getCategoryPillId(id)`) sends correct filter param to API
- ⬜ Clearing category filter returns to unfiltered list
- ⬜ Topic card "new" chip (`LEARN_TEST_IDS.topicNewChip(id)`) visible when topic is new
- ⬜ Topic card "completed" chip (`LEARN_TEST_IDS.topicCompletedChip(id)`) visible when 100% read
- ⬜ Download topic button (`LEARN_TEST_IDS.downloadTopicButton(id)`) triggers download
- ⬜ Remove download button (`LEARN_TEST_IDS.removeDownloadButton(id)`) appears after download; removes offline content
- ⬜ 📐 Card layout: single column on mobile; 2-column grid on desktop
- ⬜ API 500 → error state rendered, no crash

### 3.2 Topic cover (categories list) ✅ 🔶

**Spec:** `e2e/tests/expo/learn/topic-cover.spec.ts`

| Flow | Status | Notes |
|---|---|---|
| Screen container + all category cards rendered | ✅ | Uses real login (E2E_ADMIN creds) |
| Empty categories list → empty state | ✅ | |
| API 500 → error state shown | ✅ | |

**Gaps:**

- ⬜ Module media card (`LEARN_TEST_IDS.getModuleMediaCardId(id)`) visible for categories with a media resource
- ⬜ Tapping a category card → navigates to module cover for that category
- ⬜ Progress percentage displayed on topic cover (progress bar or text)
- ⬜ Back button (`LEARN_TEST_IDS.backButton`) navigates to learning centre
- ⬜ 📐 Single-column list on mobile; 2-column on desktop

**Auth note:** This spec uses real email login (`E2E_ADMIN_EMAIL`). Migrate to `injectExpoFirebaseAuth` for consistency and speed — the mock-route approach in learning-centre.spec is the preferred pattern.

### 3.3 Module cover ✅

**Spec:** `e2e/tests/expo/learn/module-cover.spec.ts`

| Flow | Status |
|---|---|
| Title, content, and "Get StarterKit" button rendered (with media) | ✅ |
| No media → "Get StarterKit" absent | ✅ |
| API 500 → error state | ✅ |
| Cooldown active → "Get StarterKit" disabled with countdown | ✅ |
| No cooldown → "Get StarterKit" enabled | ✅ |

**Gaps:**

- ⬜ Tapping "Get StarterKit" → navigates to games landing (or game start for that topic's game)
- ⬜ 📐 Module content layout on mobile vs desktop

### 3.4 Module media screen ✅ 🔶

**Spec:** `e2e/tests/expo/learn/module-media.spec.ts`

| Flow | Status |
|---|---|
| Container + open-resource button rendered | ✅ |
| Title and content rendered | ✅ |
| Text-only module → error state ("couldn't load this category") | ✅ |
| API 500 → error state | ✅ |

**Gaps:**

- ⬜ `resourceMediaType = 'Video'` → video player rendered (`LEARN_TEST_IDS.videoViewerScreen`)
- ⬜ `resourceMediaType = 'Pdf'` → PDF viewer rendered (`LEARN_TEST_IDS.pdfViewerScreen`)
- ⬜ `resourceMediaType = 'Image'` → image viewer rendered (`LEARN_TEST_IDS.imageViewerScreen`)
- ⬜ Close button (`LEARN_TEST_IDS.closeMediaButton`) navigates back from media viewer
- ⬜ Reading progress tracked as user scrolls (progress % updates, "Game On" button appears)
- ⬜ 📐 Video/PDF fills viewport on mobile; centred/max-width on desktop

---

## 4. Games

**Page objects:** `games-landing.page.ts`, `game-session.page.ts`
**testID registry:** `GAMES_TEST_IDS`, `GAMES_SESSION_TEST_IDS`, `GAMES_CARD_TEST_IDS`, `QUESTION_TEST_IDS`

### 4.1 Games landing ✅ 🔶

**Spec:** `e2e/tests/expo/games/games-landing.spec.ts`

| Flow | Status |
|---|---|
| Screen container + info banner render | ✅ |
| Game cards rendered from API | ✅ |
| Empty state when no assignments | ✅ |
| Newest games appear first (bounding-box order check) | ✅ |

**Gaps:**

- ⬜ Search input (`GAMES_TEST_IDS.searchInput`) filters by game name
- ⬜ Status filter (`GAMES_TEST_IDS.statusFilter`) — status pills visible; selecting one filters list
- ⬜ Loading skeleton (`GAMES_TEST_IDS.loadingSkeleton`) shown while API call is in-flight
- ⬜ **Enforced display order** — when toggled, games grouped by category (`GAMES_CARD_TEST_IDS.getGroupId`), category header rendered (`getGroupHeaderId`), subsequent games locked until previous completed
- ⬜ Locked game card: play button disabled / shows lock icon
- ⬜ Tapping an active game card navigates to game start screen with correct assignmentId
- ⬜ Game card status pill (`GAMES_TEST_IDS.getGameCardStatusId`) shows correct status (not started / in progress / passed / failed / locked)
- ⬜ 📐 Single-column on mobile; grid/wider cards on desktop

### 4.2 Game session — start screen ✅

**Spec:** `e2e/tests/expo/games/game-session.spec.ts` (Start Screen section)

| Flow | Status |
|---|---|
| Start screen renders with game title and start button | ✅ |
| Game title displayed | ✅ |
| Pressing start calls API + navigates to play screen | ✅ |
| Correct assignmentId in POST body | ✅ |
| API 400 → error shown; no navigation | ✅ |
| API 500 → error shown; no navigation | ✅ |
| Double-tap prevention (only 1 API call) | ✅ |

### 4.3 Game session — play screen ✅ 🔶

**Spec:** `e2e/tests/expo/games/game-session.spec.ts` (Play Screen section)

| Flow | Status |
|---|---|
| Play screen with header + question progress | ✅ |
| Question text from API response | ✅ |
| Answer options from API response | ✅ |
| Selecting an option → advances to next question | ✅ |
| Answer POST body contains correct questionId | ✅ |
| Last question answered → complete endpoint called | ✅ |
| Navigate to results after all questions | ✅ |
| Cannot navigate to `/games/:id/play` without starting a session | ✅ |
| Answer API 500 → stays on play screen, question unchanged | ✅ |
| Exactly one answer POST per question (no duplicates) | ✅ |
| 3-question session completes correctly | ✅ |

**Gaps:**

- ⬜ **Timer** (`GAMES_SESSION_TEST_IDS.timerLabel`) — visible on timed games; counts down; game auto-submits when timer hits 0
- ⬜ **Session sidebar** (`GAMES_SESSION_TEST_IDS.sessionSidebar`) — visible on desktop; lists all questions with correct/incorrect/unanswered state
- ⬜ **Progress pills** (`getProgressPillId(i)`, `getProgressRowId(i)`) — correct/incorrect/unanswered state updates per answer
- ⬜ **Urgency vignette** (`errorVignette`, `urgencyVignette`) — shown as timer decreases below threshold
- ⬜ **Skip question button** (`GAMES_SESSION_TEST_IDS.skipQuestionButton`) — if available for game type
- ⬜ **Question error fallback** (`GAMES_SESSION_TEST_IDS.questionErrorFallback`) — rendered on malformed question data
- ⬜ **Submitting overlay** (`GAMES_SESSION_TEST_IDS.submittingOverlay`) — visible while complete API call is in-flight
- ⬜ **Completion error** (`GAMES_SESSION_TEST_IDS.completionError`) — shown when complete API returns 500
- ⬜ Completion error: retry button (`completionRetryButton`) retries completion call
- ⬜ Completion error: abandon button (`completionAbandonButton`) abandons session
- ⬜ **Confetti overlay** (`GAMES_SESSION_TEST_IDS.confettiOverlay`) — shown on passing score
- ⬜ 📐 Play screen: full-screen on mobile; centred/max-width on desktop
- ⬜ **Question types beyond Quiz** — each type must be tested:

| Question type | testID hook | Status |
|---|---|---|
| Multiple Choice (Quiz) | `QUESTION_TEST_IDS.getOptionId(id)` | ✅ (covered via text matching) |
| Fill-in-blank | `QUESTION_TEST_IDS.getBlankId(id)` | ⬜ |
| Statement building | `QUESTION_TEST_IDS.getBlankId(id)` | ⬜ |
| Match the terms | `QUESTION_TEST_IDS.getMatchSlotId(id)` | ⬜ |
| Word bucket | `QUESTION_TEST_IDS.getBucketId(id)` | ⬜ |
| Identify in image | `QUESTION_TEST_IDS.getTargetId(id)` | ⬜ |
| Match the image (tap cards with images) | `QUESTION_TEST_IDS.getOptionId(id)` | ⬜ |

### 4.4 Game session — abandon flow ✅

**Spec:** `e2e/tests/expo/games/game-session.spec.ts` (Abandon Flow section)

| Flow | Status |
|---|---|
| Confirming abandon calls abandon API + navigates away | ✅ |
| Cancelling abandon stays on play screen | ✅ |
| Abandon API 500 → still navigates away (best-effort) | ✅ |

### 4.5 Game session — splash + results ✅ 🔶

**Spec:** `e2e/tests/expo/games/game-session.spec.ts` (Results Screen section)

| Flow | Status |
|---|---|
| Splash screen shown before results | ✅ |
| "View results" button transitions to results | ✅ |
| Score percentage displayed | ✅ |
| XP earned displayed | ✅ |
| Correct count out of total displayed | ✅ |
| Continue button visible | ✅ |
| Passed state (100%) | ✅ |
| Failed state (50%) | ✅ |
| Continue button navigates back to games list | ✅ |
| Game title on results screen | ✅ |

**Gaps:**

- ⬜ **Retry button** (`GAMES_SESSION_TEST_IDS.retryButton`) — visible only when game PASSED with remaining attempts; absent when failed (cooldown applies)
- ⬜ Retry button navigates to start screen (attempt N+1)
- ⬜ All answers shown on results screen (correct highlighted, incorrect highlighted) — answer review list
- ⬜ XP earned animation on results screen (separate from home XP overlay)
- ⬜ No retry button when max attempts exhausted and cooldown active
- ⬜ Cooldown message + timer shown when game passed but cooldown applies

### 4.6 Category scoreboard after game ⬜

**testIDs:** `SCOREBOARD_TEST_IDS.categoryRetryButton`, `SCOREBOARD_TEST_IDS.categoryViewResultsButton`

| Flow | Status |
|---|---|
| Category scoreboard shown after game completion | ⬜ |
| Shows player ranks within the game's category | ⬜ |
| "View results" button navigates to game results | ⬜ |
| "Retry" button navigates to start screen | ⬜ |

### 4.7 Offline / pending session ⚠️ Maestro only

The app creates a PENDING session when a game is played offline and syncs when connectivity is restored. This requires native network toggling — implement in Maestro, not Playwright. Document the flow:

1. Put device in airplane mode
2. Navigate to game → start → play → complete
3. App stores a pending session locally
4. Restore network
5. Pending session syncs → confirmed server-side
6. Game card status updates to reflect the completed session

---

## 5. Scoreboard

**Page object:** `e2e/expo/pages/scoreboard.page.ts`
**testID registry:** `SCOREBOARD_TEST_IDS` in `scoreboard.copy.ts`

### 5.1 Happy path ✅ 🔶

**Spec:** `e2e/tests/expo/games/scoreboard.spec.ts`

| Flow | Status |
|---|---|
| Top-3 section renders with correct cards | ✅ |
| Remaining ranked entries (4+) rendered | ✅ |
| Current user row highlighted | ✅ |
| Period picker renders (week / month / season) | ✅ |
| Selecting a different period re-fetches | ✅ |
| API 500 → error state; scroll view absent | ✅ |

**Gaps:**

- ⬜ **Empty state** — when API returns 0 entries (no scoreboard data yet), empty/no-results view shown
- ⬜ **Large dataset** — mock 100+ entries; pagination / virtual scroll does not crash; current user entry still pinned/visible when off-screen (if implemented)
- ⬜ **Top 3 celebration** — when current user is rank 1, 2, or 3, celebration overlay appears
- ⬜ **Moving up / down animation** — structural: assert element is present when rank changes between poll cycles (animation is visual; just verify the container element appears)
- ⬜ **Metric selector** — if there is a metric picker (points / accuracy), switching updates results
- ⬜ 📐 Scoreboard layout differs on mobile vs desktop (single column vs wider card)

---

## 6. Rewards

**Page object:** `e2e/expo/pages/rewards.page.ts`
**testID registry:** `REWARDS_TEST_IDS` in `rewards.copy.ts`

### 6.1 Rewards landing ✅ 🔶

**Spec:** `e2e/tests/expo/rewards/rewards-landing.spec.ts`

| Flow | Status |
|---|---|
| Screen container renders | ✅ |
| Reward cards rendered for each reward | ✅ |
| Empty state when no rewards | ✅ |
| API 500 → error state (no cards) | ✅ |
| Duotone filter on unlocked preset badge | ✅ |
| No filter on unlocked custom-upload image | ✅ |
| No filter on locked preset badge | ✅ |
| Reward unlock toast (unseen rewards) | ✅ |
| Toast not re-fired after MMKV stores notified IDs | ✅ |
| Toast shows only newly unlocked rewards after partial notification | ✅ |

**Gaps:**

- ⬜ **Locked reward card** visually distinct (greyed out, lock icon) vs unlocked card
- ⬜ **Progress bar** on locked reward showing `currentCount / requiredCount`
- ⬜ **Stackable rewards** — `instanceCount > 1` shows stack count badge on card
- ⬜ **Fallback icon** (`REWARDS_TEST_IDS.fallbackIcon`) rendered when both `imageUrl` and `presetImageUrl` are null
- ⬜ **Progress hero / card** (`REWARDS_TEST_IDS.progressHero`, `REWARDS_TEST_IDS.progressCard`) — summary of earned vs total rewards
- ⬜ **Tapping a reward card** → opens reward detail view with full description and earned date
- ⬜ **Celebration overlay** (`REWARDS_TEST_IDS.celebrationOverlay`) — shown when a new reward is unlocked (direct navigation or post-game)
- ⬜ 📐 Card grid: 2 columns on mobile; 3–4 columns on desktop

### 6.2 Reward detail view ⬜

| Flow | Status |
|---|---|
| Detail view renders with reward name, description, image | ⬜ |
| Earned date shown | ⬜ |
| Company colours applied to reward visuals | ⬜ |
| Back button returns to rewards list | ⬜ |

---

## 7. Profile / Settings / Help

**Page object:** `e2e/expo/pages/profile.page.ts`
**testID registries:** `PROFILE_TEST_IDS`, `EDIT_PROFILE_TEST_IDS`, `HELP_TEST_IDS`, `SETTINGS_TEST_IDS`, `SEASON_HISTORY_TEST_IDS`

### 7.1 Profile screen ✅ 🔶

**Spec:** `e2e/tests/expo/profile/profile.spec.ts`

| Flow | Status |
|---|---|
| Display name and email rendered from API | ✅ |
| Name field in edit section renders | ✅ |
| Avatar button renders | ✅ |
| API 500 → screen still renders (auth-store fallback) | ✅ |

**Gaps:**

- ⬜ Stats section (XP, league, rewards, games won / total, streak) renders correct values from API
- ⬜ Weekly activity section renders days-played grid
- ⬜ Season summary cards (historical seasons) render

### 7.2 Edit profile ✅ 🔶

**Spec:** `e2e/tests/expo/profile/profile.spec.ts` (Edit Profile section)

| Flow | Status |
|---|---|
| Navigate to edit profile (tap name field) | ✅ |
| Fill new display name + save → profile updated | ✅ |
| Empty name → stays on edit screen (validation) | ✅ |

**Gaps:**

- ⬜ **Avatar change** (`EDIT_PROFILE_TEST_IDS.avatarButton`) — tap opens avatar picker; selecting changes avatar
- ⬜ **Change password** (`AUTH_TEST_IDS.components.changePassword.submitButton`) — section visible only for email-auth users; entering current + new password → success
- ⬜ PATCH request body contains correct `displayName`
- ⬜ Cancel edit (back button) → no changes saved

### 7.3 Logout ⬜

**testID:** `PROFILE_TEST_IDS.logoutButton`

| Flow | Status |
|---|---|
| Logout button visible on profile screen | ⬜ |
| Tapping logout shows confirmation (if applicable) | ⬜ |
| Confirming logout → Firebase sign-out → redirects to login | ⬜ |
| After logout, navigating to protected route → redirects to login | ⬜ |

### 7.4 Help screen ⬜

**testIDs:** `HELP_TEST_IDS.*`

| Flow | Status |
|---|---|
| Help screen renders with subject + body inputs and send button | ⬜ |
| Empty form → validation errors shown | ⬜ |
| Filled form → send → success view shown | ⬜ |
| "Done" button on success view navigates back | ⬜ |
| API 500 → error shown; form still usable | ⬜ |

### 7.5 Settings screen ⬜

**testIDs:** `SETTINGS_TEST_IDS.*`

| Flow | Status |
|---|---|
| Screen renders all toggles (notifications, sounds, dark mode, reduce motion, score metric) | ⬜ |
| Notifications toggle saves preference | ⬜ |
| Sounds toggle saves preference | ⬜ |
| Volume slider renders and value persists | ⬜ |
| Dark mode toggle changes theme immediately | ⬜ |
| Reduce motion toggle disables animations | ⬜ |

### 7.6 Season history ⬜

**testIDs:** `SEASON_HISTORY_TEST_IDS.*`

| Flow | Status |
|---|---|
| Loading skeleton shown while fetching | ⬜ |
| Season list renders with correct season names + stats | ⬜ |
| Empty state when no completed seasons | ⬜ |

---

## 8. Notifications panel

**testID registry:** `NOTIFICATIONS_TEST_IDS` in `notifications.copy.ts`

### 8.1 Notifications panel ⬜

| Flow | Status |
|---|---|
| Bell tap opens panel (`notifications-panel-container`) | ⬜ |
| Panel renders notification items | ⬜ |
| "Mark all read" button visible when unread items present | ⬜ |
| Tapping "Mark all read" → all items marked read, button disappears | ⬜ |
| "Mark all read" spinner shown while mutation pending | ⬜ |
| Overlay backdrop tap closes panel | ⬜ |
| Close (X) button closes panel | ⬜ |
| Infinite scroll: scrolling to bottom loads next page (list-footer spinner) | ⬜ |
| 📐 Mobile: panel slides in full-screen; desktop: side panel overlay |  ⬜ |

---

## 9. Chained / multi-assertion flows

These flows cross feature boundaries and assert the complete user journey rather than individual screens. Each should be a separate spec file under `e2e/tests/expo/integration/`.

### 9.1 Learn → Game chain ⬜

1. Navigate to Learning Centre → select topic → open category (module cover)
2. Assert "Get StarterKit" button visible and enabled
3. Tap "Get StarterKit" → verify navigation to game start screen (correct assignmentId)
4. Start game → answer all questions → reach results
5. Assert XP earned > 0 on results screen
6. Navigate to Scoreboard → assert current user appears in list

### 9.2 Play game → Unlock reward chain ⬜

1. Mock rewards API to return a reward with `hasSeen: false` after game completion
2. Complete a game session (mocked questions)
3. Navigate to Rewards screen
4. Assert the newly unlocked reward card is visible and unlocked
5. Assert reward uses company colour (duotone filter applied to preset badge)
6. Tap reward card → assert detail view opens with correct reward name and description
7. Assert celebration overlay appeared on rewards screen (or during navigation)

### 9.3 Streak accumulation ⬜

1. Mock activity API to return 6 active days out of 7
2. Load home screen → assert streak counter shows 6
3. Mock activity API to return 7 active days (target met)
4. Reload home screen → assert streak celebration overlay fires
5. Dismiss overlay → assert it's gone; counter still shows 7

### 9.4 League promotion chain ⬜

1. Mock XP summary returning a new (higher) league
2. Pre-seed MMKV with prior league
3. Load non-home screen → assert promotion toast
4. Navigate to home screen → assert promotion overlay (not toast)
5. Dismiss overlay → assert MMKV updated (no overlay on re-load)

---

## 10. Auth strategy summary

| Method | E2E approach | Feasibility | Gap |
|---|---|---|---|
| Email / password | Real Firebase (E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD) | ✅ Implemented | Credentials must be in `.env.e2e` |
| Firebase IDB injection | `injectExpoFirebaseAuth(page)` from `auth.ts` | ✅ Implemented | Most auth-dependent specs use this |
| Google OAuth | Popup trigger only (no completion) | ✅ Implemented | Full OAuth blocked by Google |
| Microsoft OAuth | Not yet implemented | ⬜ | Same limitation as Google |
| Phone + OTP | Firebase Auth Emulator required | ⬜ | Setup needed: `firebase emulators:start --only auth`; test phone `+1 650-555-3434` / OTP `654321` |
| Account setup link | Token from real/seeded invite email | ⬜ | Use backend test API to issue a valid token |

---

## 11. Viewport testing strategy

Add two Playwright projects to `playwright.expo.config.ts`:

```ts
projects: [
  { name: 'expo-mobile',  use: { ...devices['iPhone 14'],       baseURL: 'http://localhost:8081' } },
  { name: 'expo-desktop', use: { viewport: { width: 1280, height: 800 }, baseURL: 'http://localhost:8081' } },
]
```

**Flows that differ by viewport (must be asserted in both projects):**

| Flow | Mobile difference | Desktop difference |
|---|---|---|
| Activity grid | Full-width; period toggle is pill row | Wider; period toggle may be elsewhere |
| League section | Stacked card layout | Side-by-side or wider card |
| Bottom tab nav | `TabBar` at bottom of screen | May render as side nav or top nav |
| Hamburger menu | Visible; opens drawer | Hidden; nav is inline |
| Notifications | Full-screen slide-up | Side panel overlay |
| Games landing | Single-column card list | 2-column grid |
| Learning centre | Single-column topic cards | 2-column grid |
| Game session play | Full-screen question | Centred/max-width |
| Game session sidebar | Hidden / collapsed | Visible with progress list |
| Rewards grid | 2 columns | 3–4 columns |

---

## 12. E2E vs unit test delineation

| Assertion type | Where it lives | Rationale |
|---|---|---|
| Exact stat calculation (XP totals, pass rate) | **Unit tests** (Phase 1) | Computed from typed inputs — faster, deterministic |
| Number formatting (1,250 XP) | **Unit tests** (Phase 1) | Vitest snapshot tests already cover this |
| API route shape / response mapping | **Unit tests** (Phase 1) | Datasource + hook tests |
| Correct API called with correct params | **E2E** (Playwright `page.waitForRequest`) | Verifies real wiring in browser context |
| Navigation (correct route, correct params) | **E2E** | Router integration not possible in unit tests |
| Visual layout at mobile vs desktop | **E2E** | Responsive layout requires a real viewport |
| Animation / overlay appears | **E2E** | Timing-dependent; not reliably unit-testable |
| MMKV persistence across page reload | **E2E** (localStorage simulation) | Requires browser environment |
| Offline → pending session → sync | **Maestro only** | Requires native network toggle |

---

## 13. Known gaps / outstanding issues

1. ⚠️ **`HOME_TEST_IDS.activityGrid` discrepancy** — `selectors.ts` defines `'home-activity-grid'`; the source `home.copy.ts` does not export this key. Verify the testID is applied in the ActivityGrid component; if so, add it to `home.copy.ts` to close the drift.

2. ⚠️ **`selectors.ts` `AUTH_TEST_IDS.login.registerLink`** — the spec comment says "Register link was removed from the expo login screen." The `selectors.ts` still exports `registerLink`. Remove this dead export.

3. ⚠️ **Topic cover + module cover specs use real login** — these two specs use `LoginPage.fillAndSubmit(E2E_EMAIL, E2E_PASSWORD)` instead of `injectExpoFirebaseAuth`. Migrate them for consistency and to avoid Firebase rate-limit issues in CI.

4. ⚠️ **`register.page.ts` exists in `e2e/expo/pages/`** — the register flow was removed from the app. Delete or repurpose this page object.

5. ⚠️ **Google sign-in spec uses raw `AUTH_TEST_IDS` from `e2e/expo/selectors.ts` but the selectors copy includes `login.registerLink`** — the auth-spec file imports from `selectors.ts` but `auth.copy.ts` (the source of truth) no longer has `registerLink`. Keep `selectors.ts` in sync with `auth.copy.ts`.

6. ⚠️ **Question types** — game-session spec only tests `Quiz` (multiple choice with text options). All other question types (`FillInBlank`, `StatementBuilding`, `MatchTheTerms`, `WordBucket`, `IdentifyInImage`, `MatchTheImage`) need fixture data and corresponding tests. The answer mechanism (drag-and-drop for match/bucket, tap-to-place for identify-in-image) will require specific Playwright interaction patterns.

7. ⚠️ **Sounds / audio** — Keelan's raw spec mentions "sounds play (and DON'T play when muted)." Audio playback cannot be reliably asserted in a headless Playwright browser. Assert instead: (a) the audio element is present/absent in the DOM, or (b) the settings toggle for sounds writes the expected value to storage. Document this limitation.

---

## 14. File/folder map for Phase 2 implementation

```text
e2e/
  tests/
    expo/
      auth/
        login.spec.ts              ✅ exists
        google-sign-in.spec.ts     ✅ exists — add OAuth overlay tests
        microsoft-sign-in.spec.ts  ⬜ create
        otp-verify.spec.ts         ✅ exists — add phone flow
        forgot-password.spec.ts    ⬜ create
        setup-account.spec.ts      ⬜ create
        complete-profile.spec.ts   ⬜ create
        org-switch.spec.ts         ✅ exists — add single-org + drawer tests
      home/
        activity.spec.ts           ✅ exists — add viewport tests
        league.spec.ts             ✅ exists — add demotion, all tiers, viewport
        streak.spec.ts             ⬜ create
        season-stats.spec.ts       ⬜ create
        continue-cards.spec.ts     ⬜ create
        notifications-bell.spec.ts ⬜ create
      learn/
        learning-centre.spec.ts    ✅ exists — add filter, chips, download
        topic-cover.spec.ts        ✅ exists — migrate to injectAuth; add tap-to-module
        module-cover.spec.ts       ✅ exists — migrate to injectAuth; add tap-Get-StarterKit
        module-media.spec.ts       ✅ exists — add media type tests
      games/
        games-landing.spec.ts      ✅ exists — add search, filter, enforced-order
        game-session.spec.ts       ✅ exists — add timer, question types, sidebar, completion error
        scoreboard.spec.ts         ✅ exists — add empty state, top-3 celebration, pagination
        category-scoreboard.spec.ts ⬜ create
      rewards/
        rewards-landing.spec.ts    ✅ exists — add detail view, celebration overlay, stacked
      profile/
        profile.spec.ts            ✅ exists — add stats, logout, avatar, change-password
        settings.spec.ts           ⬜ create
        help.spec.ts               ⬜ create
        season-history.spec.ts     ⬜ create
      notifications/
        notifications-panel.spec.ts ⬜ create
      integration/
        learn-to-game.spec.ts      ⬜ create (§9.1)
        game-to-reward.spec.ts     ⬜ create (§9.2)
        streak-accumulation.spec.ts ⬜ create (§9.3)
        league-promotion.spec.ts   ✅ mostly covered in home/league.spec.ts
  expo/
    pages/
      login.page.ts                ✅
      register.page.ts             ⚠️ delete (register removed)
      otp-verify.page.ts           ✅
      select-org.page.ts           ✅
      home.page.ts                 ✅ — add streak, season stats, continue cards, bell
      games-landing.page.ts        ✅ — add search, filter, group cards
      game-session.page.ts         ✅ — add timer, sidebar, question type helpers
      scoreboard.page.ts           ✅
      rewards.page.ts              ✅ — add celebration, detail
      profile.page.ts              ✅ — add logout, settings, help, season history
      learning-centre.page.ts      ✅ — add category filter, download
      topic-cover.page.ts          ✅
      module-cover.page.ts         ✅
      module-media.page.ts         ✅
      notifications.page.ts        ⬜ create
    selectors.ts                   ⚠️ clean up dead exports (registerLink)
```

---

*Generated: 2026-06-30 by Claude Sonnet 4.6 — ABC-123 Phase 2 Step 1*
*Next step: Keelan reviews and approves this doc, then Phase 2 E2E test implementation begins.*
