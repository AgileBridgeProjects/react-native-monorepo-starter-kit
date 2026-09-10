#!/usr/bin/env node
/**
 * PostToolUse hook (Write|Edit|MultiEdit) — format-and-lint the single file that was
 * just written, so the agent never accumulates a diff that pre-commit will reject.
 *
 * This is the same tool set `lint-staged` runs at commit time, narrowed to one file:
 * biome for JS/TS/JSON, csharpier for C#, markdownlint for Markdown, plus the
 * locale-casing gate when a locale JSON is touched. Anything it can fix, it fixes in
 * place; anything it cannot, it reports on stderr with exit 2 so the agent sees the
 * diagnostics in the same turn and corrects them immediately.
 *
 * Why it is synchronous rather than fire-and-forget: every formatter here *rewrites the
 * file*. A detached writer racing the agent's next Read/Edit produces "file modified
 * since read" failures and silently clobbered edits. The cost of correctness is one
 * per-file formatter run; each command is capped by TIMEOUT_MS and only ever sees the
 * one path, so the hook stays in the low seconds even on the backend.
 *
 * Fail-open on anything unexpected — a broken hook must never wedge the session.
 * Set SK_HOOK_LINT=0 to disable.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const TIMEOUT_MS = 60_000;

const BIOME_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json']);

// Shell strings rather than execFile argv: the tools are `.cmd` shims on Windows, which
// Node refuses to spawn without a shell. The only interpolated value is a path that the
// harness itself produced for a file inside this repo, and it is quoted the same way
// lint-staged.config.mjs quotes its own file lists.
function quote(value) {
  return `"${value.replaceAll('"', '\\"')}"`;
}

/**
 * Prefer the workspace-local binary over `npx`. npx re-resolves the package on every call,
 * which costs about a second — per edit, on a hook that fires constantly, that is the
 * difference between the hook being invisible and being felt.
 */
function tool(name, cwd) {
  const local = path.join(cwd, 'node_modules', '.bin', process.platform === 'win32' ? `${name}.cmd` : name);
  return existsSync(local) ? quote(local) : `npx ${name}`;
}

/** Runs a shell command, returning null on success or the captured output on failure. */
function run(command, cwd) {
  try {
    execSync(command, { cwd, stdio: ['ignore', 'pipe', 'pipe'], timeout: TIMEOUT_MS });
    return null;
  } catch (error) {
    const stdout = error?.stdout?.toString() ?? '';
    const stderr = error?.stderr?.toString() ?? '';
    return `${stdout}${stderr}`.trim() || `command failed: ${command}`;
  }
}

/** The commands this file needs, in the order they should run. */
function commandsFor(relativePath, absolutePath, cwd) {
  const extension = path.extname(relativePath).toLowerCase();
  const commands = [];

  if (extension === '.cs') {
    // csharpier is a local dotnet tool, resolved from apps/backend's manifest.
    const backendRelative = relativePath.replace(/^apps\/backend\//, '');
    commands.push({
      label: 'csharpier',
      command: `dotnet tool run csharpier format ${quote(backendRelative)}`,
      cwd: path.join(cwd, 'apps', 'backend'),
    });
  } else if (BIOME_EXTENSIONS.has(extension)) {
    commands.push({
      label: 'biome',
      command: `${tool('biome', cwd)} check --write --no-errors-on-unmatched ${quote(absolutePath)}`,
      cwd,
    });
  } else if (extension === '.md') {
    // No skip list here: markdownlint-cli2 applies the `ignores` globs from
    // .markdownlint-cli2.jsonc to explicit path arguments too, so a file in one of the
    // mirrored agent-tooling trees reports "Linting: 0 file(s)" on its own. A second copy of
    // that list would only be one more thing to keep in sync.
    commands.push({
      label: 'markdownlint',
      command: `${tool('markdownlint-cli2', cwd)} --fix ${quote(absolutePath)}`,
      cwd,
    });
  }

  // Locale JSON values must stay sentence-case. Whole-repo scan, but it is a fast node
  // script and running it here is what stops a casing slip reaching pre-commit.
  if (extension === '.json' && /(^|\/)locales\//.test(relativePath)) {
    commands.push({ label: 'locale-casing', command: 'node scripts/check-locale-casing.mjs', cwd });
  }

  return commands;
}

function main() {
  if (process.env.SK_HOOK_LINT === '0') return;

  const input = JSON.parse(readFileSync(0, 'utf8'));
  const filePath = input?.tool_input?.file_path;
  if (!filePath || !existsSync(filePath)) return;

  const cwd = input?.cwd ?? process.cwd();
  const relativePath = path.relative(cwd, filePath).split(path.sep).join('/');
  // Edits outside the repo (scratchpad, another worktree) are none of this hook's business.
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) return;

  const failures = [];
  for (const { label, command, cwd: commandCwd } of commandsFor(relativePath, filePath, cwd)) {
    if (!existsSync(commandCwd)) continue;
    const output = run(command, commandCwd);
    if (output) failures.push(`[${label}] ${relativePath}\n${output.slice(-2000)}`);
  }

  if (failures.length > 0) {
    process.stderr.write(`${failures.join('\n\n')}\n`);
    process.exit(2);
  }
}

try {
  main();
} catch {
  // Fail open: a hook that cannot parse its own input must not block the edit.
}
