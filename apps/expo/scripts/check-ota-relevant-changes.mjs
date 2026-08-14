/**
 * check-ota-relevant-changes.mjs — gate for the OTA publish step.
 *
 * deploy-mobile-update*.yml trigger on a `paths:` filter that includes root
 * `package.json` / `package-lock.json` (needed to catch real Expo/shared
 * dependency bumps). But this is an npm-workspaces monorepo with one shared
 * lockfile, so *any* dependency change anywhere (web, backend tooling, e2e)
 * rewrites the root lockfile too — the path filter alone fires on nearly
 * every merge, not just JS-only Expo changes.
 *
 * This script re-checks the same push's diff and decides whether anything
 * Expo-relevant actually changed:
 *   - apps/expo/** or packages/shared/** touched directly, or
 *   - package-lock.json changed AND the `apps/expo`/`packages/shared`
 *     subtrees of its `packages` map actually differ between before/after
 *     (npm lockfile v3 keys packages by workspace path). This is a
 *     structural JSON comparison, not a line-diff: a dependency version
 *     bump changes a nested `"version"`/`"resolved"`/`"integrity"` field
 *     while the parent `"apps/expo": {` key line stays unchanged context —
 *     a text-diff regex over changed lines misses that entirely.
 * Root `package.json`, `tsconfig.base.json`, and `biome.json` are shared
 * config consumed by the expo build — always treated as relevant; they
 * change rarely enough that this doesn't reintroduce the noise problem.
 *
 * Usage: node scripts/check-ota-relevant-changes.mjs --before <sha> --after <sha>
 * Exits 0 always — prints `relevant=true|false` and writes it to
 * $GITHUB_OUTPUT when running in Actions. Never fails the run; the caller
 * decides what to do with the result.
 */

import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..');

const ALWAYS_RELEVANT_ROOT_FILES = ['package.json', 'tsconfig.base.json', 'biome.json'];
const RELEVANT_PREFIXES = ['apps/expo/', 'packages/shared/'];
const WORKSPACE_KEYS = ['apps/expo', 'packages/shared'];

function git(args) {
    return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
}

function arg(name, fallback) {
    const i = process.argv.indexOf(`--${name}`);
    return i >= 0 ? process.argv[i + 1] : fallback;
}

const before = arg('before', 'HEAD~1');
const after = arg('after', 'HEAD');

function output(relevant, reason) {
    console.log(relevant ? `✔ OTA-relevant change: ${reason}` : `✘ No OTA-relevant change: ${reason}`);
    if (process.env.GITHUB_OUTPUT) {
        appendFileSync(process.env.GITHUB_OUTPUT, `relevant=${relevant}\n`);
    }
    process.exit(0);
}

/**
 * Read package-lock.json's `packages` map as committed at a given ref.
 * Returns {} if the file didn't exist at that ref (e.g. it was deleted and
 * re-added) rather than throwing — a missing lockfile at one side of the
 * diff isn't a reason to fail the whole gate.
 */
function packagesAt(ref) {
    try {
        return JSON.parse(git(['show', `${ref}:package-lock.json`])).packages ?? {};
    } catch {
        return {};
    }
}

/**
 * Fingerprint only the fields that represent actually-installed content.
 * npm recalculates bookkeeping flags (`dev`, `peer`, `optional`,
 * `devOptional`) for a package whenever *any* workspace's dependency graph
 * shifts, even when that package's real version/content for this workspace
 * hasn't changed — comparing raw entries would flag every unrelated
 * monorepo dependency change as Expo-relevant.
 */
function contentFingerprint(entry) {
    if (!entry) return undefined;
    const { version, resolved, integrity, dependencies, peerDependencies, optionalDependencies, bin } = entry;
    return JSON.stringify({ version, resolved, integrity, dependencies, peerDependencies, optionalDependencies, bin });
}

// The whole decision runs inside one try/catch so an unexpected git failure
// (e.g. `before` references a commit GitHub's cache has since dropped after
// an unusual force-push) can never crash this script red. Defaulting to
// "relevant" on any such failure is the safe direction — worst case is one
// needless OTA publish, not a silently skipped one.
try {
    const changedFiles = git(['diff', '--name-only', before, after])
        .split('\n')
        .filter(Boolean)
        .map((f) => f.replace(/\\/g, '/'));

    if (changedFiles.length === 0) {
        output(false, 'no files changed');
    }

    if (changedFiles.some((f) => RELEVANT_PREFIXES.some((p) => f.startsWith(p)))) {
        output(true, 'apps/expo/** or packages/shared/** touched');
    }

    if (changedFiles.some((f) => ALWAYS_RELEVANT_ROOT_FILES.includes(f) && f !== 'package.json')) {
        output(true, 'tsconfig.base.json or biome.json touched');
    }

    if (changedFiles.includes('package.json')) {
        output(true, 'root package.json touched');
    }

    if (changedFiles.includes('package-lock.json')) {
        const beforePackages = packagesAt(before);
        const afterPackages = packagesAt(after);

        const relevantKeys = new Set(
            [...Object.keys(beforePackages), ...Object.keys(afterPackages)].filter((key) =>
                WORKSPACE_KEYS.some((ws) => key === ws || key.startsWith(`${ws}/`)),
            ),
        );

        const touchesExpoOrShared = [...relevantKeys].some(
            (key) => contentFingerprint(beforePackages[key]) !== contentFingerprint(afterPackages[key]),
        );

        if (touchesExpoOrShared) {
            output(true, 'package-lock.json changed inside an apps/expo or packages/shared subtree');
        }
        output(false, 'package-lock.json changed but only for other workspaces');
    }

    output(false, 'no matched paths changed');
} catch (err) {
    output(true, `could not determine relevance safely (${err.message}) — treating as relevant`);
}
