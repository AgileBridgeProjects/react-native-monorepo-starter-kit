/**
 * Change → spec mapping for affected-only E2E selection.
 *
 * Imported by both `e2e/scripts/e2e-affected.mjs` (the local runner) and
 * `scripts/check-e2e-attestation.mjs` (the CI gate), so the two can never disagree
 * about what a given diff is expected to cover.
 *
 * Rules and conventions are documented in docs/standards/e2e-testing.md
 * § Affected-spec selection — that file wins. In short:
 *   - rules are unioned, not first-match
 *   - a path matching no rule is reported `uncovered`, never inflated to the full suite
 *   - `specs: []` records deliberately uncovered ground; always explain it in `why`
 */

const WEB_SUITE = 'tests/web';
const EXPO_SUITE = 'tests/expo';

/** Playwright projects per suite. Expo runs one viewport locally, three in CI. */
const WEB_PROJECTS = ['web'];
const EXPO_PROJECTS = ['expo-web'];
const EXPO_ALL_VIEWPORTS = ['expo-web', 'expo-web-tablet', 'expo-web-mobile'];

const WEB_ALL = [WEB_SUITE];
const EXPO_ALL = [EXPO_SUITE];

/**
 * Changed-path prefix → spec paths (relative to `e2e/`).
 *
 * A file matches a rule when it equals a rule path or starts with it, so directory
 * entries carry a trailing slash and extension-less entries (`apps/web/next.config`)
 * match any extension.
 *
 * @type {{ paths: string[], specs: string[], why: string }[]}
 */
const RULES = [
  // ── Shared code + the harness itself: can break either suite ──────────────
  {
    paths: [
      'packages/',
      'package.json',
      'package-lock.json',
      'tsconfig.base.json',
      'e2e/playwright.config.ts',
      'e2e/playwright.expo-local.config.ts',
      'e2e/playwright/',
      'e2e/expo/',
      'e2e/docker-compose.e2e.yml',
      'e2e/scripts/run-e2e.sh',
      'e2e/scripts/affected-specs.mjs',
      // A Playwright bump or tsconfig change affects how every spec compiles/runs.
      'e2e/package.json',
      'e2e/package-lock.json',
      'e2e/tsconfig.json',
    ],
    specs: [...WEB_ALL, ...EXPO_ALL],
    why: 'shared packages / E2E harness',
  },

  // ── Admin portal — shared shell ───────────────────────────────────────────
  {
    paths: [
      'apps/web/src/components/',
      'apps/web/src/lib/',
      'apps/web/src/store/',
      'apps/web/src/proxy/',
      'apps/web/src/messages/',
      'apps/web/src/app/layout',
      'apps/web/src/app/globals.css',
      'apps/web/src/app/api/',
      'apps/web/next.config',
      'apps/web/package.json',
    ],
    specs: WEB_ALL,
    why: 'admin-portal shell / shared web code',
  },

  // ── Admin portal — per feature ────────────────────────────────────────────
  {
    paths: [
      'apps/web/src/features/audit-log/',
      'apps/web/src/app/audit-logs/',
      'apps/backend/src/StarterKit.Core/Auditing/',
    ],
    specs: ['tests/web/audit-log'],
    why: 'audit log',
  },
  {
    paths: [
      'apps/web/src/features/auth/',
      'apps/web/src/app/login/',
      'apps/web/src/app/forgot-password/',
      'apps/web/src/app/setup-account/',
      'apps/backend/src/StarterKit.Core/Auth/',
      'apps/backend/src/StarterKit.Auth/',
    ],
    specs: ['tests/web/auth'],
    why: 'web auth / authorization',
  },
  {
    paths: [
      'apps/web/src/features/clubs/',
      'apps/web/src/app/clubs/',
      'apps/web/src/features/workspace/',
      'apps/backend/src/StarterKit.Core/Clubs/',
    ],
    specs: ['tests/web/clubs'],
    why: 'clubs / workspace switching',
  },
  {
    paths: [
      'apps/web/src/features/reflection-templates/',
      'apps/web/src/app/reflection-templates/',
      'apps/backend/src/StarterKit.Core/Reflections/',
    ],
    specs: ['tests/web/reflection-templates'],
    why: 'reflection templates',
  },
  {
    paths: [
      'apps/web/src/features/roles/',
      'apps/web/src/app/roles/',
      'apps/backend/src/StarterKit.Core/Roles/',
    ],
    specs: ['tests/web/roles'],
    why: 'roles',
  },
  {
    paths: [
      'apps/web/src/features/users/',
      'apps/web/src/app/users/',
      'apps/web/src/features/mobile-setup/',
      'apps/web/src/app/mobile-setup-account/',
      'apps/backend/src/StarterKit.Core/Users/',
    ],
    specs: ['tests/web/users'],
    why: 'users / mobile setup',
  },

  // ── Backend cross-cutting: every real-backend web spec is in scope ────────
  {
    paths: [
      'apps/backend/src/StarterKit.Data/',
      'apps/backend/src/StarterKit.WebApi/',
      'apps/backend/src/StarterKit.Migrator/',
      'apps/backend/src/StarterKit.Core/Common/',
      'apps/backend/src/StarterKit.Core/Shared/',
      'apps/backend/src/StarterKit.Core/Models/',
      'apps/backend/src/StarterKit.Core/Enums/',
      'apps/backend/src/StarterKit.Core/Extensions/',
      'apps/backend/src/StarterKit.Core/Validation/',
      'apps/backend/src/StarterKit.Core/Configuration/',
      'apps/backend/src/StarterKit.Core/Caching/',
    ],
    specs: WEB_ALL,
    why: 'backend data/API layer — all real-backend web specs',
  },

  // ── Expo — shared shell ───────────────────────────────────────────────────
  {
    paths: [
      'apps/expo/src/lib/',
      'apps/expo/src/store/',
      'apps/expo/src/proxy/',
      'apps/expo/app/_layout',
      'apps/expo/package.json',
      'apps/expo/app.config',
      'apps/expo/metro.config',
      'apps/expo/global.css',
    ],
    specs: EXPO_ALL,
    why: 'expo shell / shared mobile code',
  },

  // ── Expo — per feature ────────────────────────────────────────────────────
  {
    paths: ['apps/expo/src/features/auth/', 'apps/expo/app/(auth)/', 'apps/expo/app/auth/'],
    specs: ['tests/expo/auth'],
    why: 'expo auth',
  },
  {
    paths: ['apps/expo/src/features/profile/'],
    specs: ['tests/expo/profile'],
    why: 'expo profile',
  },
  {
    paths: ['apps/expo/src/features/journal-alerts/', 'apps/expo/app/(detail)/journal-alerts.tsx'],
    specs: ['tests/expo/journal-alerts'],
    why: 'expo journal alerts inbox',
  },
  {
    paths: [
      'apps/expo/src/features/disc/',
      'apps/expo/app/(detail)/disc.tsx',
      'apps/expo/app/(detail)/disc/',
    ],
    specs: ['tests/expo/disc'],
    why: 'expo DISC assessment',
  },

  // ── Deliberately uncovered — recorded, not silently unmapped ──────────────
  // Non-application code. Listed explicitly so the `uncovered` warning stays
  // meaningful: anything it reports is real app code with no mapping yet.
  // `infra/` is deliberately absent — a stack change should make you think.
  {
    paths: [
      'docs/',
      '.github/',
      '.claude/',
      '.agents/',
      '.codex/',
      '.vscode/',
      '_bmad/',
      '_bmad-output/',
      'graphify-out/',
      'patches/',
      'scripts/',
      'tools/',
      '.husky/',
      'e2e/scripts/e2e-affected.mjs',
      'e2e/scripts/report-failures.ts',
      'e2e/scripts/pull-env.mjs',
      'e2e/README.md',
      'e2e/.env.e2e.example',
      'README.md',
      'CLAUDE.md',
      'AGENTS.md',
      '.gitignore',
      '.gitattributes',
      '.editorconfig',
      'biome.json',
      'knip.json',
      'turbo.json',
      'commitlint.config.mjs',
      'lint-staged.config.mjs',
      '.markdownlint-cli2.jsonc',
    ],
    specs: [],
    why: 'not application code',
  },
  {
    paths: ['apps/web/src/app/teams/', 'apps/backend/src/StarterKit.Core/Teams/'],
    specs: [],
    why: 'teams has no Playwright coverage yet',
  },
  {
    // The reporting domain is real and backend-only — there is no /reports page in the admin
    // portal (see apps/web/src/app). The 65 specs that used to be mapped here were scaffold
    // carry-over testing a page that has never existed in StarterKit, so they could only ever
    // fail; they were deleted rather than left red. Snapshot/upsert behaviour is covered by
    // the backend test suite. Map this to real specs when the UI is actually built.
    paths: ['apps/backend/src/StarterKit.Core/Reports/'],
    specs: [],
    why: 'reporting is backend-only — no admin-portal UI to drive yet',
  },
  {
    paths: [
      'apps/expo/src/features/messages/',
      'apps/expo/src/features/check-ins/',
      'apps/expo/src/features/notifications/',
      'apps/expo/src/features/onboarding/',
      'apps/expo/app/(tabs)/',
      'apps/expo/app/(detail)/',
      'apps/expo/app/onboarding/',
      'e2e/maestro/',
    ],
    specs: [],
    why: 'Maestro-only flows — no Playwright coverage',
  },
  {
    paths: [
      'apps/backend/src/StarterKit.MobileApi/',
      'apps/backend/src/StarterKit.Mcp/',
      'apps/backend/src/StarterKit.Core/Messages/',
      'apps/backend/src/StarterKit.Core/CheckIns/',
      'apps/backend/src/StarterKit.Core/Notifications/',
      'apps/backend/src/StarterKit.Core/PushNotifications/',
      'apps/backend/src/StarterKit.Core/Seasons/',
      // tests/expo/journal-alerts mocks GET /api/journal-alerts at the route level (see
      // e2e/tests/expo/journal-alerts/journal-alerts.spec.ts), so it never reaches this code —
      // mapping it there would claim coverage the spec doesn't provide. Regression coverage for
      // this module is the real-encryption-service unit test in
      // StarterKit.Core.Tests/Journal/Mappers instead.
      'apps/backend/src/StarterKit.Core/Journal/',
      // tests/expo/disc mocks session/answer/submit at the route level with a fixed
      // SUBMIT_RESULT (see e2e/tests/expo/disc/disc-assessment.spec.ts), so it never calls
      // DiscAssessmentService/DiscStyleRanker. Regression coverage for the scoring formula is
      // StarterKit.Core.Tests/Disc instead.
      'apps/backend/src/StarterKit.Core/Disc/',
      'apps/backend/tests/StarterKit.Core.Tests/Disc/',
    ],
    specs: [],
    why: 'no Playwright coverage — the Expo suite runs a static export with synthetic auth and never calls these',
  },
];

/** @param {string} file */
function matchRules(file) {
  return RULES.filter((rule) => rule.paths.some((p) => file === p || file.startsWith(p)));
}

/** Drop `tests/web/x` when the whole `tests/web` suite is already selected. */
function collapse(specs) {
  const unique = [...new Set(specs)];
  const suites = unique.filter((s) => s === WEB_SUITE || s === EXPO_SUITE);
  return unique
    .filter((spec) => !suites.some((suite) => spec !== suite && spec.startsWith(`${suite}/`)))
    .sort();
}

/** @param {string} spec */
function suiteOf(spec) {
  return spec.startsWith(EXPO_SUITE) ? EXPO_SUITE : WEB_SUITE;
}

/**
 * Resolve a list of changed repo-relative paths to the specs that cover them.
 *
 * @param {string[]} changedFiles
 * @returns {{
 *   specs: string[],
 *   reasons: Record<string, string[]>,
 *   uncovered: string[],
 *   knownUncovered: { file: string, why: string }[],
 * }}
 */
export function resolveAffected(changedFiles) {
  const specs = new Set();
  /** @type {Record<string, Set<string>>} */
  const reasons = {};
  const uncovered = [];
  const knownUncovered = [];

  for (const raw of changedFiles) {
    const file = raw.replaceAll('\\', '/').trim();
    if (!file) continue;

    const matched = matchRules(file);
    if (matched.length === 0) {
      uncovered.push(file);
      continue;
    }
    if (matched.every((rule) => rule.specs.length === 0)) {
      knownUncovered.push({ file, why: matched[0].why });
      continue;
    }
    for (const rule of matched) {
      for (const spec of rule.specs) {
        specs.add(spec);
        if (!reasons[spec]) reasons[spec] = new Set();
        reasons[spec].add(rule.why);
      }
    }
  }

  return {
    specs: collapse([...specs]),
    reasons: Object.fromEntries(Object.entries(reasons).map(([k, v]) => [k, [...v].sort()])),
    uncovered: uncovered.sort(),
    knownUncovered,
  };
}

/**
 * Playwright projects needed for a spec selection.
 *
 * @param {string[]} specs
 * @param {{ allViewports?: boolean }} [options]
 */
export function projectsFor(specs, options = {}) {
  const projects = new Set();
  for (const spec of specs) {
    if (suiteOf(spec) === EXPO_SUITE) {
      for (const p of options.allViewports ? EXPO_ALL_VIEWPORTS : EXPO_PROJECTS) projects.add(p);
    } else {
      for (const p of WEB_PROJECTS) projects.add(p);
    }
  }
  return [...projects];
}

/**
 * Split a selection into the web specs (need Docker + the isolated WebApi) and the
 * expo specs (static export + synthetic auth — no backend at all).
 *
 * @param {string[]} specs
 */
export function partitionBySuite(specs) {
  return {
    web: specs.filter((s) => suiteOf(s) === WEB_SUITE),
    expo: specs.filter((s) => suiteOf(s) === EXPO_SUITE),
  };
}
