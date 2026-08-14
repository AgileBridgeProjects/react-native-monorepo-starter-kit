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
import { resolveAffected } from '../e2e/scripts/affected-specs.mjs';

const RECEIPT_PATH = 'e2e/.e2e-receipt.json';
const ZERO_SHA = '0000000000000000000000000000000000000000';
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

function blocked(reason, detail) {
  console.error(`\n${C.red}✗ E2E not run for what you are pushing${C.reset}\n`);
  console.error(`  ${reason}\n`);
  if (detail) console.error(`${detail}\n`);
  console.error('  Run the affected specs (warm containers make this quick):\n');
  console.error('    E2E_KEEP_UP=1 npm run e2e:affected\n');
  console.error('  Genuinely not applicable? Say so explicitly:\n');
  console.error('    E2E_SKIP="reason" git push\n');
  console.error('  Contract: docs/standards/e2e-testing.md § Pre-push attestation\n');
  process.exit(1);
}

/**
 * Parse git's pre-push stdin: `<local ref> <local sha> <remote ref> <remote sha>`.
 *
 * `sawLines` distinguishes "git told us nothing" (fall back to a ref comparison)
 * from "git told us about deletions only" (genuinely nothing to test). Without it a
 * branch-deletion push would be blocked by the fallback.
 *
 * @param {string} stdin
 */
function readPushedRefs(stdin) {
  const refs = [];
  let sawLines = false;
  for (const line of stdin.split('\n').filter(Boolean)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 4) continue;
    sawLines = true;
    const [localRef, localSha, , remoteSha] = parts;
    if (localSha === ZERO_SHA) continue; // branch deletion — no commits to test
    refs.push({ localRef, localSha, remoteSha });
  }
  return { refs, sawLines };
}

/** First ref that exists, used when the remote has no copy of the branch yet. */
function defaultBase() {
  for (const ref of ['origin/dev', 'origin/main', 'dev', 'main']) {
    if (git(['rev-parse', '--verify', '--quiet', ref], { allowFailure: true })) return ref;
  }
  return null;
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
    for (const file of out.split('\n').filter(Boolean)) files.add(file);
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
  return out ? out.split('\n').filter(Boolean) : [];
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

const { refs, sawLines } = readPushedRefs(stdin);
let files;
if (refs.length > 0) {
  files = pushedFiles(refs);
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
const covered = new Set(receipt.specs ?? []);
const missing = specs.filter(
  (spec) => !covered.has(spec) && ![...covered].some((c) => spec.startsWith(`${c}/`)),
);
if (missing.length > 0) {
  blocked(
    'The recorded run did not cover every spec this push selects.',
    `  Missing:\n${missing.map((s) => `    • ${s}`).join('\n')}\n` +
      `  Recorded:\n${[...covered].map((s) => `    • ${s}`).join('\n')}`,
  );
}

console.log(
  `${label} verified: ${specs.length} selected spec path(s) passed at ${receipt.finishedAt}.`,
);
