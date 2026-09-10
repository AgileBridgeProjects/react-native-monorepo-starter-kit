#!/usr/bin/env node
/**
 * Pre-push E2E receipt gate.
 *
 * Reads the refs being pushed from stdin (git's pre-push hook contract), maps the
 * pushed diff through e2e/scripts/affected-specs.mjs, and — when specs are selected —
 * requires a passing `e2e/.e2e-receipt.json` that matches the exact code state being
 * pushed. Its job is to turn "I forgot" into "I chose to skip".
 *
 * This gate cannot be made unbypassable: `git push --no-verify` skips every hook, and
 * nothing client-side can prevent that. The backstop is server-side — the required
 * `E2E Attestation` check on the PR (scripts/check-e2e-attestation.mjs), which is bound
 * to the head SHA and cannot be satisfied locally at all.
 *
 * Escape hatch: E2E_SKIP="reason" — passes, but says so loudly and records nothing.
 *
 * Contract: docs/standards/e2e-testing.md § Pre-push attestation.
 *
 * Usage: node scripts/check-e2e-receipt.mjs   (invoked by .husky/pre-push)
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  outstandingSpecs,
  pruneScriptOnlyPackageJson,
  resolveAffected,
} from '../e2e/scripts/affected-specs.mjs';
import { ZERO_SHA, parsePushRefs } from './lib/pre-push-refs.mjs';

const RECEIPT_PATH = 'e2e/.e2e-receipt.json';
/** A receipt older than this is treated as stale even if the digest still matches. */
const MAX_RECEIPT_AGE_MS = 24 * 60 * 60 * 1000;

const C = { reset: '\x1b[0m', red: '\x1b[0;31m', green: '\x1b[0;32m', yellow: '\x1b[1;33m' };
const label = `${C.green}[e2e-receipt]${C.reset}`;

function git(args, { allowFailure = false } = {}) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0) {
    if (allowFailure) return null;
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr?.trim()}`);
  }
  return result.stdout.trim();
}

/**
 * Set once the pushed range is known. When a branch already exists on the remote the
 * push is a delta, so the cheap fix is a top-up run over just those commits rather
 * than the whole branch selection.
 */
let suggestedRun = 'npm run e2e:affected';

function blocked(reason, detail) {
  console.error(`\n${C.red}✗ E2E not run for what you are pushing${C.reset}\n`);
  console.error(`  ${reason}\n`);
  if (detail) console.error(`${detail}\n`);
  console.error('  Run the affected specs (warm containers make this quick):\n');
  console.error(`    E2E_KEEP_UP=1 ${suggestedRun}\n`);
  console.error('  Genuinely not applicable? Say so explicitly:\n');
  console.error('    E2E_SKIP="reason" git push\n');
  console.error('  Contract: docs/standards/e2e-testing.md § Pre-push attestation\n');
  process.exit(1);
}

// Ref parsing lives in scripts/lib/pre-push-refs.mjs: the hook reads git's lines once and
// pipes the same string to this gate and to pre-push-tag-skip.mjs, so both must read them
// identically. They each had their own parser and their own ZERO_SHA until they were unified.

/** First ref that exists, used when the remote has no copy of the branch yet. */
function defaultBase() {
  for (const ref of ['origin/dev', 'origin/main', 'dev', 'main']) {
    if (git(['rev-parse', '--verify', '--quiet', ref], { allowFailure: true })) return ref;
  }
  return null;
}

/** Content of a file at a ref, or null when the ref lacks it (added, deleted, unknown ref). */
function textAt(ref, file) {
  return git(['show', `${ref}:${file}`], { allowFailure: true });
}

/** Files changed by the commits being pushed, across every pushed ref. */
function pushedFiles(refs) {
  const files = new Set();
  for (const { localSha, remoteSha } of refs) {
    // New branch on the remote: diff against the default branch instead of the whole
    // history, or the very first push of a branch would select every spec.
    const base = remoteSha && remoteSha !== ZERO_SHA ? remoteSha : defaultBase();
    const range = base ? `${base}..${localSha}` : localSha;
    const out = git(['diff', '--name-only', range], { allowFailure: true });
    if (out === null) continue;
    // A package.json counts only when a dependency section moved; a scripts edit cannot
    // reach a browser. Same rule the runner and the CI gate apply, from the same helper.
    const pruned = pruneScriptOnlyPackageJson(out.split('\n').filter(Boolean), (file) => ({
      base: base ? textAt(base, file) : null,
      head: textAt(localSha, file),
    }));
    for (const file of pruned) files.add(file);
  }
  return [...files];
}

/**
 * Fallback when stdin carries nothing usable — a manual invocation, or a platform
 * where reading fd 0 fails. Never return an empty list on failure: that would
 * silently turn this gate into a no-op, which is worse than a false positive.
 */
function fallbackFiles() {
  const upstream = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'], {
    allowFailure: true,
  });
  const base = upstream ?? defaultBase();
  if (!base) return [];
  const out = git(['diff', '--name-only', `${base}..HEAD`], { allowFailure: true });
  return pruneScriptOnlyPackageJson(out ? out.split('\n').filter(Boolean) : [], (file) => ({
    base: textAt(base, file),
    head: textAt('HEAD', file),
  }));
}

function readReceipt() {
  try {
    return JSON.parse(readFileSync(RECEIPT_PATH, 'utf8'));
  } catch {
    return null;
  }
}

// ── Run ───────────────────────────────────────────────────────────────────────
const skipReason = process.env.E2E_SKIP;
if (skipReason) {
  console.log(`\n${C.yellow}⚠  E2E receipt check skipped${C.reset}: ${skipReason}`);
  console.log('   The PR still needs a valid attestation before it can merge.\n');
  process.exit(0);
}

let stdin = '';
try {
  stdin = readFileSync(0, 'utf8');
} catch {
  stdin = '';
}

const { refs, sawLines } = parsePushRefs(stdin);
let files;
if (refs.length > 0) {
  files = pushedFiles(refs);
  // Single known-remote ref: the push is a delta, so point at the top-up run.
  const [only] = refs;
  if (refs.length === 1 && only.remoteSha && only.remoteSha !== ZERO_SHA) {
    suggestedRun = `npm run e2e:affected -- --since ${only.remoteSha}`;
  }
} else if (sawLines) {
  files = []; // deletions only
} else {
  files = fallbackFiles();
}
const { specs } = resolveAffected(files);

if (specs.length === 0) {
  console.log(`${label} no E2E-relevant changes in this push.`);
  process.exit(0);
}

const receipt = readReceipt();
if (!receipt) {
  blocked(
    `This push changes code covered by E2E specs, but ${RECEIPT_PATH} does not exist.`,
    `  Specs selected by this push:\n${specs.map((s) => `    • ${s}`).join('\n')}`,
  );
}

if (receipt.result !== 'passed') {
  blocked(`The last E2E run recorded result=${receipt.result}.`);
}

const headSha = git(['rev-parse', 'HEAD']);
if (receipt.headSha !== headSha) {
  blocked(
    'The receipt is for a different commit than the one you are pushing.',
    `    receipt: ${receipt.headSha}\n    HEAD:    ${headSha}`,
  );
}

if (Array.isArray(receipt.dirty) && receipt.dirty.length > 0) {
  blocked(
    'The recorded run covered an uncommitted working tree, so it does not describe any pushed commit.',
    `  Uncommitted at run time:\n${receipt.dirty.map((f) => `    ~ ${f}`).join('\n')}`,
  );
}

const finishedAt = Date.parse(receipt.finishedAt ?? '');
if (Number.isNaN(finishedAt)) {
  blocked(`The receipt has an unreadable finishedAt: ${receipt.finishedAt}`);
}
if (Date.now() - finishedAt > MAX_RECEIPT_AGE_MS) {
  const hours = Math.round((Date.now() - finishedAt) / 3_600_000);
  blocked(`The receipt is ${hours}h old — older than the 24h limit. Re-run to refresh it.`);
}

// The receipt must cover every spec this push selects. Running a superset is fine.
// `outstandingSpecs` is shared with the CI gate so the two agree about what a
// suite-root selection stands for — `tests/web` in a receipt covers `tests/web/auth`
// in a push, and every leaf in a receipt covers the suite root.
const recorded = receipt.specs ?? [];
const missing = outstandingSpecs(specs, [{ covered: recorded, invalidated: [] }]);
if (missing.length > 0) {
  blocked(
    'The recorded run did not cover every spec this push selects.',
    `  Missing:\n${missing.map((s) => `    • ${s}`).join('\n')}\n` +
      `  Recorded:\n${recorded.map((s) => `    • ${s}`).join('\n')}`,
  );
}

console.log(
  `${label} verified: ${specs.length} selected spec path(s) passed at ${receipt.finishedAt}.`,
);
