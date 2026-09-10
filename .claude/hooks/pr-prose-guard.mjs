#!/usr/bin/env node
/**
 * PreToolUse hook (Bash) — governs prose the agent is about to publish to a GitHub PR.
 *
 * Two jobs, deliberately split by how checkable the rule is:
 *
 *   1. **Nudge.** The first time a session publishes PR prose, inject the `pr-writing` house
 *      style. Most of that skill (claim first, no diff narration, one comment one claim) is a
 *      judgement call, and the honest enforcement for a judgement call is to put the rule in
 *      front of the writer before they write. Fires once per session; the skill stays in
 *      context after that.
 *   2. **Deny.** A few of its rules are not judgement calls: zero em/en dashes, and a short
 *      list of chatbot tics that carry no information. Those are string matches, so they are
 *      blocked with the offending text quoted rather than left to a reminder.
 *
 * Read-only gh usage (pr view/list/diff/checks, api GET) never fires.
 *
 * Fail-open on anything unexpected. Set SK_HOOK_NUDGE=0 to disable.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Anchored to the start of a command segment (string start or just after ; & | newline or an
// opening paren) so a match inside a quoted argument does not fire. `rtk` is the repo's
// token-reducing CLI wrapper, so `rtk gh pr comment` has to match too.
const SEGMENT = String.raw`(?:^|[;&|(\n])\s*(?:rtk\s+)?`;

// gh forms that publish prose a human reads. `pr view|list|diff|checks|status|ready|merge`
// carry none, so they are absent and fall through.
const GH_PROSE = [
  new RegExp(`${SEGMENT}gh\\s+pr\\s+(?:create|edit|comment|review)\\b`),
  new RegExp(`${SEGMENT}gh\\s+issue\\s+(?:create|edit|comment)\\b`),
];

// `gh api` counts only when it writes to a prose endpoint. An explicit read method wins over
// the implied-POST heuristic, so `--method GET .../comments` stays quiet.
const GH_API = new RegExp(`${SEGMENT}gh\\s+api\\b`);
const PROSE_ENDPOINT = /\/(?:reviews|comments|pulls|issues)\b/;
const EXPLICIT_METHOD = /(?:-X|--method)[=\s]+['"]?(\w+)/i;
const BODY_FLAG = /(?:^|\s)(?:-f|-F|--field|--raw-field|--input)\b/;

function isProsePublish(command) {
  if (GH_PROSE.some((pattern) => pattern.test(command))) return true;
  if (!GH_API.test(command) || !PROSE_ENDPOINT.test(command)) return false;
  const method = EXPLICIT_METHOD.exec(command)?.[1]?.toUpperCase();
  if (method) return ['POST', 'PUT', 'PATCH'].includes(method);
  return BODY_FLAG.test(command);
}

// Inline prose: `--body "…"`, `--title '…'`, and gh api's `-f body=…` field form.
//
// The field form is split by where the quote lands, because both are written in the wild and
// one pattern cannot cover them without a backreference that breaks on the unquoted case:
//   -F "body=text"   quote before `body=`  (the shape used for @file, sometimes for text)
//   -f body="text"   quote after  `body=`  (the shape gh's own docs use)
//   -f body=text     unquoted single token
const FIELD = String.raw`(?:-f|-F|--field|--raw-field)[=\s]+`;
const INLINE_PROSE = [
  /(?:--body|--title|-b(?=\s)|-t(?=\s))[=\s]+(?:"((?:[^"\\]|\\.)*)"|'([^']*)')/g,
  new RegExp(`${FIELD}"body=(?!@)((?:[^"\\\\]|\\\\.)*)"`, 'g'),
  new RegExp(`${FIELD}'body=(?!@)([^']*)'`, 'g'),
  new RegExp(`${FIELD}body=(?!@)(?:"((?:[^"\\\\]|\\\\.)*)"|'([^']*)'|([^\\s"']+))`, 'g'),
];

// File-borne prose. The optional `["']?` after the flag is load-bearing: gh's field syntax is
// normally written `-F "body=@reply.txt"` with the quote BEFORE `body=`, not around the path,
// and a pattern anchored on a bare `-F\s+body=@` misses every quoted invocation. That gap let
// a batch of thread replies publish unchecked on PR #58.
const FILE_PROSE = [
  /(?:--body-file|--input)[=\s]+["']?([^\s"']+)["']?/g,
  /(?:-F|--field|--raw-field)[=\s]+["']?body=@([^\s"']+)["']?/g,
];

/**
 * Best-effort extraction of the prose about to be posted. Missing or unreadable sources are
 * skipped — this feeds a deny check, so a miss must mean "allow", never "block".
 */
function extractProse(command, cwd) {
  const chunks = [];

  for (const pattern of INLINE_PROSE) {
    pattern.lastIndex = 0;
    for (const match of command.matchAll(pattern)) {
      // Alternations put the value in whichever branch fired; take the first that captured.
      chunks.push(match.slice(1).find((group) => group !== undefined) ?? '');
    }
  }

  for (const pattern of FILE_PROSE) {
    pattern.lastIndex = 0;
    for (const match of command.matchAll(pattern)) {
      const target = match[1];
      if (!target || target === '-') continue;
      const resolved = path.isAbsolute(target) ? target : path.join(cwd, target);
      try {
        if (existsSync(resolved)) chunks.push(readFileSync(resolved, 'utf8'));
      } catch {
        // Unreadable body file: nothing to check, so nothing to block on.
      }
    }
  }

  return chunks.join('\n');
}

// Hard rules only: every entry here is a literal string match with no legitimate use in PR
// prose. Judgement-call patterns (puffing, hedging, diff narration) live in the skill, not
// here — a regex for those would deny honest text.
const BANNED = [
  { pattern: /—/, label: 'an em dash', fix: 'Use a colon, a full stop or a comma.' },
  { pattern: /–/, label: 'an en dash', fix: 'Use a hyphen or rewrite the range.' },
  {
    pattern: /\b(?:you(?:'re| are) absolutely right|great catch|great question|excellent point)\b/i,
    label: 'sycophancy',
    fix: 'A reviewer who was right does not need to be told. Open with the verdict.',
  },
  {
    pattern: /\b(?:happy to discuss|hope this helps|let me know if you(?:'d| would) like me to)\b/i,
    label: 'chatbot artifact',
    fix: 'Cut it. The thread is the place to discuss.',
  },
];

const COMMON = [
  '',
  'Always: zero em dashes, zero "great catch", zero "happy to discuss". Those are blocked, not',
  'advised. Never narrate the diff, and never restate the CI output or the reviewer\'s own words.',
].join('\n');

/**
 * One nudge per artifact kind, not one per session. A session that opens a PR and then answers
 * eight review threads needs the reply contract at reply time; a single nudge spent on
 * `gh pr create` leaves every later thread ungoverned, which is exactly what happened on #58.
 * Ordered most specific first — a reply URL also contains `/comments`.
 */
const ARTIFACTS = [
  {
    kind: 'reply',
    test: (c) => /\/comments\/\d+\/replies|\bgh\s+pr\s+review\s+.*--comment/.test(c),
    guidance: [
      'Replying to a reviewer. Read `.agents/skills/pr-writing/ARTIFACTS.md` § Reply to a',
      'reviewer. Budget: **3 sentences**, and usually far less.',
      '',
      '- **Verdict first.** "Fixed in `<sha>`." / "Disagree: `file.ts:88` already covers this."',
      '- **If you did exactly what was asked, the SHA is the entire reply.** They wrote the',
      '  diagnosis and can read the diff. Do not explain the mechanism back to them.',
      '- Add a clause only for what the diff and the report do not show: a fix that differs from',
      '  what was asked, or a limit you knowingly shipped.',
      '- Declining? Name it and point at where the argument lives. Do not silently drop it.',
    ].join('\n'),
  },
  {
    kind: 'review',
    test: (c) => /\/pulls\/\d+\/reviews|\bgh\s+pr\s+(?:review|comment)\b/.test(c),
    guidance: [
      'Posting review comments. Read `.agents/skills/pr-writing/ARTIFACTS.md` § Review comment.',
      'Budget: **4 sentences** each.',
      '',
      '- Severity label, then the defect in the first clause, then the fix concretely.',
      '- **One comment, one claim**, anchored to a line. Three findings are three comments.',
      '- No praise, no "overall this looks good", no summary of what the diff already shows.',
      '- Zero findings is a valid review. Say so in one line; do not manufacture nits.',
    ].join('\n'),
  },
  {
    kind: 'description',
    test: () => true,
    guidance: [
      'Writing a PR description. Read `.agents/skills/pr-writing/ARTIFACTS.md` § PR description.',
      'Budget: **~80 words of prose** across What, Why and How, plus the template fields.',
      '',
      '- **What is now true**, not what the patch does file by file.',
      '- How carries the decisions you had to make, and only what the diff does not already say.',
      '- Give the number, not a sentence about the number: `176/176`, not "the suite passes".',
      '- Fill every template section. Leave the checklists unticked for the author.',
    ].join('\n'),
  },
];

function emit(payload) {
  process.stdout.write(
    `${JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', ...payload } })}\n`,
  );
}

function markerPath(sessionId, kind) {
  const safe = String(sessionId).replaceAll(/[^\w-]/g, '');
  return path.join(os.tmpdir(), 'starterkit-hooks', `pr-prose-${kind}-${safe || 'unknown'}`);
}

function main() {
  if (process.env.SK_HOOK_NUDGE === '0') return;

  const input = JSON.parse(readFileSync(0, 'utf8'));
  const command = input?.tool_input?.command;
  if (typeof command !== 'string' || !isProsePublish(command)) return;

  const cwd = input?.cwd ?? process.cwd();
  const prose = extractProse(command, cwd);
  const violation = BANNED.find((rule) => rule.pattern.test(prose));
  if (violation) {
    const offending = violation.pattern.exec(prose)?.[0] ?? '';
    emit({
      permissionDecision: 'deny',
      permissionDecisionReason:
        `Blocked. PR prose contains ${violation.label}: "${offending.trim()}". ` +
        `${violation.fix} Hard rule, see .agents/skills/pr-writing/SKILL.md § Strip these ` +
        'before posting. Rewrite the body and retry.',
    });
    return;
  }

  const artifact = ARTIFACTS.find((candidate) => candidate.test(command));
  const marker = markerPath(input?.session_id, artifact.kind);
  if (existsSync(marker)) return;
  mkdirSync(path.dirname(marker), { recursive: true });
  writeFileSync(marker, '');
  emit({ additionalContext: `${artifact.guidance}${COMMON}` });
}

try {
  main();
} catch {
  // Fail open — a style guard that cannot read its input must not block a PR comment.
}
