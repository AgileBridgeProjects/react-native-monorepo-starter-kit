#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// preflight.mjs — refuse to start a run that cannot finish.
//
// The suite depends on values nobody ever declared: they arrive implicitly, from
// gitignored .env files that happen to be on a provisioned dev box. That works
// until the box is not provisioned — a fresh worktree being the ordinary case.
// The failure then lands tens of minutes later wearing a disguise: specs failing
// on click timeouts in a drawer the branch never touched, or auth coverage
// quietly vanishing from the run instead of going red.
//
// So every value a run depends on is named here, and a run missing one stops
// HERE, saying which value and how to get it.
//
// SCOPE: this is a DEVELOPER-LOCAL gate. CI is deliberately NOT wired to it —
// `e2e.yml` and `e2e-post-merge.yml` call `npx playwright test` directly and
// provision themselves from Key Vault. See the CI note in e2e-affected.mjs.
//
// Two rules this file lives by:
//
//   1. ZERO dependencies. It must run before `npm ci`, because a missing
//      node_modules is one of the things it reports. Nothing may be imported
//      that is not in Node's standard library — dotenv included, which is why
//      .env.e2e is parsed by hand below.
//   2. Human output goes to STDERR. Stdout carries the attestation line that
//      `e2e:affected` prints and the pre-push hook reads; adding progress
//      chatter to it would put this script in the way of the very thing the
//      suite exists to produce. `--json` is the one exception, by request.
// ─────────────────────────────────────────────────────────────

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const E2E_DIR = join(__dirname, '..');
const REPO_ROOT = join(E2E_DIR, '..');

const PULL_ENV = 'cd e2e && npm run pull:env   (needs `az login`)';
const NPM_CI = 'npm ci   (from the repo root)';

/**
 * Every value a run depends on.
 *
 * `suites` limits an entry to the runs that actually need it — a gate that cries wolf gets
 * bypassed, so an entry that does not apply must not fire. Omitted means every run needs it.
 *
 * Deliberately short. It grows from real failures, not from everything that might matter.
 */
const REQUIRED_ENV = [
  {
    name: 'E2E_ADMIN_EMAIL',
    suites: ['expo'],
    why: 'e2e/tests/expo/auth/login.spec.ts test.skip()s its cases without it, so auth coverage vanishes from the run instead of going red and the run still reports success. NOT required for the web suite: playwright/utils/auth.ts falls back to the seeded dev admin that .env.e2e.example documents as the supported local default.',
    remedy: PULL_ENV,
  },
  {
    name: 'E2E_ADMIN_PASSWORD',
    suites: ['expo'],
    why: 'Paired with E2E_ADMIN_EMAIL — the login spec skips on either being unset. The same seeded-admin fallback covers the web suite.',
    remedy: PULL_ENV,
  },
  // Add an entry when a real run has failed for want of a value, and only then.
  //
  // The failure mode this gate exists for is a value whose absence does not STOP a run but
  // changes what the run TESTS: a licence key whose watermark intercepts clicks, a credential
  // whose absence makes a spec skip itself. Those cost a whole run and then surface somewhere
  // unrelated. A missing value that simply crashes the run needs no gate.
  //
  // Two rules keep it trustworthy. `suites` must be set whenever an entry does not apply to
  // every run, because a gate that cries wolf gets bypassed. And `remedy` must be a command
  // that actually supplies the value — pointing at `npm run pull:env` for a secret the vault
  // does not hold is worse than saying nothing.
];

/**
 * Paths a run cannot proceed without.
 *
 * Deliberately NOT here:
 *
 * - `apps/expo/.env.local`. The historical failure here was a MISMATCH (the injector wrote
 *   a session under a storage key the bundle never read), not an absence:
 *   playwright/utils/auth.ts defaults EXPO_PUBLIC_SUPABASE_URL, so a machine with no
 *   .env.local has the injector and the bundle agreeing on the same default. Requiring the
 *   file would fail a setup that works.
 * - Any app's `.env.local`. Where a value matters, gate the VALUE in REQUIRED_ENV above.
 *   Requiring the file as well fails a machine that supplies the value by another route.
 */
const REQUIRED_PATHS = [
  {
    label: 'node_modules (repo root)',
    path: join(REPO_ROOT, 'node_modules'),
    why: "A fresh worktree starts with no installed dependencies, and node resolution then walks up to the PARENT checkout's node_modules — so npm scripts appear to work while knip reports every workspace dependency as unused. Reads exactly like real dead code.",
    remedy: NPM_CI,
  },
  {
    label: '@playwright/test (hoisted to the repo root)',
    // NOT e2e/node_modules. npm workspaces HOIST to the root, so a correct install of
    // this monorepo leaves e2e/node_modules absent — checking for it would fail on a
    // perfectly good install. Checking the package rather than a directory also asserts
    // the install delivered the runner, not merely that one happened.
    path: join(REPO_ROOT, 'node_modules', '@playwright', 'test'),
    why: 'Playwright is hoisted to the repo root by npm workspaces; without it there is no test runner.',
    remedy: NPM_CI,
  },
];

const SUITES = ['all', 'web', 'expo', 'maestro'];

/**
 * Does this entry apply to the run being gated?
 *
 * Takes one suite or several. Several, because a single Playwright invocation covers
 * BOTH the `web` and `expo-web` projects: `run-e2e.sh playwright` needs web and expo
 * asserted together, and gating twice in sequence would stop at the first failure and
 * lose the "every failure at once" property this script exists for.
 *
 * Curried on the suite rather than closing over a module-level one: this file is
 * imported (e2e-affected.mjs reuses check, readEnvFile and suiteFilterFor to
 * work out what to fetch before it gates), and anything read from
 * process.argv at module scope would be the IMPORTER's argv — so
 * `e2e:affected --json` would have exited from inside an import.
 */
export function suiteFilterFor(suite) {
  const selected = Array.isArray(suite) ? suite : [suite];
  const wantsEverything = selected.includes('all');
  return (entry) => {
    if (!entry.suites) return true;
    if (wantsEverything) return true;
    return entry.suites.some((name) => selected.includes(name));
  };
}

/**
 * Parse .env.e2e without dotenv (see rule 1 above).
 *
 * A surrounding pair of quotes is stripped and nothing else is interpreted — this
 * is a presence check, not a shell. A leading `export ` is tolerated because both
 * dotenv and `source` accept it, and a key parsed as "export FOO" would report a
 * value missing that every other consumer can see.
 */
export function parseEnvFile(text) {
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line
      .slice(0, eq)
      .trim()
      .replace(/^export\s+/, '');
    if (!key) continue;
    let value = line.slice(eq + 1).trim();
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (quoted && value.length >= 2) value = value.slice(1, -1);
    out[key] = value;
  }
  return out;
}

/** A value counts as present only if it has non-whitespace content. */
function hasContent(value) {
  return typeof value === 'string' && value.trim() !== '';
}

/**
 * Resolve what a run would see, and collect everything missing.
 *
 * The environment wins over the file ONLY when it actually carries content:
 * run-e2e.sh exports these directly, and it exports an empty string when a Key
 * Vault fetch came up short. A plain `??` would let that empty export mask a good
 * .env.e2e value and fail the gate on a machine that is fine.
 */
export function check({ env, fileEnv, envEntries = REQUIRED_ENV, paths, suiteFilter }) {
  const resolve = (name) => (hasContent(env[name]) ? env[name] : fileEnv[name]);
  const missing = [];

  for (const entry of envEntries) {
    if (!suiteFilter(entry)) continue;
    if (!hasContent(resolve(entry.name))) {
      missing.push({ kind: 'env', id: entry.name, why: entry.why, remedy: entry.remedy });
    }
  }

  for (const entry of paths) {
    if (!suiteFilter(entry)) continue;
    if (!existsSync(entry.path)) {
      missing.push({ kind: 'path', id: entry.label, why: entry.why, remedy: entry.remedy });
    }
  }

  return missing;
}

/** Read .env.e2e defensively — an unreadable file must not bury the remedy output. */
export function readEnvFile(path) {
  if (!existsSync(path)) return {};
  try {
    return parseEnvFile(readFileSync(path, 'utf8'));
  } catch {
    // EACCES, EISDIR, a half-written file mid-`pull:env` — treat as absent. The gate
    // then reports the values as missing, which is the useful outcome; a raw Node
    // stack trace would bury every remedy this script exists to print.
    return {};
  }
}

// Importable for tests and for e2e-affected.mjs; only the direct invocation reads
// argv, reports and exits.
const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  const argv = process.argv.slice(2);
  const asJson = argv.includes('--json');
  // Comma-separated, e.g. `--suite=web,expo` — see suiteFilterFor.
  const suite = argv.find((arg) => arg.startsWith('--suite='))?.split('=')[1] ?? 'all';
  const selected = suite
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);

  if (selected.length === 0 || selected.some((name) => !SUITES.includes(name))) {
    // Answer on the same channel the caller asked on: a machine caller parsing stdout
    // must not get an empty body on the error path.
    if (asJson) {
      process.stdout.write(
        `${JSON.stringify({ suite, ok: false, error: `unknown suite: ${suite}`, missing: [] }, null, 2)}\n`,
      );
    }
    process.stderr.write(`[preflight] unknown --suite=${suite} (expected ${SUITES.join(', ')})\n`);
    process.exit(2);
  }

  // E2E_PREFLIGHT_ENV_FILE exists so the tests can point this at a known file instead of
  // whatever .env.e2e the developer happens to have. Without it the CLI tests assert
  // against real local credentials and pass or fail by accident of provisioning.
  const envFile = process.env.E2E_PREFLIGHT_ENV_FILE ?? join(E2E_DIR, '.env.e2e');
  const missing = check({
    env: process.env,
    fileEnv: readEnvFile(envFile),
    paths: REQUIRED_PATHS,
    suiteFilter: suiteFilterFor(selected),
  });

  if (asJson) {
    process.stdout.write(
      `${JSON.stringify({ suite, ok: missing.length === 0, missing }, null, 2)}\n`,
    );
    process.exit(missing.length === 0 ? 0 : 1);
  }

  if (missing.length === 0) {
    process.stderr.write(`[preflight] all prerequisites present (suite=${suite}).\n`);
    process.exit(0);
  }

  // Every failure at once, not first-fail. The complaint behind this script is that
  // these were discovered one run at a time.
  process.stderr.write(
    `\n[preflight] ${missing.length} prerequisite(s) missing — not starting a run that cannot finish.\n\n`,
  );
  for (const item of missing) {
    process.stderr.write(`  x ${item.id}\n`);
    process.stderr.write(`      why:  ${item.why}\n`);
    process.stderr.write(`      fix:  ${item.remedy}\n\n`);
  }
  process.stderr.write('See docs/standards/e2e-testing.md § Prerequisites.\n\n');
  process.exit(1);
}

export { REQUIRED_ENV, REQUIRED_PATHS, SUITES };
