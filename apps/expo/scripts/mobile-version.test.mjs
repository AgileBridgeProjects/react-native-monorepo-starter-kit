// Tests for mobile-version.mjs. Run: npm run test:scripts (root).
//
// Two halves: pure-function tests over hand-fed inputs, and integration tests that build a
// throwaway git repo and point `collect()` / `touchesMobile()` / the CLI at it through
// `repoRoot`, so the pathspec filter, --no-merges, the tag anchor, the log parsing and the
// untracked-file handling are exercised against real git rather than assumed. Review
// found the pure functions well covered while every git-derived input was not.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  EAS_JSON,
  MOBILE_SCOPE,
  PACKAGE_JSON,
  RELEASED_STORE_VERSION,
  VERSION_FILE,
  allowedManualVersions,
  arg,
  bumpSemver,
  changedFilesFor,
  collect,
  compareSemver,
  currentHeadRef,
  easJsonNativeChanged,
  highestReleaseTag,
  isNativeSurfacePath,
  isPromotion,
  isPromotionBase,
  levelOfCommit,
  maxLevel,
  maxSemver,
  nativeSurfaceTouched,
  packageJsonNativeChanged,
  parseSemver,
  readVersionsFrom,
  requiredVersions,
  runtimeMarkerStale,
  touchesMobile,
} from './mobile-version.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'mobile-version.mjs');

describe('semver helpers', () => {
  it('parses and rejects', () => {
    assert.deepEqual(parseSemver('1.10.3'), [1, 10, 3]);
    assert.throws(() => parseSemver('1.0'), /Not a MAJOR\.MINOR\.PATCH/);
    assert.throws(() => parseSemver('v1.0.0'), /Not a MAJOR\.MINOR\.PATCH/);
    assert.throws(() => parseSemver('1.0.1-beta'), /Not a MAJOR\.MINOR\.PATCH/);
  });

  it('compares numerically, not lexically', () => {
    assert.equal(compareSemver('1.10.0', '1.9.0'), 1);
    assert.equal(compareSemver('1.0.1', '1.0.1'), 0);
    assert.equal(compareSemver('0.9.9', '1.0.0'), -1);
    assert.equal(maxSemver('1.0.1', '1.10.0', '1.9.9'), '1.10.0');
  });

  it('maxSemver refuses an empty list rather than throwing a TypeError', () => {
    assert.throws(() => maxSemver(), /needs at least one version/);
  });

  it('bumps and resets lower parts', () => {
    assert.equal(bumpSemver('1.0.1', 'major'), '2.0.0');
    assert.equal(bumpSemver('1.0.1', 'minor'), '1.1.0');
    assert.equal(bumpSemver('1.0.1', 'patch'), '1.0.2');
    assert.equal(bumpSemver('1.0.1', 'none'), '1.0.1');
    assert.throws(() => bumpSemver('1.0.1', 'huge'), /Unknown bump level/);
  });

  it('allowedManualVersions is the target plus exactly one level', () => {
    assert.deepEqual(allowedManualVersions('1.1.0'), ['1.1.0', '1.1.1', '1.2.0', '2.0.0']);
  });
});

describe('levelOfCommit', () => {
  it('maps Conventional Commit types', () => {
    assert.equal(levelOfCommit('feat(APP-1): add streaks'), 'minor');
    assert.equal(levelOfCommit('fix: null crash'), 'patch');
    assert.equal(levelOfCommit('perf(scoreboard): memoise rows'), 'patch');
    assert.equal(levelOfCommit('revert: "feat: add streaks"'), 'patch');
    assert.equal(levelOfCommit('chore(release): mobile 1.1.0, runtime 1.0.21'), 'none');
    assert.equal(levelOfCommit('docs: explain OTA'), 'none');
    assert.equal(levelOfCommit('refactor: split hook'), 'none');
    assert.equal(levelOfCommit('ci: pin eas-cli'), 'none');
    assert.equal(levelOfCommit('build(APP-186): derive mobile app versions'), 'none');
  });

  it('treats ! and BREAKING CHANGE as major regardless of type', () => {
    assert.equal(levelOfCommit('feat!: drop legacy login'), 'major');
    assert.equal(levelOfCommit('fix(auth)!: rotate token format'), 'major');
    assert.equal(levelOfCommit('feat: new nav', 'Some body\n\nBREAKING CHANGE: routes renamed'), 'major');
    assert.equal(levelOfCommit('feat: new nav', 'BREAKING-CHANGE: routes renamed'), 'major');
    assert.equal(levelOfCommit('feat: new nav', 'mentions breaking change casually'), 'minor');
  });

  it('tolerates a leading bracketed prefix', () => {
    assert.equal(levelOfCommit('[previously deferred] fix(APP-649): stop live generation'), 'patch');
    assert.equal(levelOfCommit('[js-only] feat: tweak copy'), 'minor');
    assert.equal(levelOfCommit('[a] [b] fix: two prefixes'), 'patch');
  });

  it('ignores non-conventional subjects', () => {
    assert.equal(levelOfCommit('Merge branch dev into feature'), 'none');
    assert.equal(levelOfCommit('WIP'), 'none');
    assert.equal(levelOfCommit('Feat: capitalised type'), 'none');
  });

  it('maxLevel picks the highest', () => {
    assert.equal(maxLevel([]), 'none');
    assert.equal(maxLevel(['none', 'patch', 'none']), 'patch');
    assert.equal(maxLevel(['patch', 'minor', 'patch']), 'minor');
    assert.equal(maxLevel(['minor', 'major']), 'major');
  });
});

describe('native surface detection', () => {
  it('matches every tracked native config variant and the patch-package tree', () => {
    for (const file of [
      'apps/expo/app.json',
      'apps/expo/app.config.js',
      'apps/expo/plugins/withAsyncStorageRepo.js',
      'apps/expo/modules/foo/ios/Foo.swift',
      'apps/expo/google-services.json',
      'apps/expo/google-services.uat.json',
      'apps/expo/GoogleService-Info.plist',
      'apps/expo/GoogleService-Info.dev.plist',
      'apps/expo/GoogleService-Info.uat.plist',
      'apps/expo/GoogleService-Info.devclient.plist',
      'patches/react-native-foo+1.2.3.patch',
    ]) {
      assert.equal(isNativeSurfacePath(file), true, file);
    }
  });

  it('has no agconnect pattern: gitignored and no Huawei profile, so it would be dead code', () => {
    assert.equal(isNativeSurfacePath('apps/expo/agconnect-services.json'), false);
  });

  it('does not match JS, docs, version.json or package.json by path', () => {
    for (const file of [
      'apps/expo/version.json',
      'apps/expo/package.json',
      'apps/expo/app/index.tsx',
      'apps/expo/scripts/mobile-version.mjs',
      'apps/expo/eas.json',
      'apps/web/app.json',
      'packages/shared/src/lib/app-config.ts',
      'apps/backend/patches/x.patch',
    ]) {
      assert.equal(isNativeSurfacePath(file), false, file);
    }
  });

  it('package.json is native only when a dependency section changes', () => {
    const base = {
      scripts: { a: '1' },
      dependencies: { expo: '~56.0.0' },
      devDependencies: { vitest: '1' },
    };
    assert.equal(packageJsonNativeChanged(base, { ...base, scripts: { a: '2', b: '3' } }), false);
    assert.equal(packageJsonNativeChanged(base, { ...base, dependencies: { expo: '~57.0.0' } }), true);
    assert.equal(
      packageJsonNativeChanged(base, {
        ...base,
        devDependencies: { vitest: '1', 'expo-build-properties': '1' },
      }),
      true,
    );
    assert.equal(packageJsonNativeChanged(base, { ...base, expo: { install: { exclude: ['x'] } } }), true);
    assert.equal(packageJsonNativeChanged(base, { ...base, overrides: { y: '1' } }), true);
  });

  it('treats an unreadable package.json as native at either end, including both', () => {
    const pkg = { dependencies: { a: '1' } };
    assert.equal(packageJsonNativeChanged(null, pkg), true);
    assert.equal(packageJsonNativeChanged(pkg, null), true);
    assert.equal(packageJsonNativeChanged(null, null), true);
  });

  it('nativeSurfaceTouched lists the offending files', () => {
    const pkg = { dependencies: { a: '1' } };
    const pair = { basePkg: pkg, headPkg: pkg };
    assert.deepEqual(
      nativeSurfaceTouched(['apps/expo/app/x.tsx', 'apps/expo/version.json'], pair),
      [],
    );
    assert.deepEqual(nativeSurfaceTouched(['apps/expo/app.json'], pair), ['apps/expo/app.json']);
    assert.deepEqual(
      nativeSurfaceTouched([PACKAGE_JSON], { basePkg: pkg, headPkg: { ...pkg, scripts: { z: '1' } } }),
      [],
    );
    assert.deepEqual(
      nativeSurfaceTouched([PACKAGE_JSON], { basePkg: pkg, headPkg: { dependencies: { a: '2' } } }),
      [`${PACKAGE_JSON} (dependency sections)`],
    );
  });

  it('eas.json is native only inside a build profile env / ios / android block', () => {
    const base = {
      cli: { version: '>= 18.3.0' },
      build: { uat: { channel: 'uat', env: { EXPO_PUBLIC_DEEP_LINK_HOST: 'old.example.com' } } },
      submit: { production: { android: { track: 'production' } } },
    };
    const changed = (headEas) =>
      nativeSurfaceTouched([EAS_JSON], { baseEas: base, headEas });

    // The sharp case: this value is baked into entitlements and the Android manifest.
    assert.deepEqual(
      changed({
        ...base,
        build: { uat: { channel: 'uat', env: { EXPO_PUBLIC_DEEP_LINK_HOST: 'new.example.com' } } },
      }),
      [`${EAS_JSON} (build profile env / ios / android)`],
    );
    assert.deepEqual(
      changed({ ...base, build: { uat: { ...base.build.uat, ios: { distribution: 'store' } } } }),
      [`${EAS_JSON} (build profile env / ios / android)`],
    );
    // A brand-new profile brings its own env, so it counts.
    assert.deepEqual(
      changed({ ...base, build: { ...base.build, dev: { env: { A: '1' } } } }),
      [`${EAS_JSON} (build profile env / ios / android)`],
    );

    // Routine edits that cannot reach a binary.
    assert.deepEqual(changed({ ...base, cli: { version: '>= 19.0.0' } }), []);
    assert.deepEqual(
      changed({ ...base, submit: { production: { android: { track: 'beta' } } } }),
      [],
    );
    assert.deepEqual(
      changed({ ...base, build: { uat: { ...base.build.uat, channel: 'uat-2' } } }),
      [],
    );
  });

  it('treats an unreadable eas.json as native at either end', () => {
    const eas = { build: { uat: { env: { A: '1' } } } };
    assert.equal(easJsonNativeChanged(null, eas), true);
    assert.equal(easJsonNativeChanged(eas, null), true);
    assert.equal(easJsonNativeChanged(null, null), true);
    assert.equal(easJsonNativeChanged(eas, eas), false);
  });

  it('ignores eas.json when it is not in the changed list', () => {
    assert.deepEqual(
      nativeSurfaceTouched(['apps/expo/app/x.tsx'], { baseEas: null, headEas: null }),
      [],
    );
  });
});

describe('MOBILE_SCOPE', () => {
  it('is wider than the commit pathspecs, so a patches-only branch is still a mobile branch', () => {
    // patches/ is native surface. If --if-mobile could not see it, a patches-only PR would
    // skip the check and merge with no runtime bump.
    assert.ok(MOBILE_SCOPE.includes('patches'));
    for (const prefix of ['apps/expo', 'packages/shared']) {
      assert.ok(MOBILE_SCOPE.includes(prefix), prefix);
    }
  });
});

describe('isPromotionBase / isPromotion', () => {
  it('recognises the promotion bases with or without the remote prefix', () => {
    assert.equal(isPromotionBase('uat'), true);
    assert.equal(isPromotionBase('origin/uat'), true);
    assert.equal(isPromotionBase('origin/main'), true);
    assert.equal(isPromotionBase('origin/dev'), false);
    assert.equal(isPromotionBase('feature/vybe-186'), false);
  });

  it('exempts only the pipeline promotions, judged on both refs', () => {
    assert.equal(isPromotion('origin/uat', 'dev'), true);
    assert.equal(isPromotion('origin/main', 'uat'), true);
    assert.equal(isPromotion('uat', 'origin/dev'), true);
  });

  it('refuses to exempt a hotfix branched off main, which shares the base but is new work', () => {
    // The bug this guards: keying only off the base waived the runtime bump for a hotfix
    // carrying a real native change, which is the crash the script exists to prevent.
    assert.equal(isPromotion('origin/main', 'hotfix/vybe-999'), false);
    assert.equal(isPromotion('origin/main', 'feature/vybe-186'), false);
    assert.equal(isPromotion('origin/uat', 'feature/vybe-186'), false);
  });

  it('treats an unknown head as new work, because the safe fallback is to demand the bump', () => {
    assert.equal(isPromotion('origin/main', null), false);
    assert.equal(isPromotion('origin/main', undefined), false);
    assert.equal(isPromotion('origin/main', ''), false);
  });

  it('never exempts a non-promotion base whatever the head is', () => {
    assert.equal(isPromotion('origin/dev', 'uat'), false);
    assert.equal(isPromotion('origin/dev', 'dev'), false);
  });
});

describe('highestReleaseTag', () => {
  it('picks the highest semver and ignores junk', () => {
    assert.deepEqual(highestReleaseTag(['mobile-v1.9.0', 'mobile-v1.10.0', 'v1.0.0', 'mobile-vnext', '']), {
      name: 'mobile-v1.10.0',
      version: '1.10.0',
    });
    assert.equal(highestReleaseTag(['v1.0.0', 'web-v2.0.0']), null);
    assert.equal(highestReleaseTag([]), null);
  });
});

describe('readVersionsFrom', () => {
  it('prefers version.json and carries the bump marker when present', () => {
    assert.deepEqual(
      readVersionsFrom('{"_doc":"x","production":"1.0.1","runtime":"1.0.20"}', 'ignored', 'ignored'),
      { production: '1.0.1', runtime: '1.0.20', runtimeBump: null },
    );
    assert.equal(
      readVersionsFrom('{"production":"1.0.1","runtime":"1.0.21","runtimeBump":"abc123def456"}')
        .runtimeBump,
      'abc123def456',
    );
    // A non-string marker is treated as absent rather than trusted.
    assert.equal(
      readVersionsFrom('{"production":"1.0.1","runtime":"1.0.21","runtimeBump":42}').runtimeBump,
      null,
    );
  });

  it('names the real problem for malformed or incomplete files', () => {
    assert.throws(() => readVersionsFrom('{"production":"1.0.1",}'), /is not valid JSON/);
    assert.throws(() => readVersionsFrom('{"_doc":"only"}'), /has no "production" key/);
    assert.throws(() => readVersionsFrom('{"production":"1.0.1"}'), /has no "runtime" key/);
    assert.throws(
      () => readVersionsFrom('{"production":"1.0.1-beta","runtime":"1.0.20"}'),
      /Not a MAJOR\.MINOR\.PATCH/,
    );
  });

  it('falls back to the pre-APP-186 layout: RUNTIME_VERSION in app.config.js, version in app.json', () => {
    const appConfig = "const RUNTIME_VERSION = '1.0.20';\nmodule.exports = () => ({});\n";
    const appJson = '{"expo":{"name":"StarterKit","version":"1.0.0"}}';
    assert.deepEqual(readVersionsFrom(null, appConfig, appJson), {
      production: '1.0.0',
      runtime: '1.0.20',
      runtimeBump: null,
    });
    assert.equal(readVersionsFrom(null, 'module.exports = {}', appJson), null);
    assert.equal(readVersionsFrom(null, appConfig, '{"expo":{}}'), null);
    assert.equal(readVersionsFrom(null, appConfig, 'not json'), null);
    assert.equal(readVersionsFrom(null, null, null), null);
  });
});

describe('runtimeMarkerStale', () => {
  const base = { production: '1.0.0', runtime: '1.0.20', runtimeBump: null };

  it('is stale only when the runtime rose and the marker did not move with it', () => {
    assert.equal(runtimeMarkerStale(base, { ...base, runtime: '1.0.21' }), true);
    assert.equal(runtimeMarkerStale(base, { ...base, runtime: '1.0.21', runtimeBump: 'aaa' }), false);
    const stamped = { ...base, runtime: '1.0.21', runtimeBump: 'aaa' };
    assert.equal(runtimeMarkerStale(stamped, { ...stamped, runtime: '1.0.22' }), true);
    assert.equal(runtimeMarkerStale(stamped, { ...stamped, runtime: '1.0.22', runtimeBump: 'bbb' }), false);
  });

  it('never complains when the runtime did not rise', () => {
    assert.equal(runtimeMarkerStale(base, { ...base }), false);
    assert.equal(runtimeMarkerStale(base, { ...base, production: '1.1.0' }), false);
    // Carrying the base's own marker forward untouched is fine.
    const stamped = { ...base, runtime: '1.0.21', runtimeBump: 'aaa' };
    assert.equal(runtimeMarkerStale(stamped, { ...stamped }), false);
  });
});

describe('arg', () => {
  it('reads a value', () => {
    assert.equal(arg('base', ['node', 's', 'check', '--base', 'origin/main']), 'origin/main');
    assert.equal(arg('base', ['node', 's', 'check']), undefined);
  });

  it('refuses to swallow the next flag as a value', () => {
    assert.throws(() => arg('base', ['node', 's', 'check', '--base', '--js-only']), /--base needs a value/);
    assert.throws(() => arg('base', ['node', 's', 'check', '--base']), /--base needs a value/);
  });
});

describe('requiredVersions', () => {
  const base = { production: '1.0.0', runtime: '1.0.20' };
  const quiet = {
    base,
    head: { ...base },
    releaseVersion: '1.0.0',
    commitLevel: 'none',
    nativeFiles: [],
  };

  it('changes nothing when nothing is owed', () => {
    const r = requiredVersions(quiet);
    assert.equal(r.production, '1.0.0');
    assert.equal(r.runtime, '1.0.20');
    assert.equal(r.overreach, null);
  });

  it('bumps production from the release by the commit level', () => {
    assert.equal(requiredVersions({ ...quiet, commitLevel: 'patch' }).production, '1.0.1');
    assert.equal(requiredVersions({ ...quiet, commitLevel: 'minor' }).production, '1.1.0');
    assert.equal(requiredVersions({ ...quiet, commitLevel: 'major' }).production, '2.0.0');
  });

  it('collapses repeated feats in one cycle into a single minor bump', () => {
    const raised = { production: '1.1.0', runtime: '1.0.20' };
    assert.equal(
      requiredVersions({ ...quiet, base: raised, head: raised, commitLevel: 'minor' }).production,
      '1.1.0',
    );
  });

  it('a later breaking commit lifts a pending minor to a major', () => {
    const raised = { production: '1.1.0', runtime: '1.0.20' };
    assert.equal(
      requiredVersions({ ...quiet, base: raised, head: raised, commitLevel: 'major' }).production,
      '2.0.0',
    );
  });

  it('keeps a hand-set version up to one level above the derived target', () => {
    const r = requiredVersions({
      ...quiet,
      head: { production: '2.0.0', runtime: '1.0.20' },
      commitLevel: 'minor',
    });
    assert.equal(r.production, '2.0.0');
    assert.equal(r.overreach, null);
    assert.ok(r.reasons.some((line) => line.includes('one level above')));
  });

  it('rejects a hand-set version more than one level above: the fat-finger guard', () => {
    const r = requiredVersions({
      ...quiet,
      head: { production: '55.0.1', runtime: '1.0.20' },
      commitLevel: 'minor',
    });
    assert.equal(r.overreach, '55.0.1');
    assert.equal(r.production, '1.1.0');
  });

  it('never goes below the base even when the release anchor is older', () => {
    const ahead = { production: '1.2.0', runtime: '1.0.20' };
    assert.equal(requiredVersions({ ...quiet, base: ahead, head: ahead }).production, '1.2.0');
  });

  it('leapfrogs a hotfix tag that the base branch has not seen yet', () => {
    assert.equal(requiredVersions({ ...quiet, releaseVersion: '1.0.2', commitLevel: 'patch' }).production, '1.0.3');
  });

  it('enforces no store floor until a version has actually been released', () => {
    // Nothing has shipped to a store, so 1.0.0 with nothing owed must pass as-is.
    assert.equal(RELEASED_STORE_VERSION, null);
    assert.equal(requiredVersions(quiet).production, '1.0.0');
  });

  it('lifts the target above the released store version rather than failing', () => {
    // A floor, not an error. Throwing here would wedge every chore-only mobile PR the moment
    // RELEASED_STORE_VERSION is filled in, and `apply` — the documented fix — would die too.
    const lifted = requiredVersions({ ...quiet, releasedStoreVersion: '1.0.0' });
    assert.equal(lifted.production, '1.0.1');
    assert.ok(lifted.reasons.some((line) => line.includes('must clear the released 1.0.0')));

    assert.equal(
      requiredVersions({ ...quiet, commitLevel: 'patch', releasedStoreVersion: '1.0.0' }).production,
      '1.0.1',
    );
    // A commit level that already clears the floor is left alone.
    assert.equal(
      requiredVersions({ ...quiet, commitLevel: 'minor', releasedStoreVersion: '1.0.0' }).production,
      '1.1.0',
    );
  });

  it('bumps runtime by one patch when the native surface is touched', () => {
    const r = requiredVersions({ ...quiet, nativeFiles: ['apps/expo/app.json'] });
    assert.equal(r.runtime, '1.0.21');
  });

  it('forces a production bump alongside a runtime bump: a new binary needs a new store version', () => {
    // chore-only cycle plus a native change: no commit earns a bump, but a build must ship.
    const r = requiredVersions({ ...quiet, nativeFiles: ['apps/expo/app.json'] });
    assert.equal(r.runtime, '1.0.21');
    assert.equal(r.production, '1.0.1');
    assert.ok(r.reasons.some((line) => line.includes('a new build ships')));
  });

  it('does not double-bump production when the commits already earned one', () => {
    const r = requiredVersions({ ...quiet, commitLevel: 'minor', nativeFiles: ['apps/expo/app.json'] });
    assert.equal(r.production, '1.1.0');
  });

  it('keeps an already-bumped runtime and does not bump twice', () => {
    const head = { production: '1.0.0', runtime: '1.0.22' };
    assert.equal(requiredVersions({ ...quiet, head, nativeFiles: ['apps/expo/app.json'] }).runtime, '1.0.22');
  });

  it('still drags production when the runtime was hand-bumped with no native file in the diff', () => {
    // The lockfile-gap remedy: nothing native in the diff, runtime edited up one patch by hand.
    // A new binary still ships, so production must clear the release; the round 1 fix covered
    // the --js-only sibling branch and missed this one.
    const r = requiredVersions({ ...quiet, head: { production: '1.0.0', runtime: '1.0.21' } });
    assert.equal(r.runtime, '1.0.21');
    assert.equal(r.production, '1.0.1');
    assert.ok(r.reasons.some((line) => line.includes('a new build ships')));
  });

  it('still drags production when the runtime was hand-bumped under --js-only', () => {
    // The waiver skips a bump; it must not suppress the consequence of one already made. A
    // raised runtime means a new binary ships, which needs a version the store has not seen.
    const r = requiredVersions({
      ...quiet,
      head: { production: '1.0.0', runtime: '1.0.21' },
      nativeFiles: ['apps/expo/app.config.js'],
      jsOnly: true,
    });
    assert.equal(r.runtime, '1.0.21');
    assert.equal(r.production, '1.0.1');
    assert.ok(r.reasons.some((line) => line.includes('a new build ships')));
  });

  it('waives only the runtime half under --js-only', () => {
    const r = requiredVersions({
      ...quiet,
      commitLevel: 'patch',
      nativeFiles: ['apps/expo/app.config.js'],
      jsOnly: true,
    });
    assert.equal(r.runtime, '1.0.20');
    assert.equal(r.production, '1.0.1');
    assert.ok(r.reasons.some((line) => line.includes('waived as JS-only')));
  });

  it('skips the runtime half entirely for a promotion PR', () => {
    // dev → uat carries the cycle's native files, but dev already accounted for them.
    const r = requiredVersions({ ...quiet, nativeFiles: ['apps/expo/app.json'], promotion: true });
    assert.equal(r.runtime, '1.0.20');
    assert.equal(r.production, '1.0.0');
    assert.ok(r.reasons.some((line) => line.includes('promotion PR')));
  });
});

// ─── app.config.js actually consumes version.json (AC 1) ────────────────────
// Without this, deleting the `version` spread or the require() from app.config.js leaves every
// gate green while store builds silently ship app.json's frozen 1.0.0. The derivation being
// correct is worthless if nothing reads the file it writes.

describe('app.config.js consumes version.json', () => {
  const require_ = createRequire(import.meta.url);
  const EXPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
  const CONFIG_PATH = join(EXPO_ROOT, 'app.config.js');
  let savedProfile;

  const resolveConfig = (profile) => {
    delete require_.cache[require_.resolve(CONFIG_PATH)];
    if (profile === undefined) delete process.env.EAS_BUILD_PROFILE;
    else process.env.EAS_BUILD_PROFILE = profile;
    const appJson = JSON.parse(readFileSync(join(EXPO_ROOT, 'app.json'), 'utf8'));
    return require_(CONFIG_PATH)({ config: appJson.expo });
  };
  const versions = () => JSON.parse(readFileSync(join(EXPO_ROOT, 'version.json'), 'utf8'));

  before(() => {
    savedProfile = process.env.EAS_BUILD_PROFILE;
  });
  after(() => {
    if (savedProfile === undefined) delete process.env.EAS_BUILD_PROFILE;
    else process.env.EAS_BUILD_PROFILE = savedProfile;
  });

  it('gives the production profile the derived store version', () => {
    assert.equal(resolveConfig('production').version, versions().production);
  });

  it('leaves every other profile on app.json’s frozen version', () => {
    const appVersion = JSON.parse(readFileSync(join(EXPO_ROOT, 'app.json'), 'utf8')).expo.version;
    for (const profile of ['dev', 'uat', 'simulator', 'dev-client', undefined]) {
      assert.equal(resolveConfig(profile).version, appVersion, String(profile));
    }
  });

  it('shares version.json’s runtime across every profile, never conditionally', () => {
    // EAS resolves runtimeVersion twice, once where the build starts and once on the
    // builder, and aborts when the two disagree. A value keyed off EAS_BUILD_PROFILE
    // disagrees on any machine whose eas-cli does not inject the profile env locally.
    for (const profile of ['dev', 'uat', 'production', 'simulator', 'dev-client', undefined]) {
      assert.equal(resolveConfig(profile).runtimeVersion, versions().runtime, String(profile));
    }
  });

  it('switches expo-updates off for dev clients instead of labelling their runtime', () => {
    for (const profile of ['simulator', 'dev-client']) {
      assert.equal(resolveConfig(profile).updates?.enabled, false, profile);
    }
    for (const profile of ['dev', 'uat', 'production']) {
      assert.notEqual(resolveConfig(profile).updates?.enabled, false, profile);
    }
  });
});

// ─── Integration: the git-reading half against a real repo ───────────────────

describe('collect / touchesMobile / CLI against a throwaway git repo', () => {
  let repo;
  const run = (args, cwd = repo) =>
    execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const write = (rel, body) => {
    mkdirSync(join(repo, dirname(rel)), { recursive: true });
    writeFileSync(join(repo, rel), body);
  };
  const commit = (subject, body = '') => {
    run(['add', '-A']);
    run(['commit', '--no-gpg-sign', '-q', '-m', subject, ...(body ? ['-m', body] : [])]);
  };
  const versionJson = (production, runtime) =>
    `${JSON.stringify({ _doc: 'test', production, runtime }, null, 2)}\n`;
  const onBranch = (name, fn) => {
    run(['checkout', '-q', '-b', name]);
    try {
      fn();
    } finally {
      run(['checkout', '-q', '-f', 'dev']);
      run(['clean', '-qfd']);
      run(['branch', '-qD', name]);
    }
  };
  /** Run the CLI against the temp repo; returns { code, output }. */
  const cli = (args) => {
    try {
      const output = execFileSync(process.execPath, [SCRIPT, ...args], {
        cwd: repo,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, MOBILE_VERSION_REPO_ROOT: repo, MOBILE_VERSION_SKIP: '', JS_ONLY: '' },
      });
      return { code: 0, output };
    } catch (err) {
      return { code: err.status, output: `${err.stdout ?? ''}${err.stderr ?? ''}` };
    }
  };

  before(() => {
    repo = mkdtempSync(join(tmpdir(), 'mobile-version-'));
    run(['init', '-q', '-b', 'dev']);
    run(['config', 'user.email', 'test@example.com']);
    run(['config', 'user.name', 'Test']);
    run(['config', 'core.autocrlf', 'false']);
    write('apps/expo/version.json', versionJson('1.0.0', '1.0.20'));
    write('apps/expo/package.json', `${JSON.stringify({ dependencies: { expo: '56' } }, null, 2)}\n`);
    write(
      'apps/expo/eas.json',
      `${JSON.stringify(
        {
          cli: { version: '>= 18.3.0' },
          build: { uat: { channel: 'uat', env: { EXPO_PUBLIC_DEEP_LINK_HOST: 'old.example.com' } } },
          submit: { production: { android: { track: 'production' } } },
        },
        null,
        2,
      )}\n`,
    );
    write('apps/backend/Program.cs', 'class P {}\n');
    commit('chore: baseline');
    run(['tag', '-a', 'mobile-v1.0.0', '-m', 'baseline']);
  });

  after(() => rmSync(repo, { recursive: true, force: true }));

  it('reads nothing owed on a quiet branch and anchors on the tag', () => {
    onBranch('f/quiet', () => {
      write('docs/readme.md', 'hi\n');
      commit('docs: unrelated');
      const input = collect({ baseRef: 'dev', jsOnly: false, headFromWorkingTree: false, repoRoot: repo });
      assert.equal(input.anchor.ref, 'mobile-v1.0.0');
      assert.equal(input.releaseVersion, '1.0.0');
      assert.deepEqual(input.base, { production: '1.0.0', runtime: '1.0.20', runtimeBump: null });
      assert.deepEqual(input.head, { production: '1.0.0', runtime: '1.0.20', runtimeBump: null });
      assert.equal(input.commits.length, 0, 'a docs/ commit is not a mobile commit');
      assert.equal(input.commitLevel, 'none');
      assert.deepEqual(input.nativeFiles, []);
      assert.equal(input.promotion, false);
      const target = requiredVersions(input);
      assert.equal(target.production, '1.0.0');
      assert.equal(target.runtime, '1.0.20');
    });
  });

  it('counts only mobile commits, skips merges, and reads bodies for BREAKING CHANGE', () => {
    onBranch('f/mixed', () => {
      write('apps/backend/Program.cs', 'class P { int x; }\n');
      commit('feat(api): backend only, must not bump the app');
      write('apps/expo/app/screen.tsx', 'export const S = 1;\n');
      commit('fix(APP-1): mobile patch');
      write('packages/shared/src/x.ts', 'export const x = 1;\n');
      commit('[previously deferred] feat(APP-2): shared minor');
      // A merge commit carrying a `feat!` subject must be ignored by --no-merges.
      run(['checkout', '-q', '-b', 'f/side']);
      write('apps/expo/app/side.tsx', 'export const T = 1;\n');
      commit('chore: side work');
      run(['checkout', '-q', 'f/mixed']);
      run(['merge', '--no-ff', '--no-edit', '-q', '-m', 'feat!: merge subject must not count', 'f/side']);
      run(['branch', '-qD', 'f/side']);

      const input = collect({ baseRef: 'dev', jsOnly: false, headFromWorkingTree: false, repoRoot: repo });
      const subjects = input.commits.map((c) => c.subject);
      assert.equal(subjects.length, 3, `expected 3 mobile commits, got ${JSON.stringify(subjects)}`);
      assert.ok(!subjects.some((s) => s.includes('backend only')));
      assert.ok(!subjects.some((s) => s.startsWith('feat!')));
      assert.equal(input.commitLevel, 'minor');
      assert.equal(requiredVersions(input).production, '1.1.0');
    });
  });

  it('a BREAKING CHANGE footer on a mobile commit derives a major', () => {
    onBranch('f/breaking', () => {
      write('apps/expo/app/nav.tsx', 'export const N = 1;\n');
      commit('feat(APP-3): new nav', 'BREAKING CHANGE: routes renamed');
      const input = collect({ baseRef: 'dev', jsOnly: false, headFromWorkingTree: false, repoRoot: repo });
      assert.equal(input.commitLevel, 'major');
      assert.equal(requiredVersions(input).production, '2.0.0');
    });
  });

  it('anchors on the highest tag, not the merge-base, so a second PR in a cycle does not re-bump', () => {
    onBranch('f/second', () => {
      // Simulate a cycle where dev already carries the pending 1.1.0 from an earlier feat PR.
      write('apps/expo/app/first.tsx', 'export const F = 1;\n');
      write('apps/expo/version.json', versionJson('1.1.0', '1.0.20'));
      commit('feat(APP-4): first feature of the cycle');
      run(['branch', '-f', 'dev-ahead', 'HEAD']);
      write('apps/expo/app/second.tsx', 'export const G = 1;\n');
      commit('feat(APP-5): second feature of the cycle');
      const input = collect({ baseRef: 'dev-ahead', jsOnly: false, headFromWorkingTree: false, repoRoot: repo });
      assert.equal(input.anchor.ref, 'mobile-v1.0.0');
      assert.equal(input.commits.length, 2);
      assert.equal(requiredVersions(input).production, '1.1.0', 'two feats in one cycle = one minor');
      run(['branch', '-qD', 'dev-ahead']);
    });
  });

  it('lists untracked files in apply mode, which plain git diff never does', () => {
    onBranch('f/untracked', () => {
      write('apps/expo/plugins/withNew.js', 'module.exports = (c) => c;\n');
      const mergeBase = run(['merge-base', 'dev', 'HEAD']);
      const runGit = (args) => run(args);

      const fromWorkingTree = changedFilesFor({ mergeBase, headFromWorkingTree: true, runGit });
      assert.ok(
        fromWorkingTree.includes('apps/expo/plugins/withNew.js'),
        `untracked plugin missing from ${JSON.stringify(fromWorkingTree)}`,
      );
      // The committed view (what `check` uses) legitimately does not see it yet.
      assert.equal(changedFilesFor({ mergeBase, headFromWorkingTree: false, runGit }).length, 0);

      // End to end: `apply` (working tree) owes a runtime bump for the new plugin.
      const applyInput = collect({ baseRef: 'dev', jsOnly: false, headFromWorkingTree: true, repoRoot: repo });
      assert.deepEqual(applyInput.nativeFiles, ['apps/expo/plugins/withNew.js']);
      const target = requiredVersions(applyInput);
      assert.equal(target.runtime, '1.0.21');
      assert.equal(target.production, '1.0.1', 'runtime bump drags production');

      commit('chore(APP-6): add a native plugin');
      const checkInput = collect({ baseRef: 'dev', jsOnly: false, headFromWorkingTree: false, repoRoot: repo });
      assert.deepEqual(checkInput.nativeFiles, ['apps/expo/plugins/withNew.js']);
    });
  });

  it('flags a dependency-section change in package.json but not a scripts edit', () => {
    onBranch('f/pkg', () => {
      write('apps/expo/package.json', `${JSON.stringify({ dependencies: { expo: '56' }, scripts: { a: '1' } }, null, 2)}\n`);
      commit('chore: scripts only');
      let input = collect({ baseRef: 'dev', jsOnly: false, headFromWorkingTree: false, repoRoot: repo });
      assert.deepEqual(input.nativeFiles, []);

      write('apps/expo/package.json', `${JSON.stringify({ dependencies: { expo: '57' }, scripts: { a: '1' } }, null, 2)}\n`);
      commit('chore: bump expo');
      input = collect({ baseRef: 'dev', jsOnly: false, headFromWorkingTree: false, repoRoot: repo });
      assert.deepEqual(input.nativeFiles, [`${PACKAGE_JSON} (dependency sections)`]);
    });
  });

  it('reads eas.json from git and separates a native env edit from a submit edit', () => {
    const easPath = join(repo, 'apps/expo/eas.json');
    const readEas = () => JSON.parse(readFileSync(easPath, 'utf8'));

    onBranch('f/eas-submit', () => {
      const eas = readEas();
      eas.submit.production.android.track = 'beta';
      write('apps/expo/eas.json', `${JSON.stringify(eas, null, 2)}\n`);
      commit('chore: retarget the Play track');
      const input = collect({ baseRef: 'dev', jsOnly: false, headFromWorkingTree: false, repoRoot: repo });
      assert.deepEqual(input.nativeFiles, [], 'a submit-only edit cannot reach a binary');
    });

    onBranch('f/eas-env', () => {
      const eas = readEas();
      eas.build.uat.env.EXPO_PUBLIC_DEEP_LINK_HOST = 'new.example.com';
      write('apps/expo/eas.json', `${JSON.stringify(eas, null, 2)}\n`);
      commit('fix(APP-11): move the deep-link host');
      const input = collect({ baseRef: 'dev', jsOnly: false, headFromWorkingTree: false, repoRoot: repo });
      assert.deepEqual(input.nativeFiles, [`${EAS_JSON} (build profile env / ios / android)`]);
      // This value is baked into iOS entitlements and the Android manifest, so the binary
      // changes and installed builds must not receive JS built against the new host.
      assert.equal(requiredVersions(input).runtime, '1.0.21');
    });
  });

  it('marks a real promotion and skips the runtime half for it', () => {
    onBranch('f/promo', () => {
      run(['branch', '-f', 'uat', 'HEAD']);
      write('apps/expo/app.json', '{"expo":{"newKey":true}}\n');
      commit('chore: native change riding a promotion');
      // dev → uat: the head is a pipeline branch, so the change was accounted for upstream.
      const input = collect({
        baseRef: 'uat',
        jsOnly: false,
        headFromWorkingTree: false,
        repoRoot: repo,
        headRef: 'dev',
      });
      assert.equal(input.promotion, true);
      assert.deepEqual(input.nativeFiles, ['apps/expo/app.json']);
      assert.equal(requiredVersions(input).runtime, '1.0.20');
      run(['branch', '-qD', 'uat']);
    });
  });

  it('does NOT exempt a hotfix off main, even though it shares a promotion base', () => {
    // The round-2 blocker: base main + native change was read as a promotion, so the runtime
    // bump was waived and a later OTA would have reached binaries without the new plugin.
    onBranch('hotfix/vybe-999', () => {
      run(['branch', '-f', 'main', 'dev']);
      write('apps/expo/plugins/withHotfix.js', 'module.exports = (c) => c;\n');
      commit('fix(APP-999): urgent native fix straight to main');
      const input = collect({
        baseRef: 'main',
        jsOnly: false,
        headFromWorkingTree: false,
        repoRoot: repo,
        headRef: 'hotfix/vybe-999',
      });
      assert.equal(input.promotion, false, 'a hotfix is new work, not a promotion');
      assert.deepEqual(input.nativeFiles, ['apps/expo/plugins/withHotfix.js']);
      const target = requiredVersions(input);
      assert.equal(target.runtime, '1.0.21', 'the hotfix owes a runtime bump');
      assert.equal(target.production, '1.0.1');
      run(['branch', '-qD', 'main']);
    });
  });

  it('currentHeadRef reads the branch, and reports detached rather than guessing', () => {
    onBranch('f/headref', () => {
      assert.equal(currentHeadRef(repo), 'f/headref');
      const sha = run(['rev-parse', 'HEAD']);
      run(['checkout', '-q', '--detach', sha]);
      assert.equal(currentHeadRef(repo), null);
      run(['checkout', '-q', 'f/headref']);
    });
  });

  it('falls back to the base branch version when no tag exists, and says so', () => {
    onBranch('f/notag', () => {
      run(['tag', '-d', 'mobile-v1.0.0']);
      try {
        write('apps/expo/app/x.tsx', 'export const X = 1;\n');
        commit('fix(APP-7): patch');
        const input = collect({ baseRef: 'dev', jsOnly: false, headFromWorkingTree: false, repoRoot: repo });
        assert.match(input.anchor.label, /no mobile-v\* tag found/);
        assert.equal(input.releaseVersion, '1.0.0');
        assert.equal(input.commits.length, 1);
      } finally {
        run(['tag', '-a', 'mobile-v1.0.0', 'dev', '-m', 'baseline']);
      }
    });
  });

  it('fails clearly when version.json is missing on the branch or the base cannot be resolved', () => {
    onBranch('f/missing', () => {
      run(['rm', '-q', 'apps/expo/version.json']);
      commit('chore: drop version.json');
      assert.throws(
        () => collect({ baseRef: 'dev', jsOnly: false, headFromWorkingTree: false, repoRoot: repo }),
        /version\.json is missing on this branch/,
      );
    });
    assert.throws(
      () => collect({ baseRef: 'no-such-ref', jsOnly: false, headFromWorkingTree: false, repoRoot: repo }),
      /Cannot resolve merge-base/,
    );
  });

  it('touchesMobile answers true / false / null', () => {
    onBranch('f/scope', () => {
      write('apps/backend/Program.cs', 'class P { int y; }\n');
      commit('feat(api): backend');
      assert.equal(touchesMobile('dev', repo), false);
      write('packages/shared/src/y.ts', 'export const y = 1;\n');
      assert.equal(touchesMobile('dev', repo), true, 'an uncommitted shared change counts');
      assert.equal(touchesMobile('no-such-ref', repo), null);
    });
  });

  it('the CLI exits 1 with the fix command when a bump is owed, and 0 once applied', () => {
    onBranch('f/cli', () => {
      write('apps/expo/app.json', '{"expo":{"newKey":true}}\n');
      commit('fix(APP-8): native change with no bump');

      const failed = cli(['check', '--base', 'dev']);
      assert.equal(failed.code, 1, failed.output);
      assert.match(failed.output, /runtime is 1\.0\.20, must be 1\.0\.21/);
      assert.match(failed.output, /production is 1\.0\.0, must be 1\.0\.1/);
      assert.match(failed.output, /npm run version:apply -w apps\/expo/);

      const applied = cli(['apply', '--base', 'dev']);
      assert.equal(applied.code, 0, applied.output);
      const written = JSON.parse(readFileSync(join(repo, VERSION_FILE), 'utf8'));
      assert.equal(written.production, '1.0.1');
      assert.equal(written.runtime, '1.0.21');
      assert.equal(written._doc, 'test', 'apply preserves the other keys');
      commit('chore(release): mobile 1.0.1, runtime 1.0.21');

      const passed = cli(['check', '--base', 'dev']);
      assert.equal(passed.code, 0, passed.output);
      assert.match(passed.output, /carries the required versions/);
    });
  });

  it('the CLI honours --js-only and JS_ONLY, waiving the runtime half only', () => {
    onBranch('f/jsonly', () => {
      write('apps/expo/app.config.js', '// comment only\n');
      commit('fix(APP-9): comment in app.config.js');
      const strict = cli(['check', '--base', 'dev']);
      assert.equal(strict.code, 1);
      const waived = cli(['check', '--base', 'dev', '--js-only']);
      assert.equal(waived.code, 1, 'production is still owed a patch');
      assert.match(waived.output, /production is 1\.0\.0, must be 1\.0\.1/);
      assert.doesNotMatch(waived.output, /runtime is 1\.0\.20/);
    });
  });

  it('the CLI --if-mobile skips a branch that does not touch the mobile trees', () => {
    onBranch('f/backend-only', () => {
      write('apps/backend/Program.cs', 'class P { int z; }\n');
      commit('feat(api): backend');
      const r = cli(['check', '--base', 'dev', '--if-mobile']);
      assert.equal(r.code, 0, r.output);
      assert.match(r.output, /mobile version check skipped/);
    });
  });

  it('the CLI refuses a hand-set version more than one level above the target', () => {
    onBranch('f/overreach', () => {
      write('apps/expo/version.json', versionJson('55.0.1', '1.0.20'));
      commit('chore: fat-fingered version');
      const r = cli(['check', '--base', 'dev']);
      assert.equal(r.code, 1);
      assert.match(r.output, /more than one level above/);
    });
  });

  it('apply repairs an over-reaching version instead of refusing, since apply is the remedy', () => {
    // The rejection message names `apply` as the fix, so `apply` must not abort on the same
    // condition — that left a hand edit as the only escape, which version.json forbids.
    onBranch('f/overreach-apply', () => {
      write('apps/expo/version.json', versionJson('55.0.1', '1.0.20'));
      commit('chore: fat-fingered version');

      const applied = cli(['apply', '--base', 'dev']);
      assert.equal(applied.code, 0, applied.output);
      assert.match(applied.output, /Ignoring hand-set production 55\.0\.1/);
      assert.equal(JSON.parse(readFileSync(join(repo, VERSION_FILE), 'utf8')).production, '1.0.0');

      commit('chore(release): repair the version');
      const rechecked = cli(['check', '--base', 'dev']);
      assert.equal(rechecked.code, 0, rechecked.output);
    });
  });

  it('touchesMobile counts a patches-only branch, which the pre-push hook used to skip', () => {
    onBranch('f/patches-only', () => {
      write('patches/react-native-foo+1.2.3.patch', 'diff --git a/x b/x\n');
      commit('fix(APP-10): patch a native module');
      assert.equal(touchesMobile('dev', repo), true);
      const input = collect({ baseRef: 'dev', jsOnly: false, headFromWorkingTree: false, repoRoot: repo });
      assert.deepEqual(input.nativeFiles, ['patches/react-native-foo+1.2.3.patch']);
      // The commit itself is outside MOBILE_PATHSPECS, so the store bump comes from the
      // runtime-drags-production rule rather than from the commit level.
      assert.equal(input.commitLevel, 'none');
      const target = requiredVersions(input);
      assert.equal(target.runtime, '1.0.21');
      assert.equal(target.production, '1.0.1');

      const r = cli(['check', '--base', 'dev', '--if-mobile']);
      assert.equal(r.code, 1, 'a patches-only branch must not be skipped');
      assert.match(r.output, /runtime is 1\.0\.20, must be 1\.0\.21/);
    });
  });

  it('apply stamps a runtime bump with the branch HEAD, and leaves a production-only bump unstamped', () => {
    onBranch('f/stamp', () => {
      write('apps/expo/app/feature.tsx', 'export const F = 1;\n');
      commit('feat(APP-12): js-only feature');
      let r = cli(['apply', '--base', 'dev']);
      assert.equal(r.code, 0, r.output);
      let written = JSON.parse(readFileSync(join(repo, VERSION_FILE), 'utf8'));
      assert.equal(written.production, '1.1.0');
      assert.equal(written.runtime, '1.0.20');
      assert.equal('runtimeBump' in written, false, 'no runtime bump, no marker');
      commit('chore(release): mobile 1.1.0, runtime 1.0.20');

      write('apps/expo/app.json', '{"expo":{"newKey":true}}\n');
      commit('fix(APP-12): native change');
      const head = run(['rev-parse', '--short=12', 'HEAD']);
      r = cli(['apply', '--base', 'dev']);
      assert.equal(r.code, 0, r.output);
      written = JSON.parse(readFileSync(join(repo, VERSION_FILE), 'utf8'));
      assert.equal(written.runtime, '1.0.21');
      assert.equal(written.runtimeBump, head, 'the marker names the commit that earned the bump');
    });
  });

  it('two concurrent native branches now collide in git instead of merging into one runtime', () => {
    // The gap this closes: both branches derive 1.0.21 and, before the marker, wrote the
    // byte-identical line, so git merged them and dev carried one runtime for two binaries.
    const branchWithBump = (name, file) => {
      run(['checkout', '-q', '-b', name, 'dev']);
      write(file, 'module.exports = (c) => c;\n');
      commit(`fix(${name}): native change`);
      const r = cli(['apply', '--base', 'dev']);
      assert.equal(r.code, 0, r.output);
      commit('chore(release): mobile 1.0.1, runtime 1.0.21');
      const marker = JSON.parse(readFileSync(join(repo, VERSION_FILE), 'utf8')).runtimeBump;
      run(['checkout', '-q', 'dev']);
      return marker;
    };
    const markerA = branchWithBump('f/native-a', 'apps/expo/plugins/withA.js');
    const markerB = branchWithBump('f/native-b', 'apps/expo/plugins/withB.js');
    assert.notEqual(markerA, markerB, 'each branch stamps its own HEAD');

    const devBefore = run(['rev-parse', 'HEAD']);
    try {
      run(['merge', '--no-ff', '--no-edit', '-q', 'f/native-a']);
      assert.equal(JSON.parse(readFileSync(join(repo, VERSION_FILE), 'utf8')).runtime, '1.0.21');

      let conflicted = false;
      try {
        run(['merge', '--no-ff', '--no-edit', '-q', 'f/native-b']);
      } catch {
        conflicted = true;
      }
      assert.equal(conflicted, true, 'the second bump must not merge silently');
      assert.ok(
        run(['diff', '--name-only', '--diff-filter=U']).includes('apps/expo/version.json'),
        'the conflict is on version.json',
      );
      run(['merge', '--abort']);

      // The documented resolution, from B's side: merge dev in, take dev's copy of the file,
      // finish the merge, then re-derive. `--theirs` is dev here because B is checked out.
      run(['checkout', '-q', 'f/native-b']);
      let conflictedOnB = false;
      try {
        run(['merge', '--no-edit', '-q', 'dev']);
      } catch {
        conflictedOnB = true;
      }
      assert.equal(conflictedOnB, true, 'B sees the same conflict when it merges dev in');
      run(['checkout', '--theirs', '--', 'apps/expo/version.json']);
      run(['add', 'apps/expo/version.json']);
      run(['commit', '--no-gpg-sign', '-q', '--no-edit']);

      const r = cli(['apply', '--base', 'dev']);
      assert.equal(r.code, 0, r.output);
      const written = JSON.parse(readFileSync(join(repo, VERSION_FILE), 'utf8'));
      assert.equal(written.runtime, '1.0.22', 'B re-derives above A once A is its base');
      assert.notEqual(written.runtimeBump, markerA, 'and stamps its own bump');
      commit('chore(release): mobile 1.0.1, runtime 1.0.22');

      // With the collision resolved, B merges into dev cleanly and dev carries both bumps.
      run(['checkout', '-q', 'dev']);
      run(['merge', '--no-ff', '--no-edit', '-q', 'f/native-b']);
      assert.equal(JSON.parse(readFileSync(join(repo, VERSION_FILE), 'utf8')).runtime, '1.0.22');
    } finally {
      run(['checkout', '-q', '-f', 'dev']);
      run(['reset', '-q', '--hard', devBefore]);
      run(['branch', '-qD', 'f/native-a']);
      run(['branch', '-qD', 'f/native-b']);
    }
  });

  it('check refuses a hand-raised runtime with no fresh marker, and apply repairs it', () => {
    onBranch('f/hand-bump', () => {
      write('apps/expo/app.json', '{"expo":{"newKey":true}}\n');
      write('apps/expo/version.json', versionJson('1.0.1', '1.0.21'));
      commit('fix(APP-13): native change with a hand-typed bump');

      const refused = cli(['check', '--base', 'dev']);
      assert.equal(refused.code, 1, refused.output);
      assert.match(refused.output, /raised 1\.0\.20 → 1\.0\.21 by hand, without the runtimeBump marker/);

      const repaired = cli(['apply', '--base', 'dev']);
      assert.equal(repaired.code, 0, repaired.output);
      assert.match(repaired.output, /stamping it/);
      const written = JSON.parse(readFileSync(join(repo, VERSION_FILE), 'utf8'));
      assert.equal(written.runtime, '1.0.21', 'the value was right; only the marker was missing');
      assert.equal(typeof written.runtimeBump, 'string');
      commit('chore(release): stamp the bump');
      assert.equal(cli(['check', '--base', 'dev']).code, 0);
    });
  });

  it('the CLI reports a malformed --base as its own error, even under --if-mobile', () => {
    // `--if-mobile` read the flag before the error handler existed, so a missing value
    // escaped as a raw Node stack trace instead of the script's message and annotation.
    for (const args of [
      ['check', '--if-mobile', '--base'],
      ['check', '--if-mobile', '--base', '--js-only'],
      ['check', '--base'],
    ]) {
      const r = cli(args);
      assert.equal(r.code, 1, args.join(' '));
      assert.match(r.output, /❌ --base needs a value/);
      assert.doesNotMatch(r.output, /at .*mobile-version\.mjs:\d+/, 'no stack trace');
    }
  });

  it('the CLI rejects an unknown command with exit 2', () => {
    const r = cli(['frobnicate']);
    assert.equal(r.code, 2);
    assert.match(r.output, /Usage:/);
  });
});
