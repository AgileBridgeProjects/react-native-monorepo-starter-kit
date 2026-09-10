#!/usr/bin/env node
/**
 * PreToolUse hook (Bash) — governs prose the agent is about to publish to a GitHub PR.
 *
 * Three jobs, deliberately split by how checkable the rule is:
 *
 *   1. **Nudge.** The first time a session publishes PR prose, inject the `pr-writing` house
 *      style. Most of that skill (claim first, no diff narration, one comment one claim) is a
 *      judgement call, and the honest enforcement for a judgement call is to put the rule in
 *      front of the writer before they write. Fires once per artifact kind; the skill stays in
 *      context after that.
 *   2. **Deny on a string match.** A few of its rules are not judgement calls: zero em/en
 *      dashes, and a short list of chatbot tics that carry no information. Those are string
 *      matches, so they are blocked with the offending text quoted rather than left to a
 *      reminder.
 *   3. **Deny on length and on a missing severity label.** A word budget written in prose is
 *      unenforceable by construction: the model has no counter to hold itself to, and the
 *      nudge fires once, so posts 2..n of a review see nothing. Both questions the gate asks
 *      ("how many prose words is this" and "does this line-anchored body open with one of
 *      three known labels") are decidable with zero judgement, so they belong in code. The
 *      caps are 60 prose words for a comment or a reply and 120 for a description, matching
 *      `.agents/skills/pr-writing/SKILL.md` § budgets.
 *
 * Read-only gh usage (pr view/list/diff/checks, api GET) never fires.
 *
 * Fail-open on anything unexpected: an unreadable body means "allow", never "block". Set
 * SK_HOOK_NUDGE=0 to disable.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

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
// Bodies and titles are separated because the length gate counts bodies only. A PR title is
// prose a human reads (so the banned-string scan wants it) but it is not part of the ~80-word
// description budget, and counting it would deny a long-titled PR for the wrong reason.
const INLINE_BODY = [
  /(?:--body|-b(?=\s))[=\s]+(?:"((?:[^"\\]|\\.)*)"|'([^']*)')/g,
  new RegExp(`${FIELD}"body=(?!@)((?:[^"\\\\]|\\\\.)*)"`, 'g'),
  new RegExp(`${FIELD}'body=(?!@)([^']*)'`, 'g'),
  new RegExp(`${FIELD}body=(?!@)(?:"((?:[^"\\\\]|\\\\.)*)"|'([^']*)'|([^\\s"']+))`, 'g'),
];
const INLINE_TITLE = /(?:--title|-t(?=\s))[=\s]+(?:"((?:[^"\\]|\\.)*)"|'([^']*)')/g;
const INLINE_PROSE = [...INLINE_BODY, INLINE_TITLE];

// File-borne prose. The optional `["']?` after the flag is load-bearing: gh's field syntax is
// normally written `-F "body=@reply.txt"` with the quote BEFORE `body=`, not around the path,
// and a pattern anchored on a bare `-F\s+body=@` misses every quoted invocation. That gap let
// a whole batch of thread replies publish unchecked.
const FILE_PROSE = [
  /(?:--body-file|--input)[=\s]+["']?([^\s"']+)["']?/g,
  /(?:-F|--field|--raw-field)[=\s]+["']?body=@([^\s"']+)["']?/g,
];

/**
 * Best-effort extraction of the prose about to be posted. Missing or unreadable sources are
 * skipped — this feeds a deny check, so a miss must mean "allow", never "block".
 */
export function extractProse(command, cwd, inline = INLINE_PROSE) {
  const chunks = [];

  for (const pattern of inline) {
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

// ─── Length and severity-label gate ──────────────────────────────────────────────────────────
// One number per artifact, matching `.agents/skills/pr-writing/SKILL.md` § budgets. 60 is the
// comment cap for both a review comment and a reply; 120 is the description cap, deliberately
// above the ~80-word target so a paragraph that runs a little long still posts rather than
// training the agent to fight the hook.
export const MAX_COMMENT_WORDS = 60;
export const MAX_DESCRIPTION_WORDS = 120;

// Exactly the three in ARTIFACTS.md § Review comment. None carries a variation selector.
export const SEVERITY_LABELS = ['🔴', '🟡', '💡'];

export const hasSeverityLabel = (body) =>
  typeof body === 'string' && SEVERITY_LABELS.some((label) => body.trimStart().startsWith(label));

// Evidence is exempt from every budget, so it comes out before the count: fenced code (a stack
// trace, a diff hunk, a ```suggestion block, the E2E attestation), and HTML comments, which in
// a description are the template's own instructions to the author. An unterminated fence or
// comment is treated as running to the end rather than as prose.
const EVIDENCE = [/```[\s\S]*?```/g, /```[\s\S]*$/, /<!--[\s\S]*?-->/g, /<!--[\s\S]*$/];

// Description-only, and only the template's own furniture: headings, checkboxes, and the
// `- **Field**: value` evidence-bullet shape. A bulleted wall of argument still counts in full.
const TEMPLATE_LINE = /^\s*(?:#{1,6}\s|[-*]\s*\[[ xX]\]|[-*]\s+\*\*[^*\n]+\*\*\s*:)/;

export function countProseWords(text, { stripTemplate = false } = {}) {
  if (typeof text !== 'string') return 0;
  let prose = text;
  for (const pattern of EVIDENCE) prose = prose.replace(pattern, ' ');
  if (stripTemplate) {
    prose = prose
      .split('\n')
      .filter((line) => !TEMPLATE_LINE.test(line))
      .join(' ');
  }
  return prose.split(/\s+/).filter(Boolean).length;
}

// The batched review payload: `gh api .../pulls/<n>/reviews --method POST --input review.json`.
// This is the path `/review-pr` posts every finding through, so a gate that only read `--body`
// would judge nothing the review command actually writes.
const REVIEWS_ENDPOINT = /\/pulls\/\d+\/reviews\b/;
const INPUT_FILE = /--input[=\s]+["']?([^\s"']+)["']?/;

export function reviewPayload(command, cwd) {
  if (!GH_API.test(command) || !REVIEWS_ENDPOINT.test(command)) return null;
  const target = INPUT_FILE.exec(command)?.[1];
  if (!target || target === '-') return null;
  const resolved = path.isAbsolute(target) ? target : path.join(cwd, target);
  try {
    return JSON.parse(readFileSync(resolved, 'utf8'));
  } catch {
    return null; // Unreadable or not JSON: nothing to count, so nothing to block on.
  }
}

const tooLong = (what, words, cap) =>
  `${what} is ${words} prose words, over the ${cap}-word cap (fenced code and HTML comments ` +
  'excluded).';

function gateReviewPayload(payload) {
  const faults = [];

  if (typeof payload?.body === 'string') {
    const words = countProseWords(payload.body);
    if (words > MAX_COMMENT_WORDS) {
      faults.push(
        `${tooLong('The review summary', words, MAX_COMMENT_WORDS)} It is one line: counts by ` +
          'severity and any coverage gap. The findings are the review.',
      );
    }
  }

  for (const comment of Array.isArray(payload?.comments) ? payload.comments : []) {
    if (typeof comment?.body !== 'string') continue;
    const at = `${comment.path ?? '?'}:${comment.line ?? comment.start_line ?? '?'}`;
    if (!hasSeverityLabel(comment.body)) {
      faults.push(
        `The comment on ${at} does not open with a severity label. Use one of 🔴 blocker, ` +
          '🟡 nit, 💡 suggestion as its first character (ARTIFACTS.md § Review comment).',
      );
    }
    const words = countProseWords(comment.body);
    if (words > MAX_COMMENT_WORDS) {
      faults.push(
        `${tooLong(`The comment on ${at}`, words, MAX_COMMENT_WORDS)} Cut it, or split it: ` +
          'one comment carries one claim.',
      );
    }
  }

  return faults;
}

/**
 * Faults for one publish, or an empty list. A batched review reports every fault at once
 * rather than costing a round trip per comment.
 */
export function gateLength(command, cwd, kind) {
  const payload = reviewPayload(command, cwd);
  if (payload) return gateReviewPayload(payload);
  // A reviews call whose payload would not parse is left alone rather than counted as prose:
  // the raw JSON is not a comment, and denying it would report a word count nobody wrote.
  if (GH_API.test(command) && REVIEWS_ENDPOINT.test(command)) return [];

  const body = extractProse(command, cwd, INLINE_BODY);
  if (!body.trim()) return []; // `gh pr create --fill` and friends carry no body here.

  const isDescription = kind === 'description';
  const cap = isDescription ? MAX_DESCRIPTION_WORDS : MAX_COMMENT_WORDS;
  const words = countProseWords(body, { stripTemplate: isDescription });
  if (words <= cap) return [];

  return [
    isDescription
      ? `${tooLong('The PR description', words, cap)} The shape is the template's sections with ` +
        'about 80 words of prose across What, Why and How. Rationale, rejected alternatives and ' +
        'design detail belong in the linked spec or ADR.'
      : `${tooLong('The comment', words, cap)} Cut it, or split it: one comment carries one claim.`,
  ];
}

const COMMON = [
  '',
  'Always: zero em dashes, zero "great catch", zero "happy to discuss". Those are blocked, not',
  'advised. Never narrate the diff, and never restate the CI output or the reviewer\'s own words.',
  `Caps are gates: ${MAX_COMMENT_WORDS} prose words for a comment or a reply,`,
  `${MAX_DESCRIPTION_WORDS} for a description, and a line-anchored comment must open with 🔴, 🟡`,
  'or 💡. Fenced code and HTML comments do not count.',
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
      'reviewer. Budget: **60 prose words**, denied over, and usually far less.',
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
      'Budget: **60 prose words** each, denied over.',
      '',
      '- Severity label as the first character, then the defect in the first clause, then the',
      '  fix concretely. A line-anchored comment without a label is denied.',
      '- **One comment, one claim**, anchored to a line. Three findings are three comments.',
      '- No praise, no "overall this looks good", no summary of what the diff already shows.',
      '- **Plain prose.** Active voice, short words, no figure of speech. `pr-writing` § rule 3',
      '  carries Orwell\'s six and what each means in a comment. All six fit inside the cap, so',
      '  nothing but you catches them.',
      '- Zero findings is a valid review. Say so in one line; do not manufacture nits.',
    ].join('\n'),
  },
  {
    kind: 'description',
    test: () => true,
    guidance: [
      'Writing a PR description. Read `.agents/skills/pr-writing/ARTIFACTS.md` § PR description.',
      'Budget: **~80 words of prose** across What, Why and How, denied over 120, plus the',
      'template fields.',
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

  // Length and label run on every publish, with no session dedupe: an over-long comment has to
  // be denied on post 12 as firmly as on post 1, and the once-per-kind marker below is exactly
  // why a nudge cannot do that job.
  const faults = gateLength(command, cwd, artifact.kind);
  if (faults.length > 0) {
    emit({
      permissionDecision: 'deny',
      permissionDecisionReason: `Blocked. ${faults.join(' ')} See .agents/skills/pr-writing/SKILL.md § The three artifacts and their budgets. Rewrite and retry.`,
    });
    return;
  }

  const marker = markerPath(input?.session_id, artifact.kind);
  if (existsSync(marker)) return;
  mkdirSync(path.dirname(marker), { recursive: true });
  writeFileSync(marker, '');
  emit({ additionalContext: `${artifact.guidance}${COMMON}` });
}

// Only when run as the hook. The test suite imports this file for its gate functions, and a
// top-level main() would read fd 0 on import.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch {
    // Fail open — a style guard that cannot read its input must not block a PR comment.
  }
}
