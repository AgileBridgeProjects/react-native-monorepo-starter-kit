/**
 * mobile-version.mjs — the one place the mobile app's two version numbers come from.
 *
 * `apps/expo/version.json` holds:
 *   production — CFBundleShortVersionString / versionName of the store listings. Read by
 *                app.config.js for the `production` profile only; dev/uat/dev-client keep
 *                app.json's frozen 1.0.0 (separate app identifiers, separate histories, and
 *                their build numbers already autoIncrement).
 *   runtime    — expo-updates runtimeVersion shared by every OTA profile. An update is
 *                delivered only to builds whose runtime matches exactly, so this must
 *                change whenever the native surface changes (see NATIVE_SURFACE below).
 *
 * Both are derived, never chosen:
 *
 *   production = bump(last release, highest Conventional Commit level since it)
 *     - "last release" is the highest `mobile-v*` tag. `tag-mobile-version.yml` creates
 *       one whenever version.json reaches `main`, so everything after it is unreleased.
 *       A fresh fork has no tags at all, so seed `mobile-v1.0.0` by hand once (see
 *       docs/standards/ota-updates.md) — without an anchor there is nothing to count from.
 *     - Only commits that touch apps/expo or packages/shared count — a backend `feat`
 *       does not bump the mobile app.
 *     - `feat!:` / `BREAKING CHANGE:` → major, `feat` → minor, `fix` / `perf` / `revert`
 *       → patch, anything else → nothing. Anchoring on the release (not on the PR's
 *       merge base) means ten `feat` PRs in one cycle produce ONE minor bump, and only
 *       the PR that raises the pending level touches version.json.
 *     - A hand-set higher version is kept, but only up to ONE level above the derived
 *       target. A bigger jump is rejected: the ratchet is one-way and Apple never
 *       accepts a lower string later, so a fat-fingered 55.0.1 would be permanent.
 *
 *   runtime = base runtime, +1 patch when this branch touches the native surface
 *     - Per branch, not per release: dev-channel builds are cut ad hoc, so two native
 *       PRs in one cycle need two bumps or an OTA could reach the intermediate build
 *       with JS it cannot run. A needless bump costs one build; a missing one crashes.
 *     - A runtime bump means a full build must ship, and a store build needs a version
 *       Apple has not seen, so a runtime bump forces the production version above the
 *       last release even when no commit earned a bump on its own.
 *     - Skipped entirely for a promotion PR — `dev → uat` or `uat → main`, judged on BOTH
 *       refs: a promotion carries forward native change the source branch already accounted
 *       for and introduces none of its own. A hotfix branched off `main` shares the base but
 *       is new work, so it still owes a bump.
 *     - `--js-only` (CI: `[js-only]` in the PR title) waives the runtime half when a
 *       flagged change is verifiably JS-only. The production half is never waived.
 *     - Every bump is stamped (`runtimeBump`, the branch's HEAD) so two native PRs cut from
 *       the same base collide in git instead of merging into one runtime for two binaries.
 *       Only the second such PR ever notices; it merges the base in and re-runs `apply`.
 *
 * Usage:
 *   node scripts/mobile-version.mjs check [--base <ref>] [--js-only] [--if-mobile]   # exit 1 + fix
 *   node scripts/mobile-version.mjs apply [--base <ref>] [--js-only]                 # write version.json
 *   Default base: origin/dev — or MOBILE_VERSION_BASE, for a hotfix branch off main.
 *   MOBILE_VERSION_REPO_ROOT points the CLI at another checkout; the test suite uses it to
 *   drive a throwaway repo. Nothing in CI or the hooks sets it.
 *
 * Wired in: .husky/pre-push (check --if-mobile), .agents/commands/pr.md (apply + commit), and
 * ci-expo.yml (check). scripts/check-standards.mjs asserts the first and last.
 * publish-ota.mjs reads the runtime through app.config.js, so it needs nothing here.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXPO_ROOT = resolve(__dirname, '..');
const REPO_ROOT = resolve(EXPO_ROOT, '..', '..');

export const VERSION_FILE = 'apps/expo/version.json';
export const APP_CONFIG = 'apps/expo/app.config.js';
export const APP_JSON = 'apps/expo/app.json';
export const RELEASE_TAG_PREFIX = 'mobile-v';
export const DEFAULT_BASE = 'origin/dev';

/**
 * The last version string a store has actually released, or null while nothing has shipped.
 * Once set it acts as a floor: every derived production version is lifted above it, because
 * Apple rejects a version that is not higher than the released one. Fill it in at the first
 * store release and move it at every one after. It raises the target rather than failing the
 * check — a version that cannot be reached is a wedge, not a guard. Kept separate from the
 * mobile-v* tag on purpose: the tag means "reached main", this means "a store accepted it".
 */
export const RELEASED_STORE_VERSION = null;

/** Bases that a promotion targets. Necessary but not sufficient — see isPromotion. */
export const PROMOTION_BASES = ['uat', 'main'];

/**
 * Branches a promotion can come FROM. The base alone is not enough: a hotfix branched off
 * `main` also has base `main`, and treating it as a promotion waived the runtime bump for a
 * genuinely new native change — the crash this whole script exists to prevent. Only the
 * pipeline's own promotions (`dev → uat`, `uat → main`) carry change that was already
 * accounted for upstream.
 */
export const PROMOTION_HEADS = ['dev', 'uat'];

/** Commits count towards the production version only when they touch these trees. */
export const MOBILE_PATHSPECS = ['apps/expo', 'packages/shared'];

/**
 * Trees that make a branch "a mobile branch" for `--if-mobile`. Wider than MOBILE_PATHSPECS
 * because root `patches/` is native surface: without it a patches-only PR would be skipped by
 * the pre-push hook and merge with no runtime bump, so the next OTA would reach binaries built
 * from a differently-patched native tree. `.github/workflows/ci-expo.yml` carries the same
 * path in its `expo` filter for the same reason — change the two together.
 */
export const MOBILE_SCOPE = [...MOBILE_PATHSPECS, 'patches'];

/**
 * Files whose change can alter the native binary. Patterns, not an enumerated list, so a
 * new per-environment config file (GoogleService-Info.devclient.plist, say) is covered the
 * day it is committed.
 *
 * Every entry was checked against `git check-ignore` before it was listed: a pattern for a
 * gitignored file can never match a diff and would be dead code that reads like coverage.
 * `agconnect-services*.json` is ignored here and there is no Huawei profile, so it is absent.
 *
 * Root `patches/` is included on purpose: patch-package patches ship into the binary when
 * they target a native module, and the rule is "when unsure, bump" — a patch to a JS-only
 * package costs one needless build, or a `[js-only]` waiver.
 *
 * version.json itself is NOT native — a store version has no effect on JS/native
 * compatibility (only the runtime does), which is why it does not live in app.config.js.
 */
export const NATIVE_SURFACE = [
  /^apps\/expo\/app\.json$/,
  /^apps\/expo\/app\.config\.js$/,
  /^apps\/expo\/plugins\//,
  /^apps\/expo\/modules\//,
  /^apps\/expo\/google-services[^/]*\.json$/,
  /^apps\/expo\/GoogleService-Info[^/]*\.plist$/,
  /^patches\//,
];

/**
 * apps/expo/package.json is native only when a dependency section changes. A `scripts`
 * edit would otherwise trip the path check and push people towards `[js-only]`, which
 * then also waives genuine dependency bumps in the same PR.
 */
export const PACKAGE_JSON = 'apps/expo/package.json';
export const PACKAGE_JSON_NATIVE_KEYS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
  'overrides',
  'expo',
];

/**
 * apps/expo/eas.json is native only inside a build profile's `env`, `ios` and `android`.
 *
 * It is not a path match because most of the file cannot reach a binary: `submit`, `cli`,
 * `channel` and `ascAppId` edits are routine, and making every one of them cost a full EAS
 * build per channel is how people learn to reach for `[js-only]` reflexively.
 *
 * Those three keys genuinely can. `env` is the sharp one: `EXPO_PUBLIC_DEEP_LINK_HOST` is set
 * only here, and app.config.js bakes it into `ios.associatedDomains` and the Android
 * intent-filter host — both compiled into entitlements and the manifest. Changing that value
 * alone changes the binary, so without this an OTA could deliver universal-link JS to builds
 * still registered for the old host.
 */
export const EAS_JSON = 'apps/expo/eas.json';
export const EAS_JSON_NATIVE_KEYS = ['env', 'ios', 'android'];

const LEVEL_RANK = { none: 0, patch: 1, minor: 2, major: 3 };

// ─── Pure helpers (unit-tested in mobile-version.test.mjs) ───────────────────

export function parseSemver(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(version).trim());
  if (!match) throw new Error(`Not a MAJOR.MINOR.PATCH version: "${version}"`);
  return match.slice(1).map(Number);
}

export function compareSemver(a, b) {
  const [pa, pb] = [parseSemver(a), parseSemver(b)];
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
  }
  return 0;
}

export function maxSemver(...versions) {
  if (versions.length === 0) throw new Error('maxSemver needs at least one version');
  return versions.reduce((best, v) => (compareSemver(v, best) > 0 ? v : best));
}

export function bumpSemver(version, level) {
  const [major, minor, patch] = parseSemver(version);
  switch (level) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    case 'none':
      return version;
    default:
      throw new Error(`Unknown bump level "${level}"`);
  }
}

/**
 * Conventional Commits → bump level. Merge commits never reach here (--no-merges).
 * A leading bracketed prefix (`[previously deferred] fix(...): …`) is tolerated so a real
 * fix does not silently score none.
 */
export function levelOfCommit(subject, body = '') {
  const cleaned = String(subject)
    .trim()
    .replace(/^(\[[^\]]*\]\s*)+/, '');
  const header = /^(\w+)(\([^)]*\))?(!)?:/.exec(cleaned);
  if (!header) return 'none';
  const [, type, , bang] = header;
  if (bang || /^BREAKING[ -]CHANGE:/m.test(body)) return 'major';
  if (type === 'feat') return 'minor';
  if (type === 'fix' || type === 'perf' || type === 'revert') return 'patch';
  return 'none';
}

export function maxLevel(levels) {
  return levels.reduce((best, l) => (LEVEL_RANK[l] > LEVEL_RANK[best] ? l : best), 'none');
}

export function isPromotionBase(baseRef) {
  return PROMOTION_BASES.includes(String(baseRef).replace(/^origin\//, ''));
}

/**
 * A promotion is `dev → uat` or `uat → main` and nothing else. An unknown or unreadable head
 * (a detached checkout, a shallow CI clone) is deliberately NOT a promotion: the fallback has
 * to be "demand the bump", because a needless bump costs one build and a missed one crashes
 * installed apps.
 */
export function isPromotion(baseRef, headRef) {
  if (!isPromotionBase(baseRef)) return false;
  return PROMOTION_HEADS.includes(String(headRef ?? '').replace(/^origin\//, ''));
}

export function isNativeSurfacePath(file) {
  return NATIVE_SURFACE.some((pattern) => pattern.test(file));
}

export function packageJsonNativeChanged(basePkg, headPkg) {
  // Unreadable at either end (partial clone, conflict markers) — assume native. The
  // file is in the changed list either way, and a missed bump crashes installs.
  if (basePkg === null || headPkg === null) return true;
  return PACKAGE_JSON_NATIVE_KEYS.some(
    (key) => JSON.stringify(basePkg?.[key] ?? null) !== JSON.stringify(headPkg?.[key] ?? null),
  );
}

/**
 * Did a build profile's native-bearing keys change? Same shape as packageJsonNativeChanged,
 * including its conservative treatment of an unreadable file at either end.
 */
export function easJsonNativeChanged(baseEas, headEas) {
  if (baseEas === null || headEas === null) return true;
  const profiles = new Set([
    ...Object.keys(baseEas?.build ?? {}),
    ...Object.keys(headEas?.build ?? {}),
  ]);
  for (const profile of profiles) {
    for (const key of EAS_JSON_NATIVE_KEYS) {
      const before = JSON.stringify(baseEas?.build?.[profile]?.[key] ?? null);
      const after = JSON.stringify(headEas?.build?.[profile]?.[key] ?? null);
      if (before !== after) return true;
    }
  }
  return false;
}

export function nativeSurfaceTouched(changedFiles, { basePkg, headPkg, baseEas, headEas } = {}) {
  const files = changedFiles.filter(isNativeSurfacePath);
  if (changedFiles.includes(PACKAGE_JSON) && packageJsonNativeChanged(basePkg, headPkg)) {
    files.push(`${PACKAGE_JSON} (dependency sections)`);
  }
  if (changedFiles.includes(EAS_JSON) && easJsonNativeChanged(baseEas, headEas)) {
    files.push(`${EAS_JSON} (build profile env / ios / android)`);
  }
  return files;
}

/** Highest `mobile-v<semver>` tag, or null. Ignores anything that doesn't parse. */
export function highestReleaseTag(tagNames) {
  let best = null;
  for (const name of tagNames) {
    if (!name.startsWith(RELEASE_TAG_PREFIX)) continue;
    const version = name.slice(RELEASE_TAG_PREFIX.length);
    try {
      parseSemver(version);
    } catch {
      continue;
    }
    if (!best || compareSemver(version, best.version) > 0) best = { name, version };
  }
  return best;
}

/** The versions a hand edit may legitimately set: the target, or one level above it. */
export function allowedManualVersions(target) {
  return [
    target,
    bumpSemver(target, 'patch'),
    bumpSemver(target, 'minor'),
    bumpSemver(target, 'major'),
  ];
}

/**
 * The versions HEAD must carry. Pure: every git-derived input is passed in.
 * Returns the target plus the reasoning lines that `check`/`apply` print.
 */
export function requiredVersions({
  base,
  head,
  releaseVersion,
  commitLevel,
  nativeFiles,
  jsOnly = false,
  promotion = false,
  releasedStoreVersion = RELEASED_STORE_VERSION,
}) {
  const reasons = [];

  // ── runtime ───────────────────────────────────────────────────────────────
  let runtimeFloor = base.runtime;
  let runtimeBumped = false;
  if (promotion) {
    reasons.push(
      'runtime: promotion PR — native change was already accounted for on the source branch',
    );
  } else if (nativeFiles.length > 0) {
    if (jsOnly) {
      reasons.push(
        `runtime: native surface touched but waived as JS-only (${nativeFiles.join(', ')})`,
      );
      // The waiver skips a bump; it does not suppress the consequence of one somebody made
      // anyway. A raised runtime still means a new binary ships, so production must clear
      // the last release even under the waiver.
      if (compareSemver(head.runtime, base.runtime) > 0) runtimeBumped = true;
    } else if (compareSemver(head.runtime, base.runtime) > 0) {
      reasons.push(`runtime: native surface touched, already bumped ${base.runtime} → ${head.runtime}`);
      runtimeBumped = true;
    } else {
      runtimeFloor = bumpSemver(base.runtime, 'patch');
      reasons.push(`runtime: native surface touched (${nativeFiles.join(', ')}) → ${runtimeFloor}`);
      runtimeBumped = true;
    }
  } else {
    reasons.push('runtime: no native-surface change');
    // A runtime raised by hand with no native file in the diff — the documented remedy for a
    // lockfile-only native change — still means a new binary ships, so production must
    // still clear the last release. All three branches agree on this or none of them may.
    if (compareSemver(head.runtime, base.runtime) > 0) runtimeBumped = true;
  }
  const runtime = maxSemver(head.runtime, runtimeFloor);

  // ── production ────────────────────────────────────────────────────────────
  const fromRelease = bumpSemver(releaseVersion, commitLevel);
  let productionFloor = maxSemver(fromRelease, base.production);
  reasons.push(
    `production: release ${releaseVersion} + ${commitLevel} → ${fromRelease}` +
      (compareSemver(productionFloor, fromRelease) > 0
        ? ` (base already at ${base.production})`
        : ''),
  );

  // A runtime bump means a full build must ship; a store build needs a version Apple has
  // not released. Without this, a cycle of chore/refactor commits plus a native change
  // would rebuild the binary and resubmit it under the already-released version string.
  if (runtimeBumped && compareSemver(productionFloor, releaseVersion) <= 0) {
    productionFloor = bumpSemver(releaseVersion, 'patch');
    reasons.push(`production: runtime bumped, so a new build ships → at least ${productionFloor}`);
  }

  // Clearing the last released version is a floor, never an error. Throwing here would wedge
  // any chore-only mobile PR the moment RELEASED_STORE_VERSION is filled in, and because the
  // throw happens before any write, `apply` — the documented remedy — would die with it.
  if (releasedStoreVersion !== null && compareSemver(productionFloor, releasedStoreVersion) <= 0) {
    productionFloor = bumpSemver(releasedStoreVersion, 'patch');
    reasons.push(
      `production: must clear the released ${releasedStoreVersion} → at least ${productionFloor}`,
    );
  }

  let production = maxSemver(head.production, productionFloor);
  let overreach = null;
  if (compareSemver(head.production, productionFloor) > 0) {
    if (allowedManualVersions(productionFloor).includes(head.production)) {
      reasons.push(
        `production: keeping hand-set ${head.production} (one level above the derived ${productionFloor})`,
      );
    } else {
      overreach = head.production;
      production = productionFloor;
      reasons.push(
        `production: hand-set ${head.production} is more than one level above ${productionFloor} — rejected`,
      );
    }
  }

  return { production, runtime, reasons, overreach };
}

// ─── Git-backed collection ───────────────────────────────────────────────────

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

/** Like git(), but a failing command (missing path at a ref, no tags) is a null, not noise. */
function tryGit(args, cwd) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Versions at a ref. Falls back to the pre-version.json layout — `RUNTIME_VERSION` in
 * app.config.js and `expo.version` in app.json — so a branch based before version.json
 * existed still has a base to diff against.
 */
export function readVersionsFrom(versionJsonText, appConfigText, appJsonText) {
  if (versionJsonText) {
    let parsed;
    try {
      parsed = JSON.parse(versionJsonText);
    } catch (err) {
      throw new Error(`${VERSION_FILE} is not valid JSON: ${err.message}`);
    }
    for (const key of ['production', 'runtime']) {
      if (parsed[key] === undefined) throw new Error(`${VERSION_FILE} has no "${key}" key.`);
      parseSemver(parsed[key]); // throws with the offending value named
    }
    return {
      production: parsed.production,
      runtime: parsed.runtime,
      runtimeBump: typeof parsed.runtimeBump === 'string' ? parsed.runtimeBump : null,
    };
  }
  const runtime = /const RUNTIME_VERSION = '([^']+)'/.exec(appConfigText ?? '')?.[1];
  let production;
  try {
    production = JSON.parse(appJsonText ?? '')?.expo?.version;
  } catch {
    production = undefined;
  }
  if (!production || !runtime) return null;
  return { production, runtime, runtimeBump: null };
}

/**
 * Has the branch raised the runtime without `apply` stamping the bump?
 *
 * `runtimeBump` exists for one reason: two native PRs cut from the same `dev` derive the same
 * next runtime and write the byte-identical line, so git merges them silently and `dev` ends
 * with one runtime covering two native surfaces. Stamping every bump with the branch's own
 * commit makes the two lines differ, so the second PR hits a real merge conflict and has to
 * re-derive — and nobody else is asked to rebase. A hand-raised runtime with no fresh stamp
 * would slip past that, which is why `check` refuses it and `apply` repairs it.
 */
export function runtimeMarkerStale(base, head) {
  return compareSemver(head.runtime, base.runtime) > 0 && head.runtimeBump === base.runtimeBump;
}

function versionsAt(ref, repoRoot) {
  return readVersionsFrom(
    tryGit(['show', `${ref}:${VERSION_FILE}`], repoRoot),
    tryGit(['show', `${ref}:${APP_CONFIG}`], repoRoot),
    tryGit(['show', `${ref}:${APP_JSON}`], repoRoot),
  );
}

/** Working-tree versions. A missing file is null; a malformed one throws its own message. */
function versionsInWorkingTree(repoRoot) {
  const text = tryReadWorkingTree(VERSION_FILE, repoRoot);
  return text === null ? null : readVersionsFrom(text);
}

/** Parsed JSON for a repo file at a ref, or from the working tree when ref is null. */
function jsonAt(relativePath, ref, repoRoot) {
  const text =
    ref === null
      ? tryReadWorkingTree(relativePath, repoRoot)
      : tryGit(['show', `${ref}:${relativePath}`], repoRoot);
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function tryReadWorkingTree(relativePath, repoRoot) {
  try {
    return readFileSync(join(repoRoot, relativePath), 'utf8');
  } catch {
    return null;
  }
}

/** Repo-relative paths changed on this branch, including files not yet added to git. */
export function changedFilesFor({ mergeBase, headFromWorkingTree, runGit }) {
  const tracked = headFromWorkingTree
    ? runGit(['diff', '--name-only', mergeBase])
    : runGit(['diff', '--name-only', mergeBase, 'HEAD']);
  // `git diff` never lists untracked files, and `apply` runs BEFORE the commit — so a
  // brand-new plugin (the commonest native addition there is) would be invisible to it.
  const untracked = headFromWorkingTree ? runGit(['ls-files', '--others', '--exclude-standard']) : '';
  return [...tracked.split('\n'), ...untracked.split('\n')]
    .filter(Boolean)
    .map((f) => f.replace(/\\/g, '/'));
}

/**
 * The branch this work is on. `GITHUB_HEAD_REF` is set for a pull_request event, where the
 * checkout itself is a detached merge commit; locally it is the current branch. Null when git
 * cannot say, which isPromotion treats as "not a promotion".
 */
export function currentHeadRef(repoRoot = REPO_ROOT) {
  if (process.env.GITHUB_HEAD_REF) return process.env.GITHUB_HEAD_REF;
  const branch = tryGit(['rev-parse', '--abbrev-ref', 'HEAD'], repoRoot);
  return branch === 'HEAD' ? null : branch;
}

/** Everything `requiredVersions` needs, read from git for the given base. */
export function collect({
  baseRef,
  jsOnly,
  headFromWorkingTree,
  repoRoot = REPO_ROOT,
  headRef = currentHeadRef(repoRoot),
}) {
  const mergeBase = tryGit(['merge-base', baseRef, 'HEAD'], repoRoot);
  if (!mergeBase) {
    throw new Error(
      `Cannot resolve merge-base of ${baseRef} and HEAD — run \`git fetch origin\` first, or pass --base <ref>.`,
    );
  }

  const base = versionsAt(mergeBase, repoRoot);
  if (!base) {
    throw new Error(`No version information at merge-base ${mergeBase.slice(0, 9)} (${baseRef}).`);
  }

  const head = headFromWorkingTree ? versionsInWorkingTree(repoRoot) : versionsAt('HEAD', repoRoot);
  if (!head) {
    throw new Error(
      `${VERSION_FILE} is missing on this branch. Merge ${baseRef} in first — version.json replaced RUNTIME_VERSION in app.config.js.`,
    );
  }

  const tag = highestReleaseTag(
    (tryGit(['tag', '--list', `${RELEASE_TAG_PREFIX}*`], repoRoot) ?? '').split('\n'),
  );
  const anchor = tag
    ? { ref: tag.name, version: tag.version, label: `tag ${tag.name}` }
    : {
        ref: mergeBase,
        version: base.production,
        label: `${baseRef} (no ${RELEASE_TAG_PREFIX}* tag found — is this clone missing tags? run \`git fetch --tags\`)`,
      };

  const log = tryGit(
    [
      'log',
      '--no-merges',
      '--format=%s%x1f%b%x1e',
      `${anchor.ref}..HEAD`,
      '--',
      ...MOBILE_PATHSPECS,
    ],
    repoRoot,
  );
  if (log === null) {
    throw new Error(
      `Could not walk ${anchor.ref}..HEAD — the anchor commit is missing from this clone (shallow or partial?). Run \`git fetch --tags --unshallow\`.`,
    );
  }
  const commits = log
    .split('\x1e')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [subject, body = ''] = entry.split('\x1f');
      return { subject, level: levelOfCommit(subject, body) };
    });

  const changedFiles = changedFilesFor({
    mergeBase,
    headFromWorkingTree,
    runGit: (args) => git(args, repoRoot),
  });
  const headRefForFiles = headFromWorkingTree ? null : 'HEAD';
  const nativeFiles = nativeSurfaceTouched(changedFiles, {
    basePkg: jsonAt(PACKAGE_JSON, mergeBase, repoRoot),
    headPkg: jsonAt(PACKAGE_JSON, headRefForFiles, repoRoot),
    baseEas: jsonAt(EAS_JSON, mergeBase, repoRoot),
    headEas: jsonAt(EAS_JSON, headRefForFiles, repoRoot),
  });

  return {
    mergeBase,
    base,
    head,
    anchor,
    commits,
    commitLevel: maxLevel(commits.map((c) => c.level)),
    nativeFiles,
    jsOnly,
    headRef,
    promotion: isPromotion(baseRef, headRef),
    releaseVersion: anchor.version,
  };
}

/**
 * Does this branch touch the mobile app at all? `true` / `false`, or `null` when git
 * cannot answer (unfetched base, fresh clone). Used by `--if-mobile` so the pre-push
 * hook stays out of the way of backend- and web-only work.
 */
export function touchesMobile(baseRef, repoRoot = REPO_ROOT) {
  const mergeBase = tryGit(['merge-base', baseRef, 'HEAD'], repoRoot);
  if (!mergeBase) return null;
  try {
    return changedFilesFor({
      mergeBase,
      headFromWorkingTree: true,
      runGit: (args) => git(args, repoRoot),
    }).some((file) => MOBILE_SCOPE.some((prefix) => file.startsWith(`${prefix}/`)));
  } catch {
    return null;
  }
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

export function arg(name, argv = process.argv) {
  const i = argv.indexOf(`--${name}`);
  if (i < 0) return undefined;
  const value = argv[i + 1];
  if (value === undefined || value.startsWith('--')) {
    throw new Error(
      `--${name} needs a value (got ${value === undefined ? 'nothing' : `"${value}"`}).`,
    );
  }
  return value;
}

function annotate(kind, title, message) {
  if (process.env.GITHUB_ACTIONS) {
    console.log(`::${kind} title=${title}::${message.replace(/\n/g, '%0A')}`);
  }
}

function summarise(input, target) {
  const counts = input.commits.reduce((acc, c) => {
    acc[c.level] = (acc[c.level] ?? 0) + 1;
    return acc;
  }, {});
  const tally = Object.entries(counts)
    .map(([level, n]) => `${level} ×${n}`)
    .join(', ');
  console.log(
    `Branch:           ${input.headRef ?? '(detached)'} → ${input.promotion ? 'promotion' : 'new work'}`,
  );
  console.log(`Release anchor:   ${input.anchor.label} = ${input.anchor.version}`);
  console.log(
    `Mobile commits:   ${input.commits.length} since anchor${tally ? ` (${tally})` : ''} → ${input.commitLevel}`,
  );
  console.log(`Base (merge-base): production ${input.base.production}, runtime ${input.base.runtime}`);
  console.log(`Head:              production ${input.head.production}, runtime ${input.head.runtime}`);
  for (const line of target.reasons) console.log(`  · ${line}`);
  console.log(`Required:          production ${target.production}, runtime ${target.runtime}`);
}

/**
 * Write the derived versions. A runtime above the base gets stamped with the commit that
 * earned it (see runtimeMarkerStale); a runtime that merely carried over from the base does
 * not, so two PRs that both left the runtime alone still merge cleanly.
 */
function writeVersionFile(target, base, repoRoot) {
  const path = join(repoRoot, VERSION_FILE);
  const current = JSON.parse(readFileSync(path, 'utf8'));
  const next = { ...current, production: target.production, runtime: target.runtime };
  if (compareSemver(target.runtime, base.runtime) > 0) {
    // The branch's own HEAD: unique per branch, so two concurrent bumps can never collide on
    // the same line. `apply` runs before the chore(release) commit, so this names the last
    // real commit of the work rather than the commit that records the bump.
    next.runtimeBump = tryGit(['rev-parse', '--short=12', 'HEAD'], repoRoot) ?? 'unknown';
  }
  writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`);
}

function main() {
  const command = process.argv[2];
  if (command !== 'check' && command !== 'apply') {
    console.error(
      'Usage: node scripts/mobile-version.mjs <check|apply> [--base <ref>] [--js-only] [--if-mobile]',
    );
    process.exit(2);
  }

  const repoRoot = process.env.MOBILE_VERSION_REPO_ROOT || REPO_ROOT;

  // Deliberate escape, mirroring E2E_SKIP in the same hook. `--no-verify` is banned by
  // house rule, so a check with no escape hatch is a check that gets worked around.
  if (process.env.MOBILE_VERSION_SKIP) {
    console.log(`⚠  Mobile version check skipped: ${process.env.MOBILE_VERSION_SKIP}`);
    console.log('   The PR still has to pass the same check in CI.');
    return;
  }

  // `--if-mobile` (the pre-push hook) — this runs on every push in the monorepo, so a
  // backend- or docs-only branch must sail through, and an unanswerable git state must
  // not block an unrelated push. CI calls `check` without this flag.
  // Resolved once, under the same error handling as everything else: a malformed `--base`
  // used to escape as a raw stack trace when `--if-mobile` read it first.
  let baseRef;
  try {
    baseRef = arg('base') ?? process.env.MOBILE_VERSION_BASE ?? DEFAULT_BASE;
  } catch (err) {
    console.error(`❌ ${err.message}`);
    annotate('error', 'Mobile version', err.message);
    process.exit(1);
  }

  if (process.argv.includes('--if-mobile')) {
    const verdict = touchesMobile(baseRef, repoRoot);
    if (verdict === false) {
      console.log(
        `✔ No ${MOBILE_SCOPE.map((p) => `${p}/`).join(', ')} changes — mobile version check skipped.`,
      );
      return;
    }
    if (verdict === null) {
      console.log(
        `⚠  Could not compare against ${baseRef} (try \`git fetch origin\`) — mobile version check skipped locally; CI will still run it.`,
      );
      return;
    }
  }

  let input;
  let target;
  try {
    const jsOnly = process.argv.includes('--js-only') || process.env.JS_ONLY === 'true';
    input = collect({ baseRef, jsOnly, headFromWorkingTree: command === 'apply', repoRoot });
    target = requiredVersions(input);
  } catch (err) {
    console.error(`❌ ${err.message}`);
    annotate('error', 'Mobile version', err.message);
    process.exit(1);
  }

  summarise(input, target);

  const productionOk = input.head.production === target.production;
  const runtimeOk = input.head.runtime === target.runtime;
  const markerStale = runtimeMarkerStale(input.base, input.head);

  if (command === 'apply') {
    // An over-reaching hand-set version is a `check` failure, never an `apply` one: `apply`
    // is the documented remedy for it, so refusing here would print a fix that cannot run
    // and leave the hand edit as the only way out — the very thing version.json forbids.
    if (target.overreach) {
      console.log(
        `⚠  Ignoring hand-set production ${target.overreach} — more than one level above the derived ${target.production}.`,
      );
    }
    if (productionOk && runtimeOk && !markerStale) {
      console.log(`✔ ${VERSION_FILE} already correct — nothing to change.`);
      return;
    }
    if (markerStale) {
      console.log('⚠  Runtime was raised without a bump marker — stamping it so a concurrent bump cannot merge silently.');
    }
    writeVersionFile(target, input.base, repoRoot);
    console.log(
      `✔ Wrote ${VERSION_FILE}: production ${input.head.production} → ${target.production}, runtime ${input.head.runtime} → ${target.runtime}`,
    );
    console.log(
      `  Commit it on its own:  git commit -m "chore(release): mobile ${target.production}, runtime ${target.runtime}" -- ${VERSION_FILE}`,
    );
    return;
  }

  if (target.overreach) {
    const message = `${VERSION_FILE} sets production to ${target.overreach}, more than one level above the derived ${target.production}. The version only ever ratchets up and Apple will not accept a lower string later, so a jump this size is refused in case it is a typo.`;
    console.error(
      `\n❌ ${message}\n   Set it to ${target.production} (or one level above) with:  npm run version:apply -w apps/expo\n`,
    );
    annotate('error', 'Mobile version', message);
    process.exit(1);
  }

  if (productionOk && runtimeOk && !markerStale) {
    console.log(`✔ ${VERSION_FILE} carries the required versions.`);
    return;
  }

  const problems = [];
  if (!productionOk) {
    problems.push(`production is ${input.head.production}, must be ${target.production}`);
  }
  if (!runtimeOk) problems.push(`runtime is ${input.head.runtime}, must be ${target.runtime}`);
  if (productionOk && runtimeOk && markerStale) {
    problems.push(
      `runtime was raised ${input.base.runtime} → ${input.head.runtime} by hand, without the runtimeBump marker that stops a concurrent bump merging silently`,
    );
  }
  const fix = [
    `Fix:  npm run version:apply -w apps/expo${baseRef !== DEFAULT_BASE ? ` -- --base ${baseRef}` : ''}`,
    `      git commit -m "chore(release): mobile ${target.production}, runtime ${target.runtime}" -- ${VERSION_FILE}`,
  ];
  if (!runtimeOk && input.nativeFiles.length > 0) {
    fix.push(
      '      …or, if the native-surface change is verifiably JS-only (no dependency, plugin or',
      '      native-config effect), add [js-only] to the PR title and push with the waiver set:',
      '        bash:       JS_ONLY=true git push',
      "        PowerShell: $env:JS_ONLY='true'; git push",
    );
  }
  const message = `${VERSION_FILE} is behind what this branch owes: ${problems.join('; ')}.`;
  console.error(`\n❌ ${message}\n${fix.join('\n')}\n`);
  annotate('error', 'Mobile version', `${message}\n${fix.join('\n')}`);
  process.exit(1);
}

/**
 * Run only when invoked directly. Both sides go through realpath: `resolve()` leaves
 * symlinks intact while `import.meta.url` is already resolved, and a mismatch would
 * silently skip main() — printing nothing and exiting 0, which every call site reads
 * as a pass.
 */
function isDirectRun() {
  if (!process.argv[1]) return false;
  try {
    return import.meta.url === pathToFileURL(realpathSync(resolve(process.argv[1]))).href;
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  main();
}
