/**
 * check-runtime-version.mjs — CI guard for the manual OTA runtime version.
 *
 * OTA updates are delivered only to builds whose runtimeVersion matches the
 * RUNTIME_VERSION constant in app.config.js (see its comment for the policy).
 * If a PR changes the native surface without bumping RUNTIME_VERSION, an OTA
 * published afterwards would ship JS that expects native modules the installed
 * binaries don't have — crashing users at startup. This check makes that
 * mistake impossible to merge silently.
 *
 * Usage (CI):   node scripts/check-runtime-version.mjs --base <ref>
 * Usage (local): node scripts/check-runtime-version.mjs            # base = origin/dev
 *
 * Escape hatch: when a flagged change is verifiably JS-only (e.g. a dependency
 * patch bump with no native code), add "[js-only]" to the PR title and CI
 * skips this check (see ci-expo.yml). Prefer bumping — a needless bump only
 * costs one full build; a missing bump crashes production.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXPO_ROOT = resolve(__dirname, '..');
const REPO_ROOT = resolve(EXPO_ROOT, '..', '..');

// Paths whose changes can alter the native surface of the app. Deliberately
// conservative: a false positive costs one build; a false negative crashes.
const NATIVE_SURFACE_PATHS = [
    'apps/expo/package.json',
    'apps/expo/app.json',
    'apps/expo/app.config.js',
    'apps/expo/plugins/',
    'apps/expo/modules/',
    'apps/expo/google-services.json',
    'apps/expo/GoogleService-Info.plist',
    'apps/expo/GoogleService-Info.dev.plist',
    'apps/expo/GoogleService-Info.uat.plist',
];

function git(args) {
    return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
}

function readRuntimeVersion(source) {
    const match = source.match(/const RUNTIME_VERSION = '([^']+)'/);
    if (!match) {
        console.error("❌ Could not find `const RUNTIME_VERSION = '…'` in apps/expo/app.config.js.");
        process.exit(1);
    }
    return match[1];
}

const baseArgIndex = process.argv.indexOf('--base');
const baseRef = baseArgIndex >= 0 ? process.argv[baseArgIndex + 1] : 'origin/dev';

const mergeBase = git(['merge-base', baseRef, 'HEAD']);
const changedFiles = git(['diff', '--name-only', mergeBase, 'HEAD'])
    .split('\n')
    .filter(Boolean)
    .map((f) => f.replace(/\\/g, '/'));

const nativeTouches = changedFiles.filter((file) =>
    NATIVE_SURFACE_PATHS.some((p) => (p.endsWith('/') ? file.startsWith(p) : file === p)),
);

if (nativeTouches.length === 0) {
    console.log('✔ No native-surface files changed — runtime version bump not required.');
    process.exit(0);
}

const currentRuntime = readRuntimeVersion(readFileSync(join(EXPO_ROOT, 'app.config.js'), 'utf8'));
const baseConfig = git(['show', `${mergeBase}:apps/expo/app.config.js`]);
// A brand-new RUNTIME_VERSION constant (base file predates it) counts as a bump.
const baseRuntime = baseConfig.includes('const RUNTIME_VERSION') ? readRuntimeVersion(baseConfig) : null;

if (baseRuntime === null || currentRuntime !== baseRuntime) {
    console.log(`✔ Native-surface files changed and RUNTIME_VERSION was bumped (${baseRuntime ?? '—'} → ${currentRuntime}).`);
    console.log('  Remember: OTA to existing installs stops until a full EAS build ships the new runtime.');
    process.exit(0);
}

console.error(`
❌ Native-surface files changed but RUNTIME_VERSION in apps/expo/app.config.js was not bumped (still "${currentRuntime}").

Changed native-surface files:
${nativeTouches.map((f) => `  - ${f}`).join('\n')}

An OTA update published after this merge could deliver JS that expects a
different native surface than installed builds have — crashing them at startup.

Fix one of:
  1. Bump RUNTIME_VERSION in apps/expo/app.config.js (then cut full EAS builds
     per channel before relying on OTA again), or
  2. If this change is verifiably JS-only (no native module / plugin / config
     change — e.g. a devDependency or script edit), add "[js-only]" to the PR
     title to skip this check.
`);
process.exit(1);
