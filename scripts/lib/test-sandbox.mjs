/**
 * A throwaway git repository for tests that drive the gate tooling against real git.
 *
 * Any test that has to observe real git behaviour needs one: a temp dir, `git init`, a fixture
 * identity, a named branch, some files, one commit. Hand-rolled copies of that recipe drift in
 * what they commit, so this is the one place it lives. Test-only; never imported by anything
 * that ships.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * @param {{ prefix?: string, branch?: string, files?: Record<string, string> }} options
 *   branch — checked out before the first commit, so `git branch --show-current` reports it.
 *   files  — repo-relative path → content, all committed as the fixture commit.
 * @returns {{ dir: string, git: (args: string[]) => string, headSha: string, remove: () => void }}
 *   `git` runs in the sandbox and throws on a non-zero exit, with stderr in the message.
 */
export function makeSandboxRepo({ prefix = 'sk-sandbox-', branch, files = {} } = {}) {
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
  const git = (args) => {
    const result = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`git ${args.join(' ')}: ${result.stderr}`);
    return result.stdout.trim();
  };

  git(['init', '-q']);
  git(['config', 'user.email', 'test@example.com']);
  git(['config', 'user.name', 'Test']);
  git(['config', 'commit.gpgsign', 'false']);
  if (branch) git(['checkout', '-q', '-b', branch]);

  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    writeFileSync(path.join(dir, rel), body);
  }
  git(['add', '-A']);
  git(['commit', '-q', '-m', 'fixture']);

  return {
    dir,
    git,
    headSha: git(['rev-parse', 'HEAD']),
    remove: () => rmSync(dir, { recursive: true, force: true }),
  };
}
