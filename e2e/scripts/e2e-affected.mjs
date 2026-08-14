#!/usr/bin/env node
/**
 * Affected-only E2E runner.
 *
 * Maps the branch diff (committed + staged + unstaged + untracked) to spec files via
 * `affected-specs.mjs`, runs only those, writes a machine-readable receipt to
 * `e2e/.e2e-receipt.json`, and prints the attestation line for the PR body.
 *
 * Two very different cost paths, picked automatically from the selection:
 *   web specs  → `run-e2e.sh` (ephemeral Postgres + migrator + isolated WebApi + Next)
 *   expo specs → a static `expo export` this script builds and serves itself, driven by
 *                `playwright.expo-local.config.ts`. Synthetic auth, no Docker, no backend,
 *                no credentials, and no dev server to start first — see withExpoWebServer
 *                for why it no longer borrows a running Metro.
 *
 * Behaviour and the attestation contract are documented in
 * docs/standards/e2e-testing.md — that file wins.
 *
 * Usage:
 *   npm run e2e:affected
 *   npm run e2e:affected -- --dry-run          # show the selection, run nothing
 *   npm run e2e:affected -- --json             # machine-readable selection, run nothing
 *   npm run e2e:affected -- --base origin/uat  # compare against another ref
 *   E2E_KEEP_UP=1 npm run e2e:affected         # leave containers up (warm next run)
 */

import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { partitionBySuite, projectsFor, resolveAffected } from './affected-specs.mjs';

const E2E_DIR = path.resolve(import.meta.dirname, '..');
const REPO_ROOT = path.resolve(E2E_DIR, '..');
const RECEIPT_PATH = path.join(E2E_DIR, '.e2e-receipt.json');
const RECEIPT_SCHEMA = 1;
const EXPO_SERVER_URL = 'http://localhost:8081';
const WEB_SERVER_URL = 'http://localhost:3000';

/**
 * Backend the expo suite is built and run against: deliberately nothing.
 *
 * These specs use synthetic auth and mock the endpoints they care about, so every OTHER
 * request must fail fast rather than reach a real server. CI gets that for free — its
 * `localhost:5001` / `localhost:8000` are dead — but a developer running the local stack has
 * BOTH of those live, so the app's org resolution hit a real API with a synthetic token,
 * never hydrated, and every screen spec timed out on a loading spinner. Port 9 (TCP discard)
 * is never listening on any machine, so the behaviour is the same everywhere.
 *
 * Both keys matter:
 * - API_URL: api-client.ts fails fast on an empty base URL, so it needs *a* value.
 * - SUPABASE_URL: the synthetic session's localStorage key is derived from its hostname
 *   (`sb-<first-label>-auth-token`, see playwright/utils/auth.ts). The bundle and the
 *   injector must agree, so the same value is passed to the export AND to Playwright —
 *   otherwise the app looks for a session that was written under a different key.
 */
const EXPO_E2E_ENV = {
  EXPO_PUBLIC_API_URL: 'http://127.0.0.1:9',
  EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:9',
};

const C = {
  reset: '\x1b[0m',
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  yellow: '\x1b[1;33m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};
const info = (msg) => console.log(`${C.green}[e2e:affected]${C.reset} ${msg}`);
const warn = (msg) => console.log(`${C.yellow}[e2e:affected]${C.reset} ${msg}`);
const error = (msg) => console.error(`${C.red}[e2e:affected]${C.reset} ${msg}`);

// ── Args ──────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const jsonOnly = argv.includes('--json');
const allViewports = argv.includes('--all-viewports') || process.env.E2E_ALL_VIEWPORTS === '1';
const baseArg = argv.indexOf('--base');
const requestedBase = baseArg !== -1 ? argv[baseArg + 1] : process.env.E2E_BASE;

// ── Git helpers ───────────────────────────────────────────────────────────────
function git(args, { allowFailure = false } = {}) {
  const result = spawnSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' });
  if (result.status !== 0) {
    if (allowFailure) return null;
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr?.trim()}`);
  }
  return result.stdout.trim();
}

function lines(output) {
  return output ? output.split('\n').filter(Boolean) : [];
}

/** First ref that actually exists, so this works on a fresh clone and in a worktree. */
function resolveBase() {
  const candidates = requestedBase ? [requestedBase] : ['origin/dev', 'dev', 'origin/main', 'main'];
  for (const ref of candidates) {
    if (git(['rev-parse', '--verify', '--quiet', ref], { allowFailure: true })) return ref;
  }
  return null;
}

function collectChangedFiles(base) {
  const committed = base
    ? lines(git(['diff', '--name-only', `${base}...HEAD`], { allowFailure: true }) ?? '')
    : [];
  const staged = lines(git(['diff', '--name-only', '--cached']));
  const unstaged = lines(git(['diff', '--name-only']));
  const untracked = lines(git(['ls-files', '--others', '--exclude-standard']));
  const uncommitted = [...new Set([...staged, ...unstaged, ...untracked])];
  return { all: [...new Set([...committed, ...uncommitted])], uncommitted };
}

/**
 * Digest of the exact code state the run covers: HEAD tree plus the content of any
 * uncommitted change. Two runs with the same digest tested the same code.
 */
function workingTreeDigest(changedFiles) {
  const hash = createHash('sha256');
  hash.update(git(['rev-parse', 'HEAD^{tree}']));
  for (const file of [...changedFiles].sort()) {
    const diff = git(['diff', 'HEAD', '--', file], { allowFailure: true }) ?? '';
    hash.update(`\0${file}\0${diff}`);
  }
  return hash.digest('hex').slice(0, 16);
}

// ── Selection ─────────────────────────────────────────────────────────────────
const base = resolveBase();
if (!base) {
  warn('no base ref found (origin/dev, dev, origin/main, main) — using uncommitted changes only.');
}

const { all: changedFiles, uncommitted } = collectChangedFiles(base);
const { specs, reasons, uncovered, knownUncovered } = resolveAffected(changedFiles);

// Machine-readable selection for CI (e2e-post-merge.yml reads this). Emitted before
// any human-facing logging so stdout stays parseable.
if (jsonOnly) {
  const suites = partitionBySuite(specs);
  process.stdout.write(
    `${JSON.stringify({
      base: base ?? null,
      changedFiles: changedFiles.length,
      specs,
      web: suites.web,
      expo: suites.expo,
      projects: projectsFor(specs, { allViewports }),
      uncovered,
    })}\n`,
  );
  process.exit(0);
}

info(`base: ${C.bold}${base ?? '(none)'}${C.reset}  changed files: ${changedFiles.length}`);

if (knownUncovered.length > 0) {
  const grouped = new Map();
  for (const { file, why } of knownUncovered) {
    if (!grouped.has(why)) grouped.set(why, []);
    grouped.get(why).push(file);
  }
  for (const [why, files] of grouped) {
    console.log(`  ${C.dim}no coverage (known): ${files.length} file(s) — ${why}${C.reset}`);
  }
}

if (uncovered.length > 0) {
  warn(`${uncovered.length} changed path(s) match no rule in affected-specs.mjs:`);
  for (const file of uncovered.slice(0, 10)) console.log(`  ${C.dim}? ${file}${C.reset}`);
  if (uncovered.length > 10)
    console.log(`  ${C.dim}? …and ${uncovered.length - 10} more${C.reset}`);
  console.log(
    `  ${C.dim}If any of these are E2E-relevant, add a rule (docs/standards/e2e-testing.md).${C.reset}`,
  );
}

if (specs.length === 0) {
  info('no E2E-relevant changes — nothing to run.');
  info('No attestation is required for this diff.');
  process.exit(0);
}

info('selected specs:');
for (const spec of specs) {
  console.log(`  ${C.green}✓${C.reset} ${spec}  ${C.dim}(${reasons[spec].join(', ')})${C.reset}`);
}

const { web: webSpecs, expo: expoSpecs } = partitionBySuite(specs);
const projects = projectsFor(specs, { allViewports });
info(`projects: ${projects.join(', ')}`);

if (dryRun) {
  info('--dry-run: stopping before execution.');
  process.exit(0);
}

// ── Execution ─────────────────────────────────────────────────────────────────
const startedAt = new Date().toISOString();
const headSha = git(['rev-parse', 'HEAD']);
const treeDigest = workingTreeDigest(uncommitted);

function run(command, args, env, cwd = E2E_DIR) {
  console.log(`\n${C.dim}$ ${command} ${args.join(' ')}${C.reset}\n`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, ...env },
    shell: process.platform === 'win32',
  });
  return result.status ?? 1;
}

/**
 * Whether something owns the port.
 *
 * `probePath` matters more than it looks. Requesting Metro's ROOT makes it server-render the
 * Expo web entry, which on a cold cache takes several seconds — well past any sane probe
 * timeout — so a perfectly healthy dev server was reported as "nothing is serving" and the
 * run aborted. Metro's `/status` endpoint answers in single-digit milliseconds regardless of
 * cache state, which is what makes this check deterministic rather than a race against
 * whatever the bundler happens to be doing.
 *
 * The timeout is generous for the same reason: a slow answer is still an answer, and a false
 * negative on the :3000 guard below would let real-backend specs loose on the shared dev
 * database — the one outcome worth being slow to avoid.
 */
/**
 * Builds the Expo web export, serves it, runs `body(baseUrl)`, then tears the server down.
 *
 * The expo specs used to require a hand-started `npm run dev:expo`, which made this path
 * unreliable in two ways that had nothing to do with the code under test:
 *
 * 1. **Dev-mode env.** Metro in development loads `.env.development.local`, so a developer's
 *    own overrides decided what the bundle contained — feature flags included, which is how a
 *    local run could disagree with CI about which UI even exists. `expo export` builds in
 *    PRODUCTION mode, which never reads `.env.development.local`, so the bundle under test is
 *    the bundle that ships. Same reason CI is stable.
 * 2. **A bundler under sustained load.** On-demand bundling per navigation is slow and, across
 *    a couple of dozen specs, Metro died mid-run and every remaining spec failed with
 *    ERR_CONNECTION_REFUSED.
 *
 * Serving a static export fixes both, and it SCALES: the build is one fixed cost (~50s) no
 * matter how many specs run, and each spec is then served from disk instead of waiting on a
 * bundle. The old path got linearly slower and less stable as the suite grew.
 *
 * Mirrors `.github/workflows/e2e.yml`'s "Playwright (Expo Web)" job deliberately — same
 * export, same env, same static serve — so a local pass means what CI means.
 */
async function withExpoWebServer(body) {
  const dist = path.join(E2E_DIR, '.expo-web-dist');
  const expoDir = path.join(REPO_ROOT, 'apps', 'expo');

  // Never reuse a previous export: the receipt this run may produce attests a SHA, and a
  // stale bundle would attest code that was not the code tested.
  rmSync(dist, { recursive: true, force: true });

  info('building the Expo web export (production mode — ignores .env.development.local)…');
  const buildExit = run(
    'npx',
    // `--clear` is not optional. EXPO_PUBLIC_* values are INLINED at transform time, and
    // Metro's transform cache is keyed on file content, not on the environment — so a cached
    // bundle silently keeps whatever URLs the last build inlined. Without this the export
    // reproduced byte-for-byte (same content hash) while appearing to honour a new env, and
    // the suite then ran against a bundle pointing at a developer's LAN Supabase, whose
    // derived auth-storage key no longer matched the one the injector writes.
    ['expo', 'export', '--clear', '--platform', 'web', '--output-dir', dist],
    // Set in the environment, not a file: Expo's loader never overrides a value already in
    // process.env, which is what lets this beat the developer's apps/expo/.env.local.
    EXPO_E2E_ENV,
    expoDir,
  );
  // Judged on the ARTIFACT, not the exit code. `expo export` writes everything, prints
  // "Exported:", and then dies on Windows with 0xC0000005 (3221225477) — an access violation
  // in bundler teardown, after the output is complete. Trusting the exit code there fails a
  // build that actually succeeded; trusting it blindly the other way would run the specs
  // against a half-written directory, so the entry point is what gets checked.
  const built = existsSync(path.join(dist, 'index.html'));
  if (!built) {
    error(`Expo web export produced no index.html (exit ${buildExit}) — cannot run the specs.`);
    return buildExit === 0 ? 1 : buildExit;
  }
  if (buildExit !== 0) {
    warn(`export exited ${buildExit} but the output is complete — continuing.`);
  }

  // Prefer the port the Playwright config defaults to, but never fight a dev server the
  // developer has running: fall back to a second port and tell Playwright where to look.
  const port = (await serverIsUp(EXPO_SERVER_URL, '/status')) ? 8091 : 8081;
  const baseUrl = `http://localhost:${port}`;
  if (port !== 8081) {
    warn(`something already owns 8081 (a dev server?) — serving the export on ${port} instead.`);
  }

  info(`serving the export on ${baseUrl}`);
  const server = spawn('npx', ['--prefix', E2E_DIR, 'serve', dist, '-l', String(port)], {
    cwd: E2E_DIR,
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });

  try {
    const deadline = Date.now() + 60_000;
    while (!(await serverIsUp(baseUrl))) {
      if (Date.now() > deadline) {
        error(`the static server never came up on ${baseUrl}.`);
        return 1;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    return body(baseUrl);
  } finally {
    stopTree(server);
  }
}

/**
 * Kills a spawned server and its children.
 *
 * `child.kill()` alone is not enough here: the child is `npx`, which runs `serve` in a
 * grandchild process, and on Windows killing the shell leaves the port held — the next run
 * would then think a dev server owns it and quietly use the fallback port forever.
 */
function stopTree(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }
  child.kill('SIGTERM');
}

async function serverIsUp(url, probePath = '') {
  try {
    await fetch(`${url}${probePath}`, { signal: AbortSignal.timeout(10_000) });
    return true; // any HTTP response means something owns the port
  } catch {
    return false;
  }
}

let exitCode = 0;

// Guard the shared dev database. Playwright's webServer uses reuseExistingServer, and
// the NEXT_PUBLIC_API_URL=:5003 override only applies to a server Playwright starts
// itself. A dev server already on :3000 was almost certainly started against :5002 —
// the main stack, backed by the *hosted* dev database — so the real-backend CRUD specs
// would create, edit and delete rows in shared data instead of the ephemeral E2E
// Postgres. Refuse rather than silently mutate it.
if (webSpecs.length > 0 && process.env.E2E_ALLOW_SHARED_BACKEND !== '1') {
  if (await serverIsUp(WEB_SERVER_URL)) {
    error(`Something is already serving ${WEB_SERVER_URL}.`);
    error('Playwright reuses it, and the E2E backend override (:5003) would NOT apply —');
    error('real-backend CRUD specs would mutate the shared hosted dev database.');
    error('');
    error('Stop your dev server and re-run, or if you are certain it already points at');
    error('the E2E backend on :5003, override with E2E_ALLOW_SHARED_BACKEND=1.');
    process.exit(1);
  }
}

// Expo first: it is the cheap path, so a failure there gives the fastest signal.
if (expoSpecs.length > 0) {
  const expoProjects = projects.filter((p) => p.startsWith('expo-'));
  exitCode = await withExpoWebServer((baseUrl) =>
    run(
      'npx',
      [
        'playwright',
        'test',
        '--config',
        'playwright.expo-local.config.ts',
        // `--project=x`, not `--project x`: the flag is variadic, so the space form
        // swallows the spec paths that follow it as extra project names.
        ...expoProjects.map((p) => `--project=${p}`),
        ...expoSpecs,
      ],
      // EXPO_E2E_ENV again, so the auth injector derives the same storage key the served
      // bundle reads. The config's dotenv load of apps/expo/.env.local cannot override it
      // (dotenv leaves already-set keys alone), which is the point.
      { ...EXPO_E2E_ENV, E2E_EXPO_BASE_URL: baseUrl },
    ),
  );
}

if (webSpecs.length > 0 && exitCode === 0) {
  // run-e2e.sh owns the Docker lifecycle; E2E_SERVERS=web keeps Metro out of it.
  exitCode = run('bash', ['scripts/run-e2e.sh', 'playwright'], {
    E2E_SPECS: webSpecs.join(' '),
    E2E_PROJECTS: 'web',
    E2E_SERVERS: 'web',
  });
}

// ── Receipt + attestation ─────────────────────────────────────────────────────
const finishedAt = new Date().toISOString();
const result = exitCode === 0 ? 'passed' : 'failed';
// Only E2E-relevant dirt blocks attestation — an uncommitted README does not.
const relevantDirty = uncommitted.filter((file) => resolveAffected([file]).specs.length > 0);

writeFileSync(
  RECEIPT_PATH,
  `${JSON.stringify(
    {
      schema: RECEIPT_SCHEMA,
      result,
      headSha,
      treeDigest,
      base: base ?? null,
      dirty: relevantDirty,
      specs,
      projects,
      uncovered,
      startedAt,
      finishedAt,
    },
    null,
    2,
  )}\n`,
);

console.log('');
if (exitCode !== 0) {
  error(`E2E failed (exit ${exitCode}). No attestation line — fix the failures and re-run.`);
  process.exit(exitCode);
}

info(`all ${specs.length} selected spec path(s) passed. Receipt: e2e/.e2e-receipt.json`);

if (relevantDirty.length > 0) {
  warn('E2E-relevant paths are uncommitted, so this run is not attestable:');
  for (const file of relevantDirty.slice(0, 10)) console.log(`  ${C.dim}~ ${file}${C.reset}`);
  warn('Commit them and re-run to get an attestation line for the PR.');
  process.exit(0);
}

console.log(`${C.bold}Paste this into the ## E2E section of your PR:${C.reset}\n`);
console.log(`e2e: sha=${headSha} result=passed specs=${specs.length} at=${finishedAt}`);
console.log('');
// Only the web path starts containers, so only mention them when it ran.
// Keep-up is run-e2e.sh's default now — the next run reuses the warm stack.
if (process.env.E2E_TEARDOWN !== '1' && webSpecs.length > 0) {
  info('containers left running for the next (warm) run. Stop them with:');
  console.log(`  ${C.dim}npm run e2e:down${C.reset}`);
}
