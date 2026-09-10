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
const SUITES = [WEB_SUITE, EXPO_SUITE];

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
      // The derived store / runtime version numbers (mobile-version.mjs). A version bump
      // changes nothing a spec can observe: the runtime is a label installed builds are
      // matched against, and the store version is metadata. Without this every bump reads
      // as a coverage hole.
      'apps/expo/version.json',
      // Tests for the selector itself — they run under `npm run check`, not Playwright, so a
      // change here proves nothing about the app. This does not collide with the harness
      // rule's `e2e/scripts/affected-specs.mjs`: prefix matching compares `.test.mjs`
      // against `.mjs` and fails, so only this rule matches.
      'e2e/scripts/affected-specs.test.mjs',
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
      'apps/backend/src/StarterKit.Core/Notifications/',
      'apps/backend/src/StarterKit.Core/PushNotifications/',
      'apps/backend/src/StarterKit.Core/Seasons/',
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

// ── package.json: content-aware, not path-aware ──────────────────────────────
//
// Every `package.json` in the tree is mapped to at least one suite, because a dependency
// change can alter what a spec runs against. But the same file also holds `scripts`, and a
// scripts-only edit — a new npm script, a renamed check — selected the full suites for a
// change that cannot reach a browser. Root `package.json` in particular changes on most
// tooling PRs. So a `package.json` path counts only when one of the sections below differs
// between the two ends of the range; the callers supply the two texts because only they know
// whether "head" means a commit or the working tree.

/**
 * Top-level keys that provably cannot reach a suite. Everything else can, including keys
 * nobody has thought of yet — which is why this is an allow-list of inert keys rather than a
 * list of dangerous ones. Listing the dangerous keys instead let `exports`, `main`, `types` and
 * `type` through: re-pointing `packages/shared`'s `exports` map changes what every spec imports
 * while touching no dependency section at all.
 */
export const PACKAGE_JSON_INERT_KEYS = [
  'name',
  'version',
  'description',
  'keywords',
  'author',
  'license',
  'repository',
  'bugs',
  'homepage',
  'private',
  'scripts', // conditionally — see HARNESS_SCRIPTS
  'packageManager',
  'devEngines',
];

/**
 * Script names the E2E harness itself invokes. A change to one of these changes how the specs
 * run, so `scripts` is inert only when no changed key is in this set.
 *
 * `scripts` was briefly treated as wholly inert, which was wrong:
 * `e2e/playwright.config.ts` boots the entire web suite with `npm run dev:e2e -w apps/web`, so
 * redefining that one script (say, adding `--turbopack` back, the regression its own comment
 * warns about) would have shipped with the E2E gate requiring nothing.
 *
 * The set does not need to be exhaustive to be safe. The only way a script reaches a spec is
 * by being invoked from the harness, and every file that does the invoking (`e2e/**`) is
 * already mapped to both suites — so wiring up a new one selects the suites on its own.
 */
export const HARNESS_SCRIPTS = [
  'dev:e2e', // e2e/playwright.config.ts — the web suite's server
  'dev:expo', // the Metro server the expo-web specs attach to locally
  'e2e',
  'e2e:affected',
  'e2e:playwright',
  'e2e:maestro',
];

/** Script keys whose value differs between the two ends. */
export function changedScriptKeys(baseScripts, headScripts) {
  const keys = new Set([...Object.keys(baseScripts ?? {}), ...Object.keys(headScripts ?? {})]);
  return [...keys].filter((key) => baseScripts?.[key] !== headScripts?.[key]);
}

export function isPackageJson(file) {
  const f = file.replaceAll('\\', '/');
  return f === 'package.json' || f.endsWith('/package.json');
}

/**
 * Can this package.json change reach a suite? Unreadable or unparseable at either end is a
 * yes: a missed selection waves untested code through, a needless one costs a run.
 *
 * @param {string | null} baseText
 * @param {string | null} headText
 */
export function packageJsonReachesSuites(baseText, headText) {
  if (baseText == null || headText == null) return true;
  let base;
  let head;
  try {
    base = JSON.parse(baseText);
    head = JSON.parse(headText);
  } catch {
    return true;
  }
  const keys = new Set([...Object.keys(base ?? {}), ...Object.keys(head ?? {})]);
  for (const key of keys) {
    if (JSON.stringify(base?.[key] ?? null) === JSON.stringify(head?.[key] ?? null)) continue;
    if (key === 'scripts') {
      // Inert unless one of the scripts the harness runs changed.
      const changed = changedScriptKeys(base?.scripts, head?.scripts);
      if (changed.some((name) => HARNESS_SCRIPTS.includes(name))) return true;
      continue;
    }
    if (!PACKAGE_JSON_INERT_KEYS.includes(key)) return true;
  }
  return false;
}

/**
 * Drop every package.json whose change stays outside the suite-bearing sections. Run this on
 * the changed-file list before `resolveAffected`, in every consumer, or the three will disagree.
 *
 * @param {string[]} files
 * @param {(file: string) => { base: string | null, head: string | null }} readAt
 */
export function pruneScriptOnlyPackageJson(files, readAt) {
  return files.filter((file) => {
    if (!isPackageJson(file)) return true;
    const { base, head } = readAt(file);
    return packageJsonReachesSuites(base, head);
  });
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

// ── Coverage arithmetic ───────────────────────────────────────────────────────
// Selections mix two granularities: a suite root (`tests/web`) and a leaf
// (`tests/web/auth`). Set operations on that mix are wrong — subtracting
// `tests/web/auth` from `tests/web` has no answer at this granularity. So every
// operation below expands to leaves first, does plain set maths, and collapses back.

/** @type {string[] | null} */
let leafCache = null;

/**
 * Every leaf spec directory, from the rules table *and* from disk.
 *
 * Disk matters: a spec directory added without a matching rule can never be selected
 * on its own, but it is still part of the suite a suite-root selection stands for.
 * Expanding from the rules table alone would silently drop it from a `tests/web` run.
 */
export function leafSpecs() {
  if (leafCache) return leafCache;
  const leaves = new Set();
  for (const rule of RULES) {
    for (const spec of rule.specs) if (!SUITES.includes(spec)) leaves.add(spec);
  }
  for (const suite of SUITES) {
    let entries = [];
    try {
      entries = readdirSync(path.join(import.meta.dirname, '..', suite), { withFileTypes: true });
    } catch {
      // No checkout of the suite (or a partial one) — the rules table still stands.
    }
    for (const entry of entries) if (entry.isDirectory()) leaves.add(`${suite}/${entry.name}`);
  }
  leafCache = [...leaves].sort();
  return leafCache;
}

/** Suite roots → their leaves. Leaves pass through unchanged. */
export function expandSpecs(specs) {
  const out = new Set();
  for (const spec of specs) {
    if (SUITES.includes(spec)) {
      for (const leaf of leafSpecs()) if (leaf.startsWith(`${spec}/`)) out.add(leaf);
    } else {
      out.add(spec);
    }
  }
  return [...out].sort();
}

/**
 * Inverse of `expandSpecs`: a fully-covered suite collapses back to its root.
 *
 * Stronger than the internal `collapse` above, which only drops leaves already implied
 * by a present root. Here every leaf being present *is* the root, because after set
 * subtraction that is the same statement and the caller wants the shortest one.
 */
export function collapseSpecs(specs) {
  const remaining = new Set(specs);
  const out = new Set();
  for (const suite of SUITES) {
    const leaves = leafSpecs().filter((s) => s.startsWith(`${suite}/`));
    const whole =
      remaining.has(suite) || (leaves.length > 0 && leaves.every((l) => remaining.has(l)));
    if (!whole) continue;
    out.add(suite);
    remaining.delete(suite);
    for (const leaf of leaves) remaining.delete(leaf);
  }
  for (const spec of remaining) out.add(spec);
  return [...out].sort();
}

/**
 * Which of `required` still needs running.
 *
 * Each attestation contributes the specs it actually exercised (`covered`) minus the
 * specs that have changed since it ran (`invalidated`). What survives across all of
 * them is already proven; the remainder is what is outstanding.
 *
 * Attestations union rather than compete: a run that covered everything except `auth`
 * plus a later run that covered `auth` together cover the lot.
 *
 * @param {string[]} required
 * @param {{ covered: string[], invalidated: string[] }[]} attestations
 * @returns {string[]} the outstanding selection, collapsed
 */
export function outstandingSpecs(required, attestations) {
  const outstanding = new Set(expandSpecs(required));
  for (const { covered, invalidated } of attestations) {
    const stale = new Set(expandSpecs(invalidated));
    for (const spec of expandSpecs(covered)) {
      if (!stale.has(spec)) outstanding.delete(spec);
    }
  }
  return collapseSpecs([...outstanding]);
}
