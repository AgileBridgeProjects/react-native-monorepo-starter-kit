#!/usr/bin/env node
/**
 * PreToolUse hook (Bash) — when the agent is about to open a PR, inject the two things
 * that are mandatory before one exists and that no script can check for it.
 *
 * `docs/standards/pr-readiness.md` is the half of the quality gates that *cannot* be
 * scripted (is this shared thing actually shared? does this comment still describe the
 * code?), and the E2E attestation line is a required CI check that fails the PR after the
 * fact if it is missing. Both are cheap to remember and expensive to forget.
 *
 * Never blocks — the only output is additionalContext. Two rules keep it quiet:
 *   - read-only gh/glab commands (pr view/list/checks/diff) never fire
 *   - it fires at most once per session, tracked in the OS temp dir
 *
 * Fail-open on anything unexpected. Set VYBE_HOOK_NUDGE=0 to disable.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Anchored to the start of a command segment so a match inside a quoted argument does not
// burn the session's one nudge. `rtk` is the repo's token-reducing CLI wrapper, so
// `rtk gh pr create` has to match too — hence the optional wrapper word.
const PR_CREATE = /(?:^|[;&|(\n])\s*(?:rtk\s+)?(?:gh\s+pr\s+create|glab\s+mr\s+create)\b/;

// The raw-API equivalent: a POST to the collection endpoint itself. `/pulls/57/comments` and
// `/pulls/57/reviews` are sub-resources of an existing PR, so the negative lookahead keeps
// reading and reviewing a PR from burning the session's one create-time nudge.
const PR_CREATE_API = /gh\s+api\b[^;&|\n]*\/pulls(?![/?\w])/;
const POST = /(?:-X|--method)[=\s]+['"]?POST/i;

const isPrCreate = (command) =>
  PR_CREATE.test(command) || (PR_CREATE_API.test(command) && POST.test(command));

const CONTEXT = [
  'Before opening this PR, two mandatory steps that no CI gate can do for you:',
  '',
  '1. **Standards sweep** — run the ten checks in `docs/standards/pr-readiness.md` over the',
  '   branch diff (shared-before-local, comment accuracy, typed failures, i18n, tokens, a11y,',
  '   cross-surface blast radius, diagnostics removed, verification actually ran). These are the',
  '   rules a script cannot express; the scripted half already ran in the git hooks.',
  '2. **E2E attestation** — if the diff touches spec-covered code, the PR body needs the',
  '   attestation line bound to the head SHA, or `e2e-attestation.yml` fails the PR.',
  '   Generate it with `npm run e2e:affected` (`-- --dry-run` to see the selection first).',
  '   See `docs/standards/e2e-testing.md` § Pre-push attestation.',
  '',
  'The `/pr` command runs both.',
].join('\n');

function markerPath(sessionId) {
  const safe = String(sessionId).replaceAll(/[^\w-]/g, '');
  return path.join(os.tmpdir(), 'starterkit-hooks', `pr-nudge-${safe || 'unknown'}`);
}

function main() {
  if (process.env.VYBE_HOOK_NUDGE === '0') return;

  const input = JSON.parse(readFileSync(0, 'utf8'));
  const command = input?.tool_input?.command;
  if (typeof command !== 'string' || !isPrCreate(command)) return;

  const marker = markerPath(input?.session_id);
  if (existsSync(marker)) return;
  mkdirSync(path.dirname(marker), { recursive: true });
  writeFileSync(marker, '');

  process.stdout.write(
    `${JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: CONTEXT },
    })}\n`,
  );
}

try {
  main();
} catch {
  // Fail open — a reminder that cannot be delivered must never block the PR.
}
