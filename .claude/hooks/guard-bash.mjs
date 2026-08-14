#!/usr/bin/env node
/**
 * PreToolUse hook (Bash) — refuse shell commands that break a repo invariant the rest of
 * the toolchain assumes.
 *
 * `check:standards` already fails the build when a pnpm/yarn lockfile appears and the git
 * hooks already gate every commit — but both find out *after* the damage. These patterns
 * catch the command itself, so the agent is redirected before it creates the mess.
 *
 * Deliberately narrow: only invariants that are already written down and already enforced
 * somewhere slower. This is not a general-purpose command firewall.
 *
 * Fail-open on anything unexpected. Set VYBE_HOOK_GUARD=0 to disable.
 */
import { readFileSync } from 'node:fs';

// Each pattern anchors to the start of a command segment — string start, or just after a
// shell separator (; & | newline or an opening paren). Without the anchor a match inside a
// quoted argument (`echo "don't use yarn"`, a grep for --no-verify) would block a harmless
// command. `&&`, `||` and `$(` are covered by their component characters.
const SEGMENT = String.raw`(?:^|[;&|(\n])\s*`;

const RULES = [
  {
    pattern: new RegExp(`${SEGMENT}(?:pnpm|yarn|bun)\\b`),
    reason:
      'npm is the only supported package manager in this monorepo — a second lockfile fails ' +
      '`check:standards` and breaks the workspace resolution the apps rely on. Use the npm ' +
      'equivalent (`npm install`, `npm run <script>`, `npm run <script> -w apps/<app>`). ' +
      'See docs/standards/monorepo.md.',
  },
  {
    pattern: new RegExp(`${SEGMENT}(?:[\\w.\\-/]*\\s+)?git\\s+(?:commit|push)\\b[^;&|\\n]*--no-verify`),
    reason:
      'The husky hooks are the fast half of the quality gates and CI is the backstop — ' +
      'bypassing them just moves the failure to the PR. Fix what the hook reports. If a hook is ' +
      'genuinely wrong, say so and let the user decide to bypass it. ' +
      'See docs/standards/enforcement.md § Local gates.',
  },
  {
    pattern: new RegExp(`${SEGMENT}dotnet\\s+format\\b`),
    reason:
      'The backend formatter is csharpier, not `dotnet format` — they disagree and running both ' +
      'churns the diff. Use `dotnet csharpier .` (or `dotnet csharpier --check .`) from ' +
      'apps/backend. See .claude/rules/backend.md.',
  },
];

function deny(reason) {
  process.stdout.write(
    `${JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    })}\n`,
  );
}

function main() {
  if (process.env.VYBE_HOOK_GUARD === '0') return;

  const input = JSON.parse(readFileSync(0, 'utf8'));
  const command = input?.tool_input?.command;
  if (typeof command !== 'string') return;

  const rule = RULES.find((candidate) => candidate.pattern.test(command));
  if (rule) deny(`Blocked command. ${rule.reason}`);
}

try {
  main();
} catch {
  // Fail open — a guard that cannot read its input must not block ordinary commands.
}
