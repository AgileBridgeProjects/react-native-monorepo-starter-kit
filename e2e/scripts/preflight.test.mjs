// Tests for the E2E prerequisite gate.
//
// These run under `npm run check` (node --test), NOT under Playwright, so they must be
// hermetic: no Key Vault, no .env.e2e, no dev server, no network. Every CLI test points
// preflight at a fixture env file via E2E_PREFLIGHT_ENV_FILE and strips the values under
// test out of the inherited environment — otherwise a developer with real credentials
// exported would pass tests that fail in CI, and vice versa.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  check,
  parseEnvFile,
  REQUIRED_ENV,
  REQUIRED_PATHS,
  readEnvFile,
  SUITES,
  suiteFilterFor,
} from './preflight.mjs';

const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const PREFLIGHT = path.join(SCRIPTS_DIR, 'preflight.mjs');
const IMPORT_PROBE = path.join(SCRIPTS_DIR, 'preflight.import-probe.mjs');
const REPO_ROOT = path.resolve(SCRIPTS_DIR, '..', '..');

const TMP = mkdtempSync(path.join(tmpdir(), 'preflight-'));
after(() => rmSync(TMP, { recursive: true, force: true }));

/** Write a fixture env file and return its path. */
function envFixture(name, contents) {
  const file = path.join(TMP, name);
  writeFileSync(file, contents, 'utf8');
  return file;
}

/** Every env var any REQUIRED_ENV entry names — cleared before each CLI test. */
const MANAGED_KEYS = REQUIRED_ENV.map((entry) => entry.name);

/**
 * Run preflight.mjs as a child process with a controlled environment.
 *
 * Inherits process.env (node needs PATH, and SystemRoot on Windows) but deletes every
 * key the gate checks, so the result depends only on `envFile` and `env`.
 */
function runCli(args, { envFile, env = {} } = {}) {
  const childEnv = { ...process.env };
  for (const key of MANAGED_KEYS) delete childEnv[key];
  if (envFile) childEnv.E2E_PREFLIGHT_ENV_FILE = envFile;
  Object.assign(childEnv, env);
  return spawnSync(process.execPath, [PREFLIGHT, ...args], { encoding: 'utf8', env: childEnv });
}

describe('parseEnvFile', () => {
  it('parses plain key=value pairs', () => {
    assert.deepEqual(parseEnvFile('A=1\nB=two\n'), { A: '1', B: 'two' });
  });

  it('ignores comments and blank lines', () => {
    assert.deepEqual(parseEnvFile('# note\n\n  \nA=1\n'), { A: '1' });
  });

  it('strips one surrounding pair of quotes, single or double', () => {
    assert.deepEqual(parseEnvFile(`A="q"\nB='s'\n`), { A: 'q', B: 's' });
  });

  it('leaves an unmatched quote alone — it is a presence check, not a shell', () => {
    assert.deepEqual(parseEnvFile('A="unclosed\n'), { A: '"unclosed' });
  });

  it('tolerates a leading `export `, which both dotenv and `source` accept', () => {
    // A key parsed as "export FOO" would report a value missing that every other
    // consumer can see.
    assert.deepEqual(parseEnvFile('export A=1\n'), { A: '1' });
  });

  it('handles CRLF line endings', () => {
    // pull-env.mjs shells out to `az`, which emits CRLF on Windows.
    assert.deepEqual(parseEnvFile('A=1\r\nB=2\r\n'), { A: '1', B: '2' });
  });

  it('keeps `=` inside a value', () => {
    // Base64 and connection strings both contain them.
    assert.deepEqual(parseEnvFile('A=a=b=c\n'), { A: 'a=b=c' });
  });

  it('skips lines with no `=` and lines that start with `=`', () => {
    assert.deepEqual(parseEnvFile('NOEQUALS\n=novalue\nA=1\n'), { A: '1' });
  });

  it('reads an empty value as an empty string, not as absent', () => {
    // This is the shape `pull:env` writes when a Key Vault secret exists but is blank,
    // and hasContent() is what turns it back into "missing".
    assert.deepEqual(parseEnvFile('A=\n'), { A: '' });
  });
});

describe('readEnvFile', () => {
  it('returns an empty object when the file does not exist', () => {
    assert.deepEqual(readEnvFile(path.join(TMP, 'nope.env')), {});
  });

  it('returns an empty object rather than throwing when the path is a directory', () => {
    // EISDIR, EACCES, or a half-written file mid-`pull:env`. A raw Node stack trace
    // would bury every remedy the gate exists to print.
    assert.deepEqual(readEnvFile(TMP), {});
  });

  it('parses a real file', () => {
    assert.deepEqual(readEnvFile(envFixture('ok.env', 'A=1\n')), { A: '1' });
  });
});

describe('suiteFilterFor', () => {
  it('keeps an entry with no `suites` for every suite', () => {
    const entry = { name: 'X' };
    for (const suite of SUITES) {
      assert.equal(suiteFilterFor(suite)(entry), true, `suite=${suite}`);
    }
  });

  it('keeps every entry under suite=all', () => {
    assert.equal(suiteFilterFor('all')({ name: 'X', suites: ['web'] }), true);
  });

  it('keeps a matching entry and drops a non-matching one', () => {
    assert.equal(suiteFilterFor('web')({ name: 'X', suites: ['web'] }), true);
    assert.equal(suiteFilterFor('expo')({ name: 'X', suites: ['web'] }), false);
  });

  it('drops a web-only entry from a maestro run', () => {
    // The Maestro suite has no admin portal, so demanding a web build input of it
    // would be the false alarm that gets a gate bypassed.
    assert.equal(suiteFilterFor('maestro')({ name: 'X', suites: ['web'] }), false);
  });

  it('accepts several suites at once', () => {
    // `run-e2e.sh playwright` drives one Playwright invocation covering both the web
    // and expo-web projects, so both must be asserted in a single pass.
    const filter = suiteFilterFor(['web', 'expo']);
    assert.equal(filter({ name: 'X', suites: ['web'] }), true);
    assert.equal(filter({ name: 'Y', suites: ['expo'] }), true);
    assert.equal(filter({ name: 'Z', suites: ['maestro'] }), false);
  });

  it('treats `all` in a list as everything', () => {
    assert.equal(suiteFilterFor(['expo', 'all'])({ name: 'X', suites: ['web'] }), true);
  });
});

describe('check', () => {
  const entries = [{ name: 'A', why: 'because', remedy: 'do the thing' }];
  const keep = () => true;

  it('reports nothing when the value is in the environment', () => {
    assert.deepEqual(
      check({ env: { A: 'v' }, fileEnv: {}, envEntries: entries, paths: [], suiteFilter: keep }),
      [],
    );
  });

  it('falls back to the file when the environment does not carry the value', () => {
    assert.deepEqual(
      check({ env: {}, fileEnv: { A: 'v' }, envEntries: entries, paths: [], suiteFilter: keep }),
      [],
    );
  });

  it('lets a good file value win over an EMPTY environment export', () => {
    // run-e2e.sh exports these directly and exports an empty string when a Key Vault
    // fetch came up short. A plain `??` would let that empty export mask a good
    // .env.e2e value and fail the gate on a machine that is fine.
    assert.deepEqual(
      check({
        env: { A: '' },
        fileEnv: { A: 'v' },
        envEntries: entries,
        paths: [],
        suiteFilter: keep,
      }),
      [],
    );
  });

  it('treats a whitespace-only value as missing', () => {
    const missing = check({
      env: { A: '   ' },
      fileEnv: {},
      envEntries: entries,
      paths: [],
      suiteFilter: keep,
    });
    assert.equal(missing.length, 1);
    assert.equal(missing[0].id, 'A');
  });

  it('carries the why and the remedy into the finding', () => {
    const [finding] = check({
      env: {},
      fileEnv: {},
      envEntries: entries,
      paths: [],
      suiteFilter: keep,
    });
    assert.equal(finding.kind, 'env');
    assert.equal(finding.why, 'because');
    assert.equal(finding.remedy, 'do the thing');
  });

  it('reports a missing path', () => {
    const paths = [{ label: 'ghost', path: path.join(TMP, 'ghost'), why: 'w', remedy: 'r' }];
    const missing = check({ env: {}, fileEnv: {}, envEntries: [], paths, suiteFilter: keep });
    assert.equal(missing.length, 1);
    assert.equal(missing[0].kind, 'path');
    assert.equal(missing[0].id, 'ghost');
  });

  it('accepts a path that exists', () => {
    const paths = [{ label: 'tmp', path: TMP, why: 'w', remedy: 'r' }];
    assert.deepEqual(check({ env: {}, fileEnv: {}, envEntries: [], paths, suiteFilter: keep }), []);
  });

  it('applies the suite filter to env entries and to paths alike', () => {
    const scoped = [{ name: 'A', suites: ['web'], why: 'w', remedy: 'r' }];
    const scopedPaths = [
      { label: 'p', suites: ['web'], path: path.join(TMP, 'ghost'), why: 'w', remedy: 'r' },
    ];
    const filter = suiteFilterFor('expo');
    assert.deepEqual(
      check({ env: {}, fileEnv: {}, envEntries: scoped, paths: scopedPaths, suiteFilter: filter }),
      [],
    );
  });

  it('collects EVERY failure, not just the first', () => {
    // The complaint behind this script is that these were discovered one run at a time.
    const many = [
      { name: 'A', why: 'w', remedy: 'r' },
      { name: 'B', why: 'w', remedy: 'r' },
    ];
    const paths = [{ label: 'ghost', path: path.join(TMP, 'ghost'), why: 'w', remedy: 'r' }];
    const missing = check({ env: {}, fileEnv: {}, envEntries: many, paths, suiteFilter: keep });
    assert.deepEqual(
      missing.map((m) => m.id),
      ['A', 'B', 'ghost'],
    );
  });
});

describe('the declared prerequisite list', () => {
  it('gives every env entry a name, a why and a remedy', () => {
    // A gate that says "X is missing" and nothing else sends the reader back to the
    // same guesswork the gate exists to end.
    for (const entry of REQUIRED_ENV) {
      assert.ok(entry.name, 'entry has a name');
      assert.ok(entry.why?.length > 20, `${entry.name} explains itself`);
      assert.ok(entry.remedy?.length > 5, `${entry.name} says how to fix it`);
    }
  });

  it('gives every path entry a label, a path, a why and a remedy', () => {
    for (const entry of REQUIRED_PATHS) {
      assert.ok(entry.label, 'entry has a label');
      assert.ok(entry.path, `${entry.label} has a path`);
      assert.ok(entry.why?.length > 20, `${entry.label} explains itself`);
      assert.ok(entry.remedy?.length > 5, `${entry.label} says how to fix it`);
    }
  });

  it('only scopes entries to suites that exist', () => {
    const real = SUITES.filter((s) => s !== 'all');
    for (const entry of [...REQUIRED_ENV, ...REQUIRED_PATHS]) {
      for (const suite of entry.suites ?? []) {
        assert.ok(
          real.includes(suite),
          `${entry.name ?? entry.label} names a real suite: ${suite}`,
        );
      }
    }
  });

  it('names no duplicate env vars', () => {
    const names = REQUIRED_ENV.map((e) => e.name);
    assert.equal(new Set(names).size, names.length);
  });

  it('checks the ROOT node_modules, never e2e/node_modules', () => {
    // Regression. npm workspaces HOIST to the root, so a correct install of this
    // monorepo leaves e2e/node_modules absent — checking for it failed on a perfectly
    // good install.
    for (const entry of REQUIRED_PATHS) {
      assert.ok(
        !entry.path.includes(path.join('e2e', 'node_modules')),
        `${entry.label} must not depend on the un-hoisted e2e/node_modules`,
      );
    }
  });

  it('resolves its paths against the repo root, not the scripts directory', () => {
    for (const entry of REQUIRED_PATHS) {
      assert.ok(entry.path.startsWith(REPO_ROOT), `${entry.label} resolves under the repo root`);
    }
  });

  it('scopes every entry to suites that exist', () => {
    // A gate that cries wolf gets bypassed, so an entry that does not apply must not fire.
    // An entry scoped to a suite name nobody runs would never fire at all, which is the
    // same bug wearing the opposite face.
    const known = ['web', 'expo', 'maestro'];
    for (const entry of REQUIRED_ENV) {
      if (entry.suites === undefined) continue;
      assert.ok(Array.isArray(entry.suites) && entry.suites.length > 0, `${entry.name} suites`);
      for (const suite of entry.suites) {
        assert.ok(known.includes(suite), `${entry.name} names an unknown suite: ${suite}`);
      }
    }
  });

  it('gives every entry a why and a workable remedy', () => {
    // Pointing at a command that cannot supply the value is worse than saying nothing.
    for (const entry of REQUIRED_ENV) {
      assert.ok(entry.why?.length > 20, `${entry.name} needs a why`);
      assert.ok(entry.remedy?.length, `${entry.name} needs a remedy`);
    }
  });

  it('demands no env value of a maestro run', () => {
    // Regression guard for a real mistake. .env.e2e.example documents E2E_ATHLETE_*,
    // E2E_DIRECTOR_*, E2E_PARENT_* and E2E_COACH_* as "KV secret: e2e-<role>-email",
    // but kv-starterkit-dev holds only e2e-admin-email and e2e-admin-password (checked
    // 2026-09-03). Gating on them would fire on every `npm run e2e` and print
    // `npm run pull:env` as the fix — a remedy that cannot work. Do not add one back
    // until the secret exists AND a run has actually failed for want of it.
    const filter = suiteFilterFor('maestro');
    const demanded = REQUIRED_ENV.filter(filter).map((entry) => entry.name);
    assert.deepEqual(demanded, []);
  });

  it('does NOT demand admin credentials of a web run', () => {
    // playwright/utils/auth.ts falls back to the seeded dev admin, which
    // .env.e2e.example documents as the supported local default. Gating web on these
    // would fail a setup the repo tells people to use.
    const filter = suiteFilterFor('web');
    for (const name of ['E2E_ADMIN_EMAIL', 'E2E_ADMIN_PASSWORD']) {
      const entry = REQUIRED_ENV.find((e) => e.name === name);
      assert.equal(filter(entry), false, `${name} must not apply to the web suite`);
    }
  });
});

describe('the CLI', () => {
  const full = envFixture('full.env', `${REQUIRED_ENV.map((e) => `${e.name}=value`).join('\n')}\n`);
  const empty = envFixture('empty.env', '# nothing here\n');

  it('exits 0 and says so on stderr when everything is present', () => {
    // Path entries are asserted against the real repo root, so this also proves the
    // install is complete. If it fails on `node_modules`, run `npm ci` at the root.
    const result = runCli(['--suite=all'], { envFile: full });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /all prerequisites present \(suite=all\)/);
  });

  it('keeps human output OFF stdout', () => {
    // Stdout carries the attestation line that e2e:affected prints and the pre-push
    // hook reads. Progress chatter there would put this script in the way of the very
    // thing the suite exists to produce.
    const result = runCli(['--suite=all'], { envFile: full });
    assert.equal(result.stdout, '');
  });

  it('exits 1 and names every missing value at once', () => {
    const result = runCli(['--suite=all'], { envFile: empty });
    assert.equal(result.status, 1);
    for (const entry of REQUIRED_ENV) {
      assert.match(result.stderr, new RegExp(entry.name), `${entry.name} is named`);
    }
  });

  it('prints a why and a fix beside each missing value', () => {
    const result = runCli(['--suite=expo'], { envFile: empty });
    assert.match(result.stderr, /why:/);
    assert.match(result.stderr, /fix:\s+cd e2e && npm run pull:env/);
  });

  it('points the reader at the standard', () => {
    const result = runCli(['--suite=all'], { envFile: empty });
    assert.match(result.stderr, /docs\/standards\/e2e-testing\.md § Prerequisites/);
  });

  it('reports only what the named suite needs', () => {
    // A web run must not be failed for an expo-only credential it will never use.
    const result = runCli(['--suite=web'], { envFile: empty });
    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stderr, /E2E_ADMIN_EMAIL/);
  });

  it('defaults to suite=all when --suite is omitted', () => {
    const result = runCli([], { envFile: empty });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /E2E_ADMIN_EMAIL/);
  });

  it('accepts a comma-separated suite list and unions what it demands', () => {
    const result = runCli(['--suite=web,expo'], { envFile: empty });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /E2E_ADMIN_EMAIL/);
  });

  it('exits 2 when any entry in the list is unknown', () => {
    const result = runCli(['--suite=web,banana'], { envFile: full });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /unknown --suite=web,banana/);
  });

  it('exits 2 on an empty --suite= rather than silently checking nothing', () => {
    const result = runCli(['--suite='], { envFile: full });
    assert.equal(result.status, 2);
  });

  it('exits 2 on an unknown suite', () => {
    const result = runCli(['--suite=banana'], { envFile: full });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /unknown --suite=banana/);
    assert.match(result.stderr, /all, web, expo, maestro/);
  });

  it('lets the environment satisfy a value the file does not carry', () => {
    const result = runCli(['--suite=expo'], {
      envFile: empty,
      env: { E2E_ADMIN_EMAIL: 'from-the-environment', E2E_ADMIN_PASSWORD: 'from-the-environment' },
    });
    assert.equal(result.status, 0, result.stderr);
  });

  it('does not let an EMPTY environment export mask a good file value', () => {
    // run-e2e.sh exports an empty string when a Key Vault fetch came up short.
    const withKey = envFixture('withkey.env', 'EXAMPLE_LICENCE_KEY=real\n');
    const result = runCli(['--suite=web'], {
      envFile: withKey,
      env: { EXAMPLE_LICENCE_KEY: '' },
    });
    assert.equal(result.status, 0, result.stderr);
  });

  it('treats a missing env file as no values rather than an error', () => {
    const result = runCli(['--suite=expo'], { envFile: path.join(TMP, 'absent.env') });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /E2E_ADMIN_EMAIL/);
  });
});

describe('the CLI in --json mode', () => {
  const full = envFixture(
    'json-full.env',
    `${REQUIRED_ENV.map((e) => `${e.name}=v`).join('\n')}\n`,
  );
  const empty = envFixture('json-empty.env', '\n');

  it('writes a machine-readable ok result to STDOUT and exits 0', () => {
    const result = runCli(['--suite=all', '--json'], { envFile: full });
    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, true);
    assert.equal(payload.suite, 'all');
    assert.deepEqual(payload.missing, []);
  });

  it('writes the findings to STDOUT and exits 1 when something is missing', () => {
    const result = runCli(['--suite=expo', '--json'], { envFile: empty });
    assert.equal(result.status, 1);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, false);
    assert.ok(payload.missing.some((m) => m.id === 'E2E_ADMIN_EMAIL'));
    assert.ok(payload.missing.every((m) => m.why && m.remedy));
  });

  it('answers an unknown suite ON STDOUT too, so a machine caller never gets an empty body', () => {
    const result = runCli(['--suite=banana', '--json'], { envFile: full });
    assert.equal(result.status, 2);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, false);
    assert.match(payload.error, /unknown suite: banana/);
  });
});

describe('importability', () => {
  it('does not read argv at module scope', () => {
    // Regression. e2e-affected.mjs imports parseEnvFile from preflight.mjs while
    // carrying its own flags. If the gate read process.argv at module scope it would
    // see the IMPORTER's argv and exit from inside the import — so this probe, run
    // with a deliberately invalid --suite, must still reach its own code.
    const result = spawnSync(process.execPath, [IMPORT_PROBE, '--suite=banana'], {
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /probe ok/);
  });

  it('exports the pieces its callers depend on', () => {
    assert.equal(typeof parseEnvFile, 'function');
    assert.equal(typeof check, 'function');
    assert.equal(typeof readEnvFile, 'function');
    assert.equal(typeof suiteFilterFor, 'function');
    assert.ok(Array.isArray(REQUIRED_ENV));
    assert.ok(Array.isArray(REQUIRED_PATHS));
    assert.deepEqual(SUITES, ['all', 'web', 'expo', 'maestro']);
  });
});
