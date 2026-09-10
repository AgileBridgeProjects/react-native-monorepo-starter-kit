/**
 * Tests for the pre-push tag skip. Run: npm run test:scripts (root).
 *
 * `check-standards.mjs` can only assert that the hook's shell contains certain strings, which
 * would still pass if the logic inverted — drop one `!` and the gates skip on every branch push.
 * So the decision lives in a module and the behaviour is pinned here, including against a real
 * repo with a real remote.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  ZERO_SHA,
  decide,
  decideFromStdin,
  everyRefIsATag,
  refsFrom,
} from './pre-push-tag-skip.mjs';
import { makeSandboxRepo } from './gate/test-sandbox.mjs';

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'pre-push-tag-skip.mjs');
const SHA = 'a'.repeat(40);
const line = (localRef, remoteRef, localSha = SHA) =>
  `${localRef} ${localSha} ${remoteRef} ${ZERO_SHA}`;
const published = () => '';
const unpublished = () => `${'b'.repeat(40)}\n`;

describe('refsFrom, over the shared pre-push parser', () => {
  it('reads the ref lines git actually sends', () => {
    const stdin = [
      line('refs/tags/mobile-v1.0.0', 'refs/tags/mobile-v1.0.0'),
      line('refs/heads/feature/x', 'refs/heads/feature/x'),
    ].join('\n');
    assert.deepEqual(
      refsFrom(stdin).map(({ localSha, remoteRef }) => ({ localSha, remoteRef })),
      [
        { localSha: SHA, remoteRef: 'refs/tags/mobile-v1.0.0' },
        { localSha: SHA, remoteRef: 'refs/heads/feature/x' },
      ],
    );
  });

  it('ignores deletions and blank lines: they publish nothing', () => {
    assert.deepEqual(refsFrom(`\n${line('(delete)', 'refs/tags/old', ZERO_SHA)}\n\n`), []);
    assert.deepEqual(refsFrom(''), []);
    assert.deepEqual(refsFrom('garbage line'), []);
  });
});

describe('everyRefIsATag', () => {
  it('is true only for a non-empty, all-tag push', () => {
    assert.equal(everyRefIsATag(refsFrom(line('a', 'refs/tags/a'))), true);
    assert.equal(
      everyRefIsATag(refsFrom([line('a', 'refs/tags/a'), line('b', 'refs/tags/b')].join('\n'))),
      true,
    );
    assert.equal(everyRefIsATag(refsFrom(line('a', 'refs/heads/a'))), false);
    assert.equal(
      everyRefIsATag(
        refsFrom([line('a', 'refs/tags/a'), line('b', 'refs/heads/b')].join('\n')),
      ),
      false,
    );
    assert.equal(everyRefIsATag([]), false);
  });
});

describe('decide', () => {
  it('skips a tag-only push of already-published commits', () => {
    const verdict = decide(refsFrom(line('a', 'refs/tags/a')), published);
    assert.equal(verdict.skip, true);
  });

  it('runs the gates for a branch push, a mixed push and an empty stdin', () => {
    assert.equal(decide(refsFrom(line('a', 'refs/heads/a')), published).skip, false);
    assert.equal(
      decide(
        refsFrom([line('a', 'refs/tags/a'), line('b', 'refs/heads/b')].join('\n')),
        published,
      ).skip,
      false,
    );
    assert.equal(decide([], published).skip, false);
  });

  it('runs the gates when the tag carries commits no remote branch has', () => {
    // Without this, `git tag t <local-commit> && git push origin t` publishes ungated code:
    // no workflow in .github/workflows triggers on tags.
    const verdict = decide(refsFrom(line('a', 'refs/tags/a')), unpublished);
    assert.equal(verdict.skip, false);
    assert.match(verdict.reason, /commits no remote branch has/);
  });

  it('runs the gates when git cannot answer, never skips on an unknown', () => {
    const verdict = decide(refsFrom(line('a', 'refs/tags/a')), () => null);
    assert.equal(verdict.skip, false);
    assert.match(verdict.reason, /cannot tell/);
  });

  it('runs the gates when any one tag in a multi-tag push is unpublished', () => {
    const refs = refsFrom(
      [line('a', 'refs/tags/a', 'a'.repeat(40)), line('b', 'refs/tags/b', 'c'.repeat(40))].join('\n'),
    );
    const verdict = decide(refs, (sha) => (sha.startsWith('c') ? unpublished() : published()));
    assert.equal(verdict.skip, false);
  });
});

describe('the CLI against a real repo with a real remote', () => {
  let origin;
  let clone;
  const git = (args, cwd) => {
    const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`git ${args.join(' ')}: ${result.stderr}`);
    return result.stdout.trim();
  };
  /** @returns exit code: 0 means skip the gates, 1 means run them. */
  const run = (stdin) =>
    spawnSync(process.execPath, [SCRIPT], { cwd: clone.dir, input: stdin, encoding: 'utf8' }).status;

  before(() => {
    origin = makeSandboxRepo({ prefix: 'tag-skip-origin-', files: { 'a.txt': 'a\n' } });
    // A bare clone cannot be pushed to a checked-out branch, so the origin is a normal repo on
    // a parking branch and the clone tracks the branch under test.
    git(['checkout', '-q', '-b', 'parked'], origin.dir);
    clone = makeSandboxRepo({ prefix: 'tag-skip-clone-', files: { 'b.txt': 'b\n' } });
    git(['remote', 'add', 'origin', origin.dir], clone.dir);
    git(['push', '-q', 'origin', 'HEAD:refs/heads/main'], clone.dir);
    git(['fetch', '-q', 'origin'], clone.dir);
  });

  after(() => {
    origin.remove();
    clone.remove();
  });

  it('skips for a tag on a published commit', () => {
    const sha = git(['rev-parse', 'HEAD'], clone.dir);
    assert.equal(run(`refs/tags/v1 ${sha} refs/tags/v1 ${ZERO_SHA}\n`), 0);
  });

  it('runs the gates for a tag on a commit the remote has never seen', () => {
    const before = git(['rev-parse', 'HEAD'], clone.dir);
    git(['commit', '-q', '--allow-empty', '-m', 'local only'], clone.dir);
    const sha = git(['rev-parse', 'HEAD'], clone.dir);
    assert.notEqual(sha, before);
    assert.equal(run(`refs/tags/v2 ${sha} refs/tags/v2 ${ZERO_SHA}\n`), 1);
  });

  it('runs the gates for a branch push', () => {
    const sha = git(['rev-parse', 'HEAD'], clone.dir);
    assert.equal(run(`refs/heads/main ${sha} refs/heads/main ${ZERO_SHA}\n`), 1);
  });

  it('runs the gates when stdin is empty', () => {
    assert.equal(run(''), 1);
  });
});

describe('decideFromStdin: deletions are not "git told us nothing"', () => {
  it('skips a delete-only push, which transfers no objects', () => {
    // Regression: dropping the zero-sha ref left refs empty, which read as a manual
    // invocation, so `git push origin :refs/tags/x` ran typecheck, secrets, knip and the
    // receipt gate for a push that publishes nothing.
    const stdin = `(delete) ${ZERO_SHA} refs/tags/mobile-v1.0.0 ${SHA}
`;
    assert.deepEqual(refsFrom(stdin), []);
    const verdict = decideFromStdin(stdin, published);
    assert.equal(verdict.skip, true);
    assert.match(verdict.reason, /deletions only/);
  });

  it('still runs the gates when git said nothing at all', () => {
    assert.equal(decideFromStdin('', published).skip, false);
    assert.equal(decideFromStdin('garbage', published).skip, false);
  });

  it('defers to decide for every real push', () => {
    assert.equal(decideFromStdin(line('a', 'refs/tags/a'), published).skip, true);
    assert.equal(decideFromStdin(line('a', 'refs/heads/a'), published).skip, false);
    assert.equal(decideFromStdin(line('a', 'refs/tags/a'), unpublished).skip, false);
  });
});
