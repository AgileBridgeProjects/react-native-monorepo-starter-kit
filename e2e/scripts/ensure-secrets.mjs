// ─────────────────────────────────────────────────────────────
// ensure-secrets.mjs — fetch the values a run is missing, before the gate asserts them.
//
// `run-e2e.sh` has always fetched from Key Vault at the top of a run, so `npm run e2e`
// provisions itself. `e2e:affected` never did: it relies on `.env.e2e` having been written
// by `pull:env` at some point in the past. That asymmetry is invisible right up until a
// secret is ADDED to the list — the file on disk is then stale in a way nothing detects,
// and the gate can only tell you to go and run `pull:env` yourself.
//
// This closes it. Anything the gate would fail on is fetched here first, by name, and only
// when it is actually absent. A machine that is already provisioned pays nothing: no `az`
// process is started when there is nothing to fetch.
//
// DELIBERATELY SEPARATE FROM preflight.mjs. The gate asserts and must stay zero-dependency,
// side-effect-free and runnable before `npm ci`. This fetches, touches the network and
// writes a file. Merging the two would give the assertion a network dependency and make a
// dry check capable of changing the machine.
// ─────────────────────────────────────────────────────────────

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

/** Default vault, matching pull-env.mjs and run-e2e.sh. */
export const DEFAULT_VAULT = 'kv-starterkit-dev';

/**
 * Env var name → Key Vault secret name.
 *
 * The exact inverse of the kebab→UPPER_SNAKE auto-mapping pull-env.mjs applies, which is
 * well defined here because no secret name in the vault contains an underscore:
 * EXAMPLE_LICENCE_KEY → example-licence-key.
 */
export function secretNameFor(envVar) {
  return envVar.toLowerCase().replace(/_/g, '-');
}

/**
 * Merge fetched values into the text of an existing .env.e2e.
 *
 * A merge, not the wholesale rewrite `pull:env` performs, because this runs unattended in
 * the middle of somebody's test run. Replacing a key in place preserves the comments and
 * the ordering around it, and preserves any other key the file holds.
 *
 * Safe by construction: the caller only ever passes values that resolved as MISSING, so a
 * key written here was absent or empty and no good value can be clobbered.
 */
export function mergeEnvFile(existingText, values) {
  const entries = Object.entries(values);
  if (entries.length === 0) return existingText;

  let text = existingText;
  const appended = [];

  for (const [key, value] of entries) {
    // Match an existing assignment for this key, commented out or not, anywhere in the
    // file. `.env.e2e.example` ships every key commented, and a file derived from it would
    // otherwise collect a second, live copy of a line it already has.
    const pattern = new RegExp(`^[ \\t]*#?[ \\t]*(?:export[ \\t]+)?${key}=.*$`, 'm');
    if (pattern.test(text)) {
      text = text.replace(pattern, `${key}=${value}`);
    } else {
      appended.push(`${key}=${value}`);
    }
  }

  if (appended.length > 0) {
    const separator = text.length === 0 || text.endsWith('\n') ? '' : '\n';
    text = `${text}${separator}\n# Added automatically by e2e:affected — see scripts/ensure-secrets.mjs\n${appended.join('\n')}\n`;
  }

  return text;
}

/**
 * Characters an `az` argument may contain.
 *
 * Everything this module passes is either a literal (`keyvault`, `--query`, `tsv`) or a
 * vault or secret name, and Key Vault names are `[A-Za-z0-9-]` by its own rules. The set
 * below is that plus the few punctuation marks the literals need. Nothing a shell treats
 * specially survives it — no quote, space, backtick, `$`, `;`, `&`, `|`, `<`, `>`.
 */
const SAFE_ARG = /^[A-Za-z0-9._@:/-]+$/;

/**
 * Run `az`, returning its stdout or null.
 *
 * WINDOWS. The Azure CLI ships as a batch shim, `az.cmd`. Node 20+ refuses to spawn a
 * `.cmd` without a shell (the CVE-2024-27980 fix), so `spawnSync('az.cmd', args)` fails
 * with EINVAL and a bare `az` fails with ENOENT — measured on this machine, both. A shell
 * is therefore not a shortcut here, it is the only way to reach the CLI on the platform
 * the team develops on.
 *
 * What makes that safe is the guard above rather than the quoting, because `shell: true`
 * with an args array concatenates WITHOUT escaping (Node DEP0190). Every argument is
 * validated first, so by the time a string is built there is no metacharacter left in it.
 * POSIX keeps the argv form, where the question does not arise.
 *
 * Do not "simplify" this by dropping the validation and relying on the argv array: on
 * Windows there is no argv array, only the string below.
 */
export function assertSafeArgs(args) {
  for (const arg of args) {
    if (!SAFE_ARG.test(arg)) {
      throw new Error(`ensure-secrets: refusing to pass an unsafe argument to az: ${arg}`);
    }
  }
  return args;
}

function runAz(args, { timeout = 30000 } = {}) {
  assertSafeArgs(args);

  const result =
    process.platform === 'win32'
      ? spawnSync(['az', ...args].join(' '), { encoding: 'utf8', timeout, shell: true })
      : spawnSync('az', args, { encoding: 'utf8', timeout });

  if (result.error || result.status !== 0) return null;
  return result.stdout.trimEnd().replace(/\r/g, '');
}

/** Is the Azure CLI available and logged in? One call, so an offline machine fails fast. */
export function azIsReady(az = runAz) {
  return az(['account', 'show', '--query', 'id', '-o', 'tsv']) !== null;
}

/**
 * Fetch the named env vars from Key Vault and return the ones that came back.
 *
 * Best-effort throughout: a value that cannot be fetched is simply absent from the result,
 * and the gate downstream reports it with the manual remedy. Nothing here throws, because
 * a top-up failing is not worse than the state before it ran.
 */
export function fetchSecrets(envVars, { vault = DEFAULT_VAULT, az = runAz } = {}) {
  const fetched = {};
  for (const envVar of envVars) {
    const value = az([
      'keyvault',
      'secret',
      'show',
      '--vault-name',
      vault,
      '--name',
      secretNameFor(envVar),
      '--query',
      'value',
      '-o',
      'tsv',
    ]);
    if (value) fetched[envVar] = value;
  }
  return fetched;
}

/** Injectable so the tests never touch a real .env.e2e. */
const defaultFs = {
  exists: (file) => existsSync(file),
  read: (file) => readFileSync(file, 'utf8'),
  write: (file, text) => writeFileSync(file, text, 'utf8'),
};

/**
 * Top up whatever is missing, into this process and into .env.e2e.
 *
 * `missingEnvVars` comes from the same REQUIRED_ENV the gate reads, so the two can never
 * drift: adding a value to preflight.mjs automatically makes it something this fetches.
 *
 * Returns a short report so the caller can say what happened. Writing to process.env is
 * what makes the value reach the run: every child this script spawns inherits it, which
 * covers the Playwright config's dotenv load, the web dev server and run-e2e.sh alike.
 */
export function ensureSecrets(
  missingEnvVars,
  { envFile, vault = DEFAULT_VAULT, az = runAz, env = process.env, fs = defaultFs } = {},
) {
  if (missingEnvVars.length === 0) return { attempted: false, fetched: [], failed: [] };
  if (!azIsReady(az)) {
    return { attempted: false, unavailable: true, fetched: [], failed: missingEnvVars };
  }

  const fetched = fetchSecrets(missingEnvVars, { vault, az });
  const names = Object.keys(fetched);
  for (const [key, value] of Object.entries(fetched)) env[key] = value;

  if (names.length > 0 && envFile) {
    try {
      const existing = fs.exists(envFile) ? fs.read(envFile) : '';
      fs.write(envFile, mergeEnvFile(existing, fetched));
    } catch {
      // An unwritable .env.e2e is not fatal: the values are already in process.env, so
      // THIS run is fine. Only the persistence for a later `npx playwright test` is lost,
      // and `pull:env` can still supply that.
    }
  }

  return {
    attempted: true,
    fetched: names,
    failed: missingEnvVars.filter((name) => !names.includes(name)),
  };
}
