#!/usr/bin/env node
/**
 * Should `.husky/pre-push` skip its gates for this push?
 *
 * Exits 0 to skip, 1 to run them. Reads git's pre-push stdin: `<local ref> <local sha>
 * <remote ref> <remote sha>` per line.
 *
 * A tag push skips because the commit it points at already passed the gates when its branch
 * was pushed. That is only true if the commit really is on a remote branch, and nothing else
 * enforces it: `git tag t <local-commit> && git push origin t` publishes that commit's objects,
 * and no workflow in .github/workflows has a `tags:` trigger, so a naive skip would let
 * ungated code reach the remote. So this checks it — `git rev-list <sha> --not --remotes` is
 * empty exactly when every ancestor is already published.
 *
 * Skips only when EVERY pushed ref is a tag. A mixed push runs the gates, as does an empty
 * stdin (a manual invocation, where the hook's own fallbacks apply).
 *
 * Extracted from the hook so it is testable: the assertion in check-standards.mjs can only
 * see that the shell contains certain strings, which would still pass if the logic inverted.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { isDirectRun } from './lib/is-direct-run.mjs';
import { parsePushRefs } from './lib/pre-push-refs.mjs';

export { ZERO_SHA, parsePushRefs } from './lib/pre-push-refs.mjs';

export function everyRefIsATag(refs) {
  return refs.length > 0 && refs.every(({ remoteRef }) => remoteRef.startsWith('refs/tags/'));
}

/** @param {string} stdin — git's pre-push lines. */
export function refsFrom(stdin) {
  return parsePushRefs(stdin).refs;
}

/**
 * Decide from git's raw stdin. Keeps `sawLines`, which `refsFrom` discards and which is the
 * difference between two states that look identical once deletions are dropped: "git told us
 * nothing" (a manual invocation — run the gates) and "git told us about deletions only"
 * (nothing is published — skip). Without it, `git push origin :refs/tags/x` ran the whole
 * suite for a push that transfers no objects.
 */
export function decideFromStdin(stdin, unpublishedAncestors) {
  const { refs, sawLines } = parsePushRefs(stdin);
  if (refs.length === 0 && sawLines) {
    return { skip: true, reason: 'deletions only — nothing is being published' };
  }
  return decide(refs, unpublishedAncestors);
}

/**
 * Decide, given the refs and a way to list a commit's unpublished ancestors.
 *
 * @param {{ localSha: string, remoteRef: string }[]} refs
 * @param {(sha: string) => string | null} unpublishedAncestors
 *   Output of `git rev-list <sha> --not --remotes`, or null when git could not answer.
 * @returns {{ skip: boolean, reason: string }}
 */
export function decide(refs, unpublishedAncestors) {
  if (!everyRefIsATag(refs)) {
    return { skip: false, reason: refs.length === 0 ? 'no ref lines' : 'not a tag-only push' };
  }
  for (const { localSha, remoteRef } of refs) {
    const unpublished = unpublishedAncestors(localSha);
    // git could not answer: run the gates. Skipping on an unknown is the one direction that
    // lets ungated code through.
    if (unpublished === null) {
      return { skip: false, reason: `cannot tell whether ${remoteRef} is published` };
    }
    if (unpublished.trim() !== '') {
      return { skip: false, reason: `${remoteRef} points at commits no remote branch has` };
    }
  }
  return { skip: true, reason: 'tag-only push of already-published commits' };
}

function main() {
  let stdin = '';
  try {
    stdin = readFileSync(0, 'utf8');
  } catch {
    stdin = '';
  }
  const cwd = process.cwd();
  const verdict = decideFromStdin(stdin, (sha) => {
    const result = spawnSync('git', ['rev-list', sha, '--not', '--remotes'], {
      cwd,
      encoding: 'utf8',
    });
    return result.status === 0 ? result.stdout : null;
  });
  if (process.env.SK_TAG_SKIP_DEBUG) console.error(`[tag-skip] ${verdict.reason}`);
  process.exit(verdict.skip ? 0 : 1);
}

if (isDirectRun(import.meta.url)) main();
