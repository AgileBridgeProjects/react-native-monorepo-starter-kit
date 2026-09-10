import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  countProseWords,
  gateLength,
  hasSeverityLabel,
  MAX_COMMENT_WORDS,
  MAX_DESCRIPTION_WORDS,
  reviewPayload,
  SEVERITY_LABELS,
} from './pr-prose-guard.mjs';

const scratch = mkdtempSync(path.join(os.tmpdir(), 'pr-prose-guard-'));
const words = (n) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');

const writeScratch = (name, contents) => {
  writeFileSync(path.join(scratch, name), contents);
  return name;
};

const reviewCommand = (file) =>
  `gh api repos/AgileBridgeProjects/react-native-monorepo-starter-kit/pulls/42/reviews --method POST --input ${file}`;

test('countProseWords counts prose and nothing else', () => {
  assert.equal(countProseWords('one two three'), 3);
  assert.equal(countProseWords('one\n```\nfenced code here\n```\ntwo'), 2);
  assert.equal(countProseWords('one\n```\nunterminated fence'), 1);
  assert.equal(countProseWords('one <!-- a template hint --> two'), 2);
  assert.equal(countProseWords('one <!-- unterminated comment'), 1);
  assert.equal(countProseWords(undefined), 0);
});

test('countProseWords strips template furniture only for a description', () => {
  const body = ['## What', '', 'Slots are configured.', '', '- [ ] `npm run check` passes'].join(
    '\n',
  );
  assert.equal(countProseWords(body, { stripTemplate: true }), 3);
  assert.ok(countProseWords(body) > 3);
});

test('countProseWords keeps a bulleted wall of argument', () => {
  const body = '- the first reason it had to work this way\n- the second reason';
  assert.equal(countProseWords(body, { stripTemplate: true }), 14);
});

test('hasSeverityLabel accepts the three labels and rejects everything else', () => {
  for (const label of SEVERITY_LABELS) {
    assert.ok(hasSeverityLabel(`${label} the defect.`), label);
  }
  assert.ok(hasSeverityLabel('  🔴 leading whitespace is fine.'));
  assert.ok(!hasSeverityLabel('The defect, unlabelled.'));
  assert.ok(!hasSeverityLabel('Looks good 🔴'));
  assert.ok(!hasSeverityLabel(undefined));
});

test('a description under the cap passes and one over it is denied', () => {
  const ok = writeScratch('short-desc.md', `## What\n\n${words(MAX_DESCRIPTION_WORDS)}`);
  const over = writeScratch('long-desc.md', `## What\n\n${words(MAX_DESCRIPTION_WORDS + 1)}`);

  assert.deepEqual(gateLength(`gh pr create --body-file ${ok}`, scratch, 'description'), []);

  const faults = gateLength(`gh pr create --body-file ${over}`, scratch, 'description');
  assert.equal(faults.length, 1);
  assert.match(faults[0], /PR description is 121 prose words/);
});

test('the description cap ignores the template checklists and the E2E fence', () => {
  const body = [
    '## What',
    '',
    'Reminder slots are configured per tenant.',
    '',
    '## E2E',
    '',
    '```text',
    words(300),
    '```',
    '',
    '## Checklist',
    '',
    ...Array.from({ length: 40 }, (_, i) => `- [ ] a checklist item numbered ${i}`),
  ].join('\n');
  const file = writeScratch('template-desc.md', body);
  assert.deepEqual(gateLength(`gh pr create --body-file ${file}`, scratch, 'description'), []);
});

test('a title does not count against the description cap', () => {
  const command = `gh pr create --title "${words(40)}" --body "${words(MAX_DESCRIPTION_WORDS)}"`;
  assert.deepEqual(gateLength(command, scratch, 'description'), []);
});

test('a reply over the comment cap is denied, and needs no severity label', () => {
  const under = `gh api repos/o/r/pulls/comments/1/replies -f body="${words(MAX_COMMENT_WORDS)}"`;
  assert.deepEqual(gateLength(under, scratch, 'reply'), []);

  const over = `gh api repos/o/r/pulls/comments/1/replies -f body="${words(MAX_COMMENT_WORDS + 1)}"`;
  const faults = gateLength(over, scratch, 'reply');
  assert.equal(faults.length, 1);
  assert.match(faults[0], /comment is 61 prose words/);
});

test('a body the command does not carry fails open', () => {
  assert.deepEqual(gateLength('gh pr create --fill', scratch, 'description'), []);
  const missing = gateLength('gh pr create --body-file /no/such/file.md', scratch, 'description');
  assert.deepEqual(missing, []);
});

test('an unparseable review payload is left alone, not counted as prose', () => {
  const file = writeScratch('broken.json', `{ "body": "${words(300)}"`);
  assert.deepEqual(gateLength(reviewCommand(file), scratch, 'review'), []);
  assert.deepEqual(gateLength(reviewCommand('gone.json'), scratch, 'review'), []);
});

test('reviewPayload reads the batched review file and ignores everything else', () => {
  const file = writeScratch('payload.json', JSON.stringify({ event: 'COMMENT', body: 'ok' }));
  assert.deepEqual(reviewPayload(reviewCommand(file), scratch), { event: 'COMMENT', body: 'ok' });
  assert.equal(reviewPayload('gh pr view 42', scratch), null);
  assert.equal(reviewPayload(reviewCommand('missing.json'), scratch), null);
});

test('every comment in a batched review is judged, and every fault is reported at once', () => {
  const file = writeScratch(
    'review.json',
    JSON.stringify({
      event: 'COMMENT',
      body: '1 blocker, 2 nits.',
      comments: [
        { path: 'a.ts', line: 12, side: 'RIGHT', body: '🔴 A real defect. Guard it.' },
        { path: 'b.ts', line: 26, side: 'RIGHT', body: 'Unlabelled but short.' },
        { path: 'c.ts', line: 40, side: 'RIGHT', body: `💡 ${words(MAX_COMMENT_WORDS)}` },
      ],
    }),
  );

  const faults = gateLength(reviewCommand(file), scratch, 'review');
  assert.equal(faults.length, 2);
  assert.match(faults[0], /b\.ts:26 does not open with a severity label/);
  assert.match(faults[1], /c\.ts:40 is 61 prose words/);
});

test('a fenced suggestion block does not count against a review comment', () => {
  const file = writeScratch(
    'suggestion.json',
    JSON.stringify({
      event: 'COMMENT',
      comments: [
        {
          path: 'a.ts',
          line: 12,
          body: ['🟡 Hoist the branch above the return.', '```suggestion', words(200), '```'].join(
            '\n',
          ),
        },
      ],
    }),
  );
  assert.deepEqual(gateLength(reviewCommand(file), scratch, 'review'), []);
});

test('an over-long review summary is denied', () => {
  const file = writeScratch(
    'summary.json',
    JSON.stringify({ event: 'COMMENT', body: words(MAX_COMMENT_WORDS + 1), comments: [] }),
  );
  const faults = gateLength(reviewCommand(file), scratch, 'review');
  assert.equal(faults.length, 1);
  assert.match(faults[0], /review summary is 61 prose words/);
});

// ─── The hook as the harness runs it ─────────────────────────────────────────────────────────
// These go through the CLI entry point rather than the exports, because the artifact classifier
// lives in main(): `gh pr comment` has to land on the 60-word comment cap and not on the
// description's 120, and only the whole hook can prove that.

const HOOK = fileURLToPath(new URL('./pr-prose-guard.mjs', import.meta.url));
let sessionCounter = 0;

function runHook(command) {
  sessionCounter += 1;
  const payload = JSON.stringify({
    session_id: `pr-prose-guard-test-${process.pid}-${sessionCounter}`,
    cwd: scratch,
    tool_name: 'Bash',
    tool_input: { command },
  });
  const result = spawnSync(process.execPath, [HOOK], { input: payload, encoding: 'utf8' });
  return result.stdout.trim() === '' ? null : JSON.parse(result.stdout).hookSpecificOutput;
}

test('a floating PR comment is held to the comment cap, not the description cap', () => {
  const over = runHook(`gh pr comment 42 --body "${words(MAX_COMMENT_WORDS + 1)}"`);
  assert.equal(over?.permissionDecision, 'deny');
  assert.match(over.permissionDecisionReason, /61 prose words, over the 60-word cap/);

  const under = runHook(`gh pr comment 42 --body "${words(MAX_COMMENT_WORDS)}"`);
  assert.equal(under?.permissionDecision, undefined);
});

test('a description between the two caps posts', () => {
  const body = words(MAX_COMMENT_WORDS + 1);
  assert.equal(runHook(`gh pr create --title "t" --body "${body}"`)?.permissionDecision, undefined);
});

test('the banned-string rules still deny, and read-only gh still says nothing', () => {
  const dashed = runHook('gh pr comment 42 --body "Fixed — see the guard."');
  assert.equal(dashed?.permissionDecision, 'deny');
  assert.match(dashed.permissionDecisionReason, /em dash/);
  assert.equal(runHook('gh pr view 42 --json number'), null);
});
