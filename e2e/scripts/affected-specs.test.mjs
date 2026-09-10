/**
 * Tests for the coverage arithmetic behind delta attestation.
 *
 * The selection rules themselves are asserted only where they anchor a scenario — the
 * table is documentation and changes often. What is pinned here is the *maths*: what an
 * earlier run still proves once the branch has moved under it. Get this wrong in the
 * permissive direction and the gate waves through untested code; get it wrong in the
 * strict direction and the merge treadmill this exists to kill comes straight back.
 *
 * Run: npm run test --workspace @starterkit/e2e
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  changedScriptKeys,
  collapseSpecs,
  expandSpecs,
  HARNESS_SCRIPTS,
  isPackageJson,
  leafSpecs,
  outstandingSpecs,
  packageJsonReachesSuites,
  pruneScriptOnlyPackageJson,
  resolveAffected,
} from './affected-specs.mjs';

describe('expandSpecs / collapseSpecs', () => {
  it('expands a suite root to its leaves', () => {
    const expanded = expandSpecs(['tests/expo']);
    assert.ok(expanded.length > 1);
    assert.ok(expanded.every((s) => s.startsWith('tests/expo/')));
    assert.ok(expanded.includes('tests/expo/auth'));
  });

  it('leaves a leaf alone', () => {
    assert.deepEqual(expandSpecs(['tests/web/auth']), ['tests/web/auth']);
  });

  it('round-trips a whole suite', () => {
    assert.deepEqual(collapseSpecs(expandSpecs(['tests/web'])), ['tests/web']);
  });

  it('does not collapse a partial suite', () => {
    assert.deepEqual(collapseSpecs(['tests/expo/auth', 'tests/expo/disc']), [
      'tests/expo/auth',
      'tests/expo/disc',
    ]);
  });

  it('discovers leaves from disk, not just the rules table', () => {
    // A spec directory with no rule of its own is still part of its suite. If this ever
    // regresses, a `tests/web` selection silently stops running the unmapped directory.
    for (const leaf of leafSpecs()) assert.match(leaf, /^tests\/(web|expo)\/[^/]+$/);
  });
});

describe('outstandingSpecs', () => {
  it('proves everything when nothing has changed since the run', () => {
    assert.deepEqual(
      outstandingSpecs(['tests/web/users'], [{ covered: ['tests/web/users'], invalidated: [] }]),
      [],
    );
  });

  it('is unaffected by changes to an unrelated feature', () => {
    // The merge-treadmill case: `dev` lands something this PR does not touch.
    assert.deepEqual(
      outstandingSpecs(
        ['tests/web/users'],
        [{ covered: ['tests/web/users'], invalidated: ['tests/web/roles'] }],
      ),
      [],
    );
  });

  it('requires a re-run when the covered feature itself moved', () => {
    assert.deepEqual(
      outstandingSpecs(
        ['tests/web/users'],
        [{ covered: ['tests/web/users'], invalidated: ['tests/web/users'] }],
      ),
      ['tests/web/users'],
    );
  });

  it('narrows a suite-wide run to just the feature that moved', () => {
    // The saving that matters: a broad PR does not re-run the whole suite because one
    // feature changed underneath it.
    assert.deepEqual(
      outstandingSpecs(
        ['tests/web'],
        [{ covered: ['tests/web'], invalidated: ['tests/web/auth'] }],
      ),
      ['tests/web/auth'],
    );
  });

  it('unions a full run with a later top-up', () => {
    assert.deepEqual(
      outstandingSpecs(
        ['tests/web'],
        [
          { covered: ['tests/web'], invalidated: ['tests/web/auth'] },
          { covered: ['tests/web/auth'], invalidated: [] },
        ],
      ),
      [],
    );
  });

  it('unions two partial runs with different gaps', () => {
    assert.deepEqual(
      outstandingSpecs(
        ['tests/web'],
        [
          { covered: ['tests/web'], invalidated: ['tests/web/auth'] },
          { covered: ['tests/web'], invalidated: ['tests/web/roles'] },
        ],
      ),
      [],
    );
  });

  it('treats an absent attestation as covering nothing', () => {
    assert.deepEqual(outstandingSpecs(['tests/web/auth'], []), ['tests/web/auth']);
  });

  it('does not let one leaf satisfy a suite-root requirement', () => {
    // The permissive-direction failure this guards against.
    const outstanding = outstandingSpecs(
      ['tests/expo'],
      [{ covered: ['tests/expo/auth'], invalidated: [] }],
    );
    assert.ok(outstanding.length > 0);
    assert.ok(!outstanding.includes('tests/expo/auth'));
  });

  it('lets a suite-root run satisfy a leaf requirement', () => {
    assert.deepEqual(
      outstandingSpecs(['tests/expo/auth'], [{ covered: ['tests/expo'], invalidated: [] }]),
      [],
    );
  });
});

describe('end to end, through the rules table', () => {
  it('costs nothing when the incoming merge is docs-only', () => {
    const pr = resolveAffected(['apps/web/src/features/users/UserGrid.tsx']).specs;
    const incoming = resolveAffected(['docs/standards/e2e-testing.md', 'README.md']).specs;
    assert.deepEqual(incoming, []);
    assert.deepEqual(outstandingSpecs(pr, [{ covered: pr, invalidated: incoming }]), []);
  });

  it('costs nothing when the incoming merge only touches the other platform', () => {
    const pr = resolveAffected(['apps/web/src/features/users/UserGrid.tsx']).specs;
    const incoming = resolveAffected(['apps/expo/src/features/profile/Profile.tsx']).specs;
    assert.deepEqual(outstandingSpecs(pr, [{ covered: pr, invalidated: incoming }]), []);
  });

  it('does cost a re-run when the incoming merge touches shared backend code', () => {
    const pr = resolveAffected(['apps/web/src/features/users/UserGrid.tsx']).specs;
    const incoming = resolveAffected(['apps/backend/src/StarterKit.Data/AppDbContext.cs']).specs;
    assert.deepEqual(incoming, ['tests/web']);
    assert.deepEqual(outstandingSpecs(pr, [{ covered: pr, invalidated: incoming }]), [
      'tests/web/users',
    ]);
  });
});

describe('package.json is content-aware', () => {
  const pkg = (extra = {}) =>
    JSON.stringify({ name: 'x', scripts: { check: 'a' }, dependencies: { react: '19' }, ...extra });

  it('recognises every package.json in the tree', () => {
    assert.equal(isPackageJson('package.json'), true);
    assert.equal(isPackageJson('apps/expo/package.json'), true);
    assert.equal(isPackageJson(String.raw`apps\web\package.json`), true);
    assert.equal(isPackageJson('e2e/package-lock.json'), false);
    assert.equal(isPackageJson('apps/expo/version.json'), false);
  });

  it('a scripts-only edit cannot reach a suite', () => {
    assert.equal(
      packageJsonReachesSuites(pkg(), pkg({ scripts: { check: 'a', 'check:affected': 'b' } })),
      false,
    );
    assert.equal(packageJsonReachesSuites(pkg(), pkg({ packageManager: 'npm@11' })), false);
    assert.equal(
      packageJsonReachesSuites(pkg(), pkg({ version: '2.0.0', description: 'x' })),
      false,
    );
  });

  it('a change to any dependency-bearing section reaches a suite', () => {
    assert.equal(packageJsonReachesSuites(pkg(), pkg({ dependencies: { react: '20' } })), true);
    assert.equal(packageJsonReachesSuites(pkg(), pkg({ devDependencies: { vitest: '3' } })), true);
    assert.equal(packageJsonReachesSuites(pkg(), pkg({ overrides: { minimist: '1' } })), true);
    assert.equal(packageJsonReachesSuites(pkg(), pkg({ workspaces: ['apps/*', 'tools/*'] })), true);
  });

  it('a change to module resolution reaches a suite: the polarity that a deny-list got wrong', () => {
    // `packages/shared` really does declare these. Re-pointing its `exports` map changes what
    // every spec imports while touching no dependency section at all, and a list of *dangerous*
    // keys let all four through.
    assert.equal(
      packageJsonReachesSuites(
        pkg({ exports: { '.': './src/index.ts' } }),
        pkg({ exports: { '.': './dist/index.js' } }),
      ),
      true,
    );
    assert.equal(
      packageJsonReachesSuites(pkg({ type: 'commonjs' }), pkg({ type: 'module' })),
      true,
    );
    assert.equal(packageJsonReachesSuites(pkg(), pkg({ main: './dist/index.js' })), true);
    assert.equal(packageJsonReachesSuites(pkg(), pkg({ types: './dist/index.d.ts' })), true);
  });

  it('a key nobody has thought of yet reaches a suite, because the list is of inert keys', () => {
    assert.equal(packageJsonReachesSuites(pkg(), pkg({ imports: { '#x': './x.js' } })), true);
    assert.equal(packageJsonReachesSuites(pkg(), pkg({ someFutureField: 1 })), true);
  });

  it('unreadable or unparseable at either end counts as reaching, never as safe', () => {
    assert.equal(packageJsonReachesSuites(null, pkg()), true);
    assert.equal(packageJsonReachesSuites(pkg(), null), true);
    assert.equal(packageJsonReachesSuites('{', pkg()), true);
  });

  it('prunes only the script-only package.json paths and leaves everything else alone', () => {
    const texts = {
      'package.json': { base: pkg(), head: pkg({ scripts: { check: 'a', z: 'z' } }) },
      'apps/expo/package.json': { base: pkg(), head: pkg({ dependencies: { react: '20' } }) },
    };
    const files = ['package.json', 'apps/expo/package.json', 'apps/expo/app.config.js'];
    assert.deepEqual(
      pruneScriptOnlyPackageJson(files, (f) => texts[f]),
      ['apps/expo/package.json', 'apps/expo/app.config.js'],
    );
  });

  it('end to end: a root scripts edit no longer selects both suites', () => {
    const files = pruneScriptOnlyPackageJson(['package.json'], () => ({
      base: pkg(),
      head: pkg({ scripts: { check: 'a', 'check:affected': 'b' } }),
    }));
    assert.deepEqual(resolveAffected(files).specs, []);
    const depFiles = pruneScriptOnlyPackageJson(['package.json'], () => ({
      base: pkg(),
      head: pkg({ dependencies: { react: '20' } }),
    }));
    assert.deepEqual(resolveAffected(depFiles).specs, ['tests/expo', 'tests/web']);
  });
});

describe('deliberately uncovered paths', () => {
  it('a derived mobile version bump selects nothing and is recorded, not unmapped', () => {
    // AC 11. `uncovered` would mean "no rule matched", which reads as a coverage hole; this
    // has to land in `knownUncovered` with a reason instead.
    const result = resolveAffected(['apps/expo/version.json']);
    assert.deepEqual(result.specs, []);
    assert.deepEqual(result.uncovered, []);
    assert.equal(result.knownUncovered.length, 1);
    assert.equal(result.knownUncovered[0].file, 'apps/expo/version.json');
    assert.ok(result.knownUncovered[0].why);
  });
});

describe('scripts is inert only when the harness does not run what changed', () => {
  const pkg = (scripts) => JSON.stringify({ name: 'x', dependencies: { react: '19' }, scripts });

  it('a harness-invoked script reaches a suite', () => {
    // e2e/playwright.config.ts boots the whole web suite with `npm run dev:e2e -w apps/web`,
    // so redefining that script changes how every web spec starts.
    assert.ok(HARNESS_SCRIPTS.includes('dev:e2e'));
    assert.equal(
      packageJsonReachesSuites(
        pkg({ 'dev:e2e': 'next dev' }),
        pkg({ 'dev:e2e': 'next dev --turbopack' }),
      ),
      true,
    );
    assert.equal(
      packageJsonReachesSuites(pkg({ 'e2e:affected': 'a' }), pkg({ 'e2e:affected': 'b' })),
      true,
    );
    // Removing one counts too.
    assert.equal(packageJsonReachesSuites(pkg({ 'dev:e2e': 'next dev' }), pkg({})), true);
  });

  it('a script the harness never runs stays inert', () => {
    assert.equal(
      packageJsonReachesSuites(pkg({ check: 'a' }), pkg({ check: 'a', 'check:affected': 'b' })),
      false,
    );
    assert.equal(
      packageJsonReachesSuites(pkg({ lint: 'biome' }), pkg({ lint: 'biome check' })),
      false,
    );
  });

  it('changedScriptKeys reports additions, removals and edits', () => {
    assert.deepEqual(changedScriptKeys({ a: '1', b: '2' }, { a: '1', b: '3' }), ['b']);
    assert.deepEqual(changedScriptKeys({ a: '1' }, { a: '1', c: '9' }), ['c']);
    assert.deepEqual(changedScriptKeys({ a: '1' }, {}), ['a']);
    assert.deepEqual(changedScriptKeys(undefined, undefined), []);
  });
});
