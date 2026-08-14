#!/usr/bin/env node
/**
 * E2E attestation gate.
 *
 * The E2E suite is too expensive to run per PR, so what is enforced is the *claim*
 * that it was run — bound to the commit it was run against. This script runs no
 * tests; it costs seconds.
 *
 * It maps the PR diff through e2e/scripts/affected-specs.mjs and, if any spec is
 * selected, requires the PR body to carry the line `npm run e2e:affected` prints:
 *
 *   e2e: sha=<40-hex> result=passed specs=<n> at=<iso8601>
 *
 * Verified: the SHA is the PR head, the timestamp post-dates that commit and is not
 * in the future, and the result is a pass. Any new push invalidates the line.
 *
 * The full contract lives in docs/standards/e2e-testing.md § Pre-push attestation.
 *
 * Usage (locally, needs `gh auth login`):
 *   node scripts/check-e2e-attestation.mjs --pr 123
 *
 * In CI everything comes from the environment instead:
 *   PR_NUMBER, PR_HEAD_SHA, PR_BODY, PR_LABELS (comma-separated), GITHUB_REPOSITORY
 */

import { spawnSync } from 'node:child_process';
import { resolveAffected } from '../e2e/scripts/affected-specs.mjs';

const SKIP_LABEL = 'skip-e2e';
const ATTESTATION_RE =
  /^\s*e2e:\s*sha=([0-9a-fA-F]{40})\s+result=(\S+)\s+specs=(\d+)\s+at=(\S+)\s*$/m;
/** Tolerance for a developer machine whose clock runs slightly fast. */
const FUTURE_SKEW_MS = 5 * 60 * 1000;

const argv = process.argv.slice(2);
const prArg = argv.indexOf('--pr');
const prNumber = prArg !== -1 ? argv[prArg + 1] : process.env.PR_NUMBER;
const repo = process.env.GITHUB_REPOSITORY;

function fail(message, hint) {
  console.error(`\n✗ E2E attestation missing or stale\n`);
  console.error(`  ${message}\n`);
  if (hint) console.error(`${hint}\n`);
  process.exit(1);
}

function pass(message) {
  console.log(`\n✓ ${message}\n`);
  process.exit(0);
}

/** @returns {string} stdout */
function gh(args) {
  const result = spawnSync('gh', args, { encoding: 'utf8', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    console.error(`gh ${args.join(' ')} failed:\n${result.stderr}`);
    process.exit(1);
  }
  return result.stdout.trim();
}

// ── Gather PR facts (env in CI, `gh` locally) ─────────────────────────────────
function loadPullRequest() {
  if (process.env.PR_HEAD_SHA && process.env.PR_BODY !== undefined) {
    return {
      number: prNumber,
      headSha: process.env.PR_HEAD_SHA,
      body: process.env.PR_BODY ?? '',
      labels: (process.env.PR_LABELS ?? '').split(',').map((l) => l.trim()).filter(Boolean),
    };
  }
  if (!prNumber) {
    console.error('No PR context. Pass --pr <number> or set PR_NUMBER/PR_HEAD_SHA/PR_BODY.');
    process.exit(1);
  }
  const json = JSON.parse(
    gh(['pr', 'view', String(prNumber), '--json', 'headRefOid,body,labels']),
  );
  return {
    number: prNumber,
    headSha: json.headRefOid,
    body: json.body ?? '',
    labels: (json.labels ?? []).map((l) => l.name),
  };
}

function changedFiles(number) {
  const endpoint = repo ? `repos/${repo}/pulls/${number}/files` : null;
  const args = endpoint
    ? ['api', '--paginate', endpoint, '--jq', '.[].filename']
    : ['pr', 'diff', String(number), '--name-only'];
  return gh(args).split('\n').filter(Boolean);
}

function headCommitDate(sha) {
  if (!repo) {
    // Local fallback — the commit is in the working clone.
    const result = spawnSync('git', ['log', '-1', '--format=%cI', sha], { encoding: 'utf8' });
    return result.status === 0 ? result.stdout.trim() : null;
  }
  return gh(['api', `repos/${repo}/commits/${sha}`, '--jq', '.commit.committer.date']);
}

// ── Run ───────────────────────────────────────────────────────────────────────
const pr = loadPullRequest();

// Drafts cannot be merged, so there is nothing to gate yet. Passing (rather than
// skipping the job) keeps a required check from deadlocking the PR.
if (process.env.PR_DRAFT === 'true') {
  pass('Draft PR — attestation is checked once the PR is marked ready for review.');
}

if (pr.labels.includes(SKIP_LABEL)) {
  console.log(`\n⚠  '${SKIP_LABEL}' label applied — E2E attestation deliberately bypassed.`);
  console.log('   GitHub records who applied the label; expect to justify it in review.\n');
  process.exit(0);
}

const files = changedFiles(pr.number);
const { specs, reasons, uncovered } = resolveAffected(files);

console.log(`PR #${pr.number} — ${files.length} changed file(s), head ${pr.headSha.slice(0, 8)}`);

if (uncovered.length > 0) {
  console.log(`\n${uncovered.length} path(s) match no rule in e2e/scripts/affected-specs.mjs:`);
  for (const file of uncovered.slice(0, 15)) console.log(`  ? ${file}`);
  if (uncovered.length > 15) console.log(`  ? …and ${uncovered.length - 15} more`);
}

if (specs.length === 0) {
  pass('No E2E-relevant changes in this PR — no attestation required.');
}

console.log('\nSpecs this diff selects:');
for (const spec of specs) console.log(`  • ${spec}  (${reasons[spec].join(', ')})`);

const howTo = [
  '  To satisfy this check:',
  '',
  '    npm run e2e:affected',
  '',
  '  Then paste the line it prints into the ## E2E section of the PR description.',
  '  Docs: docs/standards/e2e-testing.md § Pre-push attestation',
].join('\n');

const match = pr.body.match(ATTESTATION_RE);
if (!match) {
  fail(
    'The PR description has no E2E attestation line.\n' +
      `  Expected: e2e: sha=<40-hex> result=passed specs=<n> at=<iso8601>`,
    howTo,
  );
}

const [, attestedSha, result, attestedSpecs, attestedAt] = match;

if (attestedSha.toLowerCase() !== pr.headSha.toLowerCase()) {
  fail(
    `The attestation is for a different commit.\n` +
      `    attested: ${attestedSha}\n` +
      `    PR head:  ${pr.headSha}\n` +
      `  A new commit was pushed after the tests were run, so the result no longer applies.`,
    howTo,
  );
}

if (result !== 'passed') {
  fail(`The attestation records result=${result}. Only a passing run counts.`, howTo);
}

const attestedTime = Date.parse(attestedAt);
if (Number.isNaN(attestedTime)) {
  fail(`Could not parse the attestation timestamp: ${attestedAt}`, howTo);
}

const commitDate = headCommitDate(pr.headSha);
const commitTime = commitDate ? Date.parse(commitDate) : Number.NaN;
if (!Number.isNaN(commitTime) && attestedTime < commitTime) {
  fail(
    `The attested run predates the commit it claims to cover.\n` +
      `    run at:     ${attestedAt}\n` +
      `    committed:  ${commitDate}\n` +
      `  Re-run the suite against the current head.`,
    howTo,
  );
}

if (attestedTime > Date.now() + FUTURE_SKEW_MS) {
  fail(
    `The attestation timestamp is in the future (${attestedAt}).\n` +
      '  Check the machine clock, then re-run.',
    howTo,
  );
}

console.log(
  `\n  attested: ${attestedSpecs} spec path(s), run at ${attestedAt}` +
    `\n  head commit: ${commitDate ?? 'unknown'}`,
);
pass(`E2E attested for ${pr.headSha.slice(0, 8)} — ${specs.length} selected spec path(s).`);
