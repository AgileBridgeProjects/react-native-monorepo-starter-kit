#!/usr/bin/env node
/**
 * Repo-standards enforcer: asserts the monorepo's structural invariants that a
 * formatter/linter cannot express — single-source-of-truth docs exist, the agent
 * instruction files are present, the package-manager story stays npm-only, the
 * architectural guard-rails encoded in biome.json survive, and the quality gates
 * stay wired into the git hooks.
 *
 * These are intentionally *config* assertions, not code analysis (that lives in
 * check-architecture.mjs). Every rule here reflects a decision already documented
 * in docs/standards/ or CLAUDE.md — this script just stops it silently regressing.
 *
 * Usage: node scripts/check-standards.mjs   (also: npm run check:standards)
 */

import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const failures = [];

function fail(message) {
  failures.push(message);
}

async function exists(relativePath) {
  try {
    await access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8'));
}

async function readText(relativePath) {
  try {
    return await readFile(path.join(root, relativePath), 'utf8');
  } catch {
    return null;
  }
}

// ─── 1. Single-source-of-truth docs + agent instructions must exist ───────────
// CLAUDE.md routes every task to one of these; deleting/renaming one silently
// breaks the routing table for Claude, Copilot, Codex and every other agent.
const requiredFiles = [
  'CLAUDE.md',
  'AGENTS.md',
  '.github/copilot-instructions.md',
  '.editorconfig',
  '.gitattributes',
  'biome.json',
  'tsconfig.json',
  'tsconfig.base.json',
  'knip.json',
  'docs/erd.md',
  'docs/starterkit-brd.md',
  'docs/standards/monorepo.md',
  'docs/standards/architecture.md',
  'docs/standards/enforcement.md',
  'docs/standards/pr-readiness.md',
  'docs/standards/frontend.md',
  'docs/standards/frontend-web.md',
  'docs/standards/frontend-mobile.md',
  'docs/standards/supabase.md',
  'docs/standards/reporting.md',
  'docs/standards/e2e-testing.md',
  'docs/standards/notifications.md',
  'docs/standards/signalr.md',
  'docs/standards/caching.md',
  'docs/standards/audio.md',
  'docs/standards/nfr-security.md',
  'docs/standards/nfr-accessibility.md',
  'docs/standards/nfr-compliance.md',
  'docs/standards/nfr-performance.md',
  'docs/standards/nfr-observability.md',
  'docs/standards/backend/structure.md',
  'docs/standards/backend/controllers.md',
  'docs/standards/backend/repositories.md',
  'docs/standards/backend/testing.md',
  'docs/standards/backend/jobs.md',
  'docs/standards/backend/patterns.md',
  'docs/standards/backend/auditing.md',
  'docs/standards/backend/multitenancy.md',
];
for (const file of requiredFiles) {
  if (!(await exists(file))) fail(`missing single-source-of-truth file: ${file}`);
}

// ─── 2. npm is the only package manager ───────────────────────────────────────
if (!(await exists('package-lock.json'))) {
  fail('package-lock.json: the npm lockfile must be committed');
}
for (const lockfile of ['pnpm-lock.yaml', 'yarn.lock', 'bun.lock', 'bun.lockb']) {
  if (await exists(lockfile)) fail(`${lockfile}: npm is the only supported package manager`);
}

// ─── 3. package.json: workspace shape + required scripts ───────────────────────
const packageJson = await readJson('package.json');
if (packageJson.private !== true) fail('package.json: the workspace root must stay private');
for (const workspaceGlob of ['apps/*', 'packages/*', 'e2e']) {
  if (!packageJson.workspaces?.includes(workspaceGlob)) {
    fail(`package.json: workspaces must include "${workspaceGlob}"`);
  }
}
for (const script of [
  'lint',
  'format',
  'typecheck',
  'test',
  // The repo's own tooling tests. They are cheap and they guard the release scripts, so a
  // silent regression there must fail something.
  'test:scripts',
  'check',
  'knip',
  'check:locale-casing',
  'check:secrets',
  'check:markdown',
  'check:architecture',
  'check:standards',
  'scaffold:backend',
  'scaffold:frontend',
  'generate:proxy',
  'e2e',
  'e2e:affected',
  'check:e2e-attestation',
  'check:e2e-receipt',
]) {
  if (!packageJson.scripts?.[script]) fail(`package.json: missing script "${script}"`);
}

// ─── 3b. The E2E attestation gate stays intact ─────────────────────────────────
// E2E is deliberately not a required CI suite; the attestation check is what stands
// in for it. Losing any leg of it silently removes the only per-PR E2E enforcement.
// See docs/standards/e2e-testing.md § Pre-push attestation.
for (const file of [
  'e2e/scripts/affected-specs.mjs',
  'e2e/scripts/e2e-affected.mjs',
  'scripts/check-e2e-attestation.mjs',
  'scripts/check-e2e-receipt.mjs',
  '.github/workflows/e2e-attestation.yml',
]) {
  if (!(await exists(file))) fail(`missing E2E attestation gate file: ${file}`);
}
const prTemplate = (await readText('.github/pull_request_template.md')) ?? '';
if (!prTemplate.includes('## E2E')) {
  fail('.github/pull_request_template.md: must keep the "## E2E" attestation section');
}

// ─── 4. TypeScript strictness (shared base config) ─────────────────────────────
const tsconfigBase = await readJson('tsconfig.base.json');
for (const option of ['strict', 'forceConsistentCasingInFileNames', 'isolatedModules']) {
  if (tsconfigBase.compilerOptions?.[option] !== true) {
    fail(`tsconfig.base.json: ${option} must remain enabled`);
  }
}

// ─── 5. biome.json architectural guard-rails must survive ──────────────────────
const biome = await readJson('biome.json');
const overrides = biome.overrides ?? [];
const includesOverride = (glob) =>
  overrides.find((o) => (o.includes ?? []).some((g) => g.includes(glob)));

const proxyOverride = includesOverride('src/proxy/');
if (proxyOverride?.linter?.enabled !== false) {
  fail('biome.json: the generated proxy (**/src/proxy/**) must keep linting disabled');
}
const datasourceOverride = includesOverride('infrastructure/datasources/');
const restricted =
  datasourceOverride?.linter?.rules?.style?.noRestrictedImports?.options?.paths ?? {};
if (!('@lib/http' in restricted)) {
  fail(
    'biome.json: datasources must keep the noRestrictedImports guard against raw @lib/http (use the generated proxy)',
  );
}
if (biome.linter?.rules?.style?.useConst !== 'error') {
  fail('biome.json: style.useConst must remain an error');
}

// ─── 6. Quality gates stay wired into the git hooks ────────────────────────────
const preCommit = (await readText('.husky/pre-commit')) ?? '';
const prePush = (await readText('.husky/pre-push')) ?? '';
const commitMsg = (await readText('.husky/commit-msg')) ?? '';
for (const command of ['lint-staged', 'check:locale-casing', 'check:architecture']) {
  if (!preCommit.includes(command)) fail(`.husky/pre-commit: must run ${command}`);
}
for (const command of [
  'typecheck',
  'knip',
  'check:secrets',
  'check:standards',
  'check-e2e-receipt',
]) {
  if (!prePush.includes(command)) fail(`.husky/pre-push: must run ${command}`);
}
if (!commitMsg.includes('commitlint')) {
  fail('.husky/commit-msg: must enforce Conventional Commits via commitlint');
}

// ─── 6b. CI mirrors the hooks ──────────────────────────────────────────────────
// `git push --no-verify` cannot be blocked client-side, so ci.yml repeats every hook
// gate server-side where it blocks the merge instead. A gate present in a hook but
// absent from CI is bypassable — that is the hole this assertion closes.
// See docs/standards/enforcement.md § CI gates.
const ciWorkflow = (await readText('.github/workflows/ci.yml')) ?? '';
for (const command of [
  'npm run lint',
  'npm run typecheck',
  'npm run check:locale-casing',
  'npm run check:architecture',
  'npm run check:standards',
  'npm run check:secrets:all',
  'npm run knip',
  'npm run check:markdown',
]) {
  if (!ciWorkflow.includes(command)) {
    fail(`.github/workflows/ci.yml: must mirror the hook gate "${command}"`);
  }
}

// ─── 6c. Agent hooks stay wired ────────────────────────────────────────────────
// The Claude Code hooks in .claude/hooks/ are the *earliest* gate: they format on write
// and refuse edits to generated files before the change exists. They are ergonomics, not
// a merge gate (CI is still the backstop), but a hook silently unwired from
// .claude/settings.json is invisible — nothing fails, the guard just stops running.
// See docs/standards/enforcement.md § Agent hooks.
const claudeSettings = (await readText('.claude/settings.json')) ?? '';
for (const hook of [
  'lint-on-edit.mjs',
  'guard-write.mjs',
  'guard-bash.mjs',
  'pr-readiness-nudge.mjs',
  'pr-prose-guard.mjs',
]) {
  if (!(await exists(`.claude/hooks/${hook}`))) fail(`missing agent hook: .claude/hooks/${hook}`);
  if (!claudeSettings.includes(hook)) {
    fail(`.claude/settings.json: must wire the agent hook "${hook}"`);
  }
}

// ─── 6d. The PR skills exist, and their Claude mirror has not drifted ──────────
// `.agents/skills/` is the canonical copy (docs/ai-tooling-setup.md § 1); `.claude/skills/`
// is a byte-identical mirror so Claude Code discovers them. Two copies drift silently, and a
// drifted house-style skill is worse than no house-style skill: the agent follows whichever
// one it happened to load. See docs/standards/pr-readiness.md § Then: writing it.
for (const file of [
  '.agents/commands/review-pr.md',
  '.claude/commands/review-pr.md',
  'scripts/pr-review-diff.mjs',
]) {
  if (!(await exists(file))) fail(`missing PR review tooling: ${file}`);
}
for (const skillFile of [
  'pr-writing/SKILL.md',
  'pr-writing/ARTIFACTS.md',
  'pr-review/SKILL.md',
]) {
  const canonical = await readText(`.agents/skills/${skillFile}`);
  const mirror = await readText(`.claude/skills/${skillFile}`);
  if (canonical === null) fail(`missing skill: .agents/skills/${skillFile}`);
  else if (mirror === null) fail(`missing Claude mirror: .claude/skills/${skillFile}`);
  else if (canonical !== mirror) {
    fail(`.claude/skills/${skillFile}: drifted from .agents/skills/${skillFile} (copy it over)`);
  }
}

// ─── 7. No stray duplicate / merge-conflict copies ────────────────────────────
async function walk(dir) {
  let out = [];
  let entries;
  try {
    entries = await readdir(path.join(root, dir), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out = out.concat(await walk(rel));
    else out.push(rel);
  }
  return out;
}
for (const dir of ['apps', 'packages', 'docs', 'e2e', 'tools', 'scripts', 'infra']) {
  for (const file of await walk(dir)) {
    if (/\s(?:copy|conflict|\d+)\.[^.]+$/i.test(path.basename(file))) {
      fail(`${file}: remove duplicate/merge-conflict copy`);
    }
  }
}

// ─── Report ────────────────────────────────────────────────────────────────────
if (failures.length > 0) {
  console.error(`[check-standards] ${failures.length} violation(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`[check-standards] passed (${requiredFiles.length} required files verified).`);
