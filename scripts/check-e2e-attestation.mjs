#!/usr/bin/env node
/**
 * E2E attestation gate.
 *
 * The E2E suite is too expensive to run per PR, so what is enforced is the *claim*
 * that it was run — bound to the commit it was run against. This script runs no
 * tests; it costs seconds.
 *
 * It maps the PR diff through e2e/scripts/affected-specs.mjs and requires the PR body
 * to carry one or more of the lines `npm run e2e:affected` prints:
 *
 *   e2e: sha=<40-hex> base=<ref|40-hex> result=passed specs=<n> at=<iso8601>
 *
 * ── Delta attestation ────────────────────────────────────────────────────────
 * A line is not invalidated by every push. It is invalidated only for the specs that
 * have actually changed since it ran. `base` says which range the run covered, and the
 * range is re-derived here from the git history rather than trusted from the paste:
 *
 *   covered     = specs selected by  base..sha    (what that run exercised)
 *   invalidated = specs selected by  sha..head    (what has moved under it since)
 *   proven      = covered - invalidated
 *
 * Lines union, so a full run plus a later top-up run together cover the whole diff.
 * The practical effect: merging `dev` into a PR only costs a re-run of the specs the
 * incoming changes touch, and usually costs nothing at all.
 *
 * Nothing here is forgeable beyond what already was — `covered` comes from the diff,
 * not from the developer, so a line can only ever claim what its range really contains.
 * `result=passed` remains the honour-system half, backstopped post-merge.
 *
 * The full contract lives in docs/standards/e2e-testing.md § Pre-push attestation.
 *
 * Usage (locally, needs `gh auth login`):
 *   node scripts/check-e2e-attestation.mjs --pr 123
 *
 * In CI everything comes from the environment instead:
 *   PR_NUMBER, PR_HEAD_SHA, PR_BODY, PR_BASE_REF, PR_LABELS (comma-separated),
 *   GITHUB_REPOSITORY
 */

import { spawnSync } from 'node:child_process';
import {
  outstandingSpecs,
  pruneScriptOnlyPackageJson,
  resolveAffected,
} from '../e2e/scripts/affected-specs.mjs';

const SKIP_LABEL = 'skip-e2e';
const ATTESTATION_RE =
  /^\s*e2e:\s*sha=([0-9a-fA-F]{40})(?:\s+base=(\S+))?\s+result=(\S+)\s+specs=(\d+)\s+at=(\S+)\s*$/gm;
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
function gh(args, { allowFailure = false } = {}) {
  const result = spawnSync('gh', args, { encoding: 'utf8', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    if (allowFailure) return null;
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
      baseRef: process.env.PR_BASE_REF || 'dev',
      body: process.env.PR_BODY ?? '',
      labels: (process.env.PR_LABELS ?? '').split(',').map((l) => l.trim()).filter(Boolean),
    };
  }
  if (!prNumber) {
    console.error('No PR context. Pass --pr <number> or set PR_NUMBER/PR_HEAD_SHA/PR_BODY.');
    process.exit(1);
  }
  const json = JSON.parse(
    gh(['pr', 'view', String(prNumber), '--json', 'headRefOid,baseRefName,body,labels']),
  );
  return {
    number: prNumber,
    headSha: json.headRefOid,
    baseRef: json.baseRefName ?? 'dev',
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

/**
 * Files changed between two refs, and whether `from` is genuinely behind `to`.
 *
 * Three-dot compare, so this is `merge-base(from, to)..to` — the same range GitHub's
 * PR files endpoint reports. When `from` is an ancestor of `to` that is exactly
 * `from..to`, which is what every caller here relies on.
 *
 * @returns {{ files: string[], status: string } | null} null when either ref is unknown
 */
function compare(from, to) {
  if (!repo) {
    // Local fallback — both refs are in the working clone.
    const merged = spawnSync('git', ['merge-base', from, to], { encoding: 'utf8' });
    if (merged.status !== 0) return null;
    const base = merged.stdout.trim();
    const diff = spawnSync('git', ['diff', '--name-only', `${base}..${to}`], { encoding: 'utf8' });
    if (diff.status !== 0) return null;
    return {
      files: diff.stdout.trim().split('\n').filter(Boolean),
      status: base === from ? (from === to ? 'identical' : 'ahead') : 'diverged',
      mergeBase: base,
    };
  }
  const status = gh(
    ['api', `repos/${repo}/compare/${from}...${to}`, '--jq', '.status'],
    { allowFailure: true },
  );
  if (status === null) return null;
  const files = gh(
    ['api', '--paginate', `repos/${repo}/compare/${from}...${to}`, '--jq', '.files[].filename'],
    { allowFailure: true },
  );
  // The merge base is the lower end of the three-dot range, and the only honest "before" ref
  // for reading a file's previous content.
  const mergeBase = gh(
    ['api', `repos/${repo}/compare/${from}...${to}`, '--jq', '.merge_base_commit.sha'],
    { allowFailure: true },
  );
  return { files: (files ?? '').split('\n').filter(Boolean), status, mergeBase };
}

function commitDate(sha) {
  if (!repo) {
    const result = spawnSync('git', ['log', '-1', '--format=%cI', sha], { encoding: 'utf8' });
    return result.status === 0 ? result.stdout.trim() : null;
  }
  return gh(['api', `repos/${repo}/commits/${sha}`, '--jq', '.commit.committer.date'], {
    allowFailure: true,
  });
}

/**
 * Content of a file at a commit. In CI the checkout is shallow and may not even contain the
 * PR head, so the API is the source; locally, `git show` is. Null when absent or unreadable,
 * which the prune treats as "reaches a suite" — the safe direction.
 */
function textAt(sha, file) {
  if (!repo) {
    const result = spawnSync('git', ['show', `${sha}:${file}`], { encoding: 'utf8' });
    return result.status === 0 ? result.stdout : null;
  }
  const content = gh(['api', `repos/${repo}/contents/${file}?ref=${sha}`, '--jq', '.content'], {
    allowFailure: true,
  });
  if (!content) return null;
  try {
    return Buffer.from(content.replace(/\s/g, ''), 'base64').toString('utf8');
  } catch {
    return null;
  }
}

/** Drop every package.json in `files` whose change between the two refs cannot reach a suite. */
function prunePackageJson(files, baseRef, headRef) {
  return pruneScriptOnlyPackageJson(files, (file) => ({
    base: baseRef ? textAt(baseRef, file) : null,
    head: headRef ? textAt(headRef, file) : null,
  }));
}

/**
 * Verify one attestation line and work out what it still proves.
 *
 * `covered` and `invalidated` are both re-derived from the git history — the line
 * contributes only its endpoints and the pass/fail claim.
 *
 * @returns {{ ok: true, covered: string[], invalidated: string[] }
 *         | { ok: false, reason: string }}
 */
function evaluate(line, pr) {
  const { sha, base, result, at } = line;

  if (result !== 'passed') {
    return { ok: false, reason: `records result=${result} — only a passing run counts` };
  }

  // The run must sit on this PR's history, at or behind the head. This is what stops a
  // line being lifted from an unrelated branch.
  const sinceHead = compare(sha, pr.headSha);
  if (!sinceHead) {
    return { ok: false, reason: `sha ${sha.slice(0, 8)} is not a commit in this repository` };
  }
  if (sinceHead.status !== 'ahead' && sinceHead.status !== 'identical') {
    return {
      ok: false,
      reason:
        `sha ${sha.slice(0, 8)} is not an ancestor of the PR head ` +
        `(compare says "${sinceHead.status}") — it does not describe this branch`,
    };
  }

  const range = compare(base, sha);
  if (!range) {
    return { ok: false, reason: `base ${base} is not a ref in this repository` };
  }
  // A *branch* base is expected to have diverged — `dev` moves on after the branch is
  // cut, and that is the ordinary state of every PR. The three-dot compare still yields
  // merge-base..sha, which is precisely the PR diff at that commit, so divergence is
  // not a problem there. A *commit* base is different: a top-up line means "everything
  // since that run", which is only a coherent range when the run is genuinely behind.
  if (/^[0-9a-fA-F]{40}$/.test(base) && range.status !== 'ahead' && range.status !== 'identical') {
    return {
      ok: false,
      reason: `base ${base.slice(0, 8)} is not an ancestor of sha ${sha.slice(0, 8)} ("${range.status}")`,
    };
  }

  const attestedTime = Date.parse(at);
  if (Number.isNaN(attestedTime)) {
    return { ok: false, reason: `unparseable timestamp: ${at}` };
  }
  if (attestedTime > Date.now() + FUTURE_SKEW_MS) {
    return { ok: false, reason: `timestamp is in the future (${at}) — check the machine clock` };
  }
  const committed = commitDate(sha);
  const committedTime = committed ? Date.parse(committed) : Number.NaN;
  if (!Number.isNaN(committedTime) && attestedTime < committedTime) {
    return {
      ok: false,
      reason: `ran at ${at}, before the commit it claims to cover (${committed})`,
    };
  }

  // Pruned on both sides, or a scripts-only edit pushed after a passing run would invalidate
  // the whole suite — the exact cost this rule exists to remove.
  //
  // The base side reads `range.mergeBase`, not `base`: `compare()` diffs
  // merge-base(base, sha)..sha, so reading the branch tip instead would compare two ends that
  // are not the ends of the diff, and a dependency landing on `dev` would inflate `covered`
  // to both full suites. `sinceHead`'s lower end is `sha` itself, already an ancestor.
  return {
    ok: true,
    covered: resolveAffected(prunePackageJson(range.files, range.mergeBase, sha)).specs,
    invalidated: resolveAffected(prunePackageJson(sinceHead.files, sha, pr.headSha)).specs,
  };
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

/** The merge base of the PR's target and head — the "before" side of every file in the diff. */
function prMergeBase(pr) {
  if (!repo) {
    const result = spawnSync('git', ['merge-base', pr.baseRef, pr.headSha], { encoding: 'utf8' });
    return result.status === 0 ? result.stdout.trim() : null;
  }
  return gh(
    ['api', `repos/${repo}/compare/${pr.baseRef}...${pr.headSha}`, '--jq', '.merge_base_commit.sha'],
    { allowFailure: true },
  );
}

// A package.json counts only when something other than its inert keys moved; a scripts edit
// cannot reach a browser. Same rule the local runner and the pre-push hook apply, one helper.
const files = prunePackageJson(changedFiles(pr.number), prMergeBase(pr), pr.headSha);
const { specs: required, reasons, uncovered } = resolveAffected(files);

console.log(`PR #${pr.number} — ${files.length} changed file(s), head ${pr.headSha.slice(0, 8)}`);

if (uncovered.length > 0) {
  console.log(`\n${uncovered.length} path(s) match no rule in e2e/scripts/affected-specs.mjs:`);
  for (const file of uncovered.slice(0, 15)) console.log(`  ? ${file}`);
  if (uncovered.length > 15) console.log(`  ? …and ${uncovered.length - 15} more`);
}

if (required.length === 0) {
  pass('No E2E-relevant changes in this PR — no attestation required.');
}

console.log('\nSpecs this diff selects:');
for (const spec of required) console.log(`  • ${spec}  (${reasons[spec].join(', ')})`);

const lines = [...pr.body.matchAll(ATTESTATION_RE)].map(([, sha, base, result, count, at]) => ({
  sha,
  // Lines predating delta attestation carry no `base`; they were always full runs
  // against the target branch, so that is what they are read as.
  base: base ?? pr.baseRef,
  result,
  count,
  at,
}));

function howTo(outstanding, newest) {
  const command = newest
    ? `npm run e2e:affected -- --since ${newest.sha}`
    : 'npm run e2e:affected';
  return [
    '  Outstanding specs:',
    ...outstanding.map((s) => `    • ${s}`),
    '',
    '  Run them, then add the line it prints to the ## E2E section of the PR',
    '  (add — existing lines still count for what they cover):',
    '',
    `    ${command}`,
    '',
    '  Docs: docs/standards/e2e-testing.md § Pre-push attestation',
  ].join('\n');
}

if (lines.length === 0) {
  fail(
    'The PR description has no E2E attestation line.\n' +
      '  Expected: e2e: sha=<40-hex> base=<ref> result=passed specs=<n> at=<iso8601>',
    howTo(required, null),
  );
}

console.log(`\n${lines.length} attestation line(s) in the PR description:`);
const valid = [];
for (const line of lines) {
  const verdict = evaluate(line, pr);
  if (!verdict.ok) {
    console.log(`  ✗ ${line.sha.slice(0, 8)} — ${verdict.reason}`);
    continue;
  }
  valid.push({ line, verdict });

  // Whatever this line covered, minus everything that has moved since it ran.
  const stale = outstandingSpecs(verdict.covered, [verdict]);
  const summary =
    verdict.covered.length === 0
      ? 'covered nothing'
      : stale.length === 0
        ? `still proves all of ${verdict.covered.join(', ')}`
        : `superseded for ${stale.join(', ')}`;
  const base = /^[0-9a-fA-F]{40}$/.test(line.base) ? line.base.slice(0, 8) : line.base;
  console.log(`  ✓ ${line.sha.slice(0, 8)} (base ${base}) — ${summary}`);
}

const outstanding = outstandingSpecs(
  required,
  valid.map((v) => v.verdict),
);

if (outstanding.length > 0) {
  // Point at the latest valid run so `--since` covers the smallest possible delta.
  // Body order is not reliably chronological, so go by the recorded timestamp.
  const newest =
    valid
      .map((v) => v.line)
      .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
      .at(-1) ?? null;
  fail(
    valid.length === 0
      ? 'No attestation line in the PR description is valid for this branch.'
      : `${outstanding.length} selected spec path(s) are not covered by a current attestation.`,
    howTo(outstanding, newest),
  );
}

pass(
  `E2E attested for ${pr.headSha.slice(0, 8)} — all ${required.length} selected spec path(s) ` +
    `covered by ${valid.length} attestation line(s).`,
);
