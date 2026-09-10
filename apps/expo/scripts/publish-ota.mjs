/**
 * publish-ota.mjs — the single entry point for publishing EAS (OTA) updates.
 *
 * Used by the deploy-mobile-update*.yml workflows AND by humans (manual/dry-run).
 * Never run `eas update` by hand — this script exists because the raw command
 * has three silent failure modes:
 *
 *   1. Env drift — `eas update --environment X` bundles with the EAS server
 *      environment's vars only (local .env is ignored). If the server env does
 *      not mirror the eas.json build-profile env, the OTA bundle bakes in
 *      different EXPO_PUBLIC_* values (API URL!) than the installed builds.
 *      → Step 1 pushes the eas.json profile env to the matching EAS
 *        environment before every publish, so eas.json stays the single
 *        source of truth.
 *
 *   2. Runtime drift — an update is delivered only to builds whose
 *      runtimeVersion matches the one resolved at publish time. If the
 *      runtime was bumped (native change) but no new build was cut, the
 *      update lands on zero devices, with no error anywhere.
 *      → Step 2 compares the resolved runtimeVersion against the newest
 *        finished build on the channel per platform, publishes only to
 *        matching platforms, and skips with a warning (not a red failure)
 *        when nothing can receive it yet — a pending build is not an error.
 *
 *   3. Flag drift — eas-cli removed `eas update --profile` and made
 *      `--environment` mandatory on SDK 55+, which broke the old pipelines
 *      for weeks without anyone noticing.
 *      → All flags live here, in one place, exercised by every publish.
 *
 * Usage:
 *   node scripts/publish-ota.mjs --profile dev  [--message "…"] [--dry-run]
 *   node scripts/publish-ota.mjs --profile production --message "…"
 *
 * Env: EXPO_TOKEN must be set in CI (interactive login works locally).
 */

import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXPO_ROOT = resolve(__dirname, '..');

// EAS environment used for each update profile. `eas update --environment` is
// mandatory on SDK 55+. The environment is populated from the eas.json profile
// env on every publish, so the two can never drift apart. `dev` maps to the
// `preview` environment to match the dev build profile's `environment` key in
// eas.json — the dev channel and the preview environment are used together.
const PROFILE_ENVIRONMENTS = {
    dev: 'preview',
    uat: 'uat',
    production: 'production',
};

// Platforms that can receive updates per profile.
const PROFILE_PLATFORMS = {
    dev: ['android', 'ios'],
    uat: ['android', 'ios'],
    production: ['android', 'ios'],
};

// EAS Update rejects messages longer than 512 chars.
const MAX_MESSAGE_LENGTH = 512;

function parseArgs(argv) {
    const args = { dryRun: false };
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--profile') args.profile = argv[++i];
        else if (argv[i] === '--message') args.message = argv[++i];
        else if (argv[i] === '--dry-run') args.dryRun = true;
        else fail(`Unknown argument: ${argv[i]}`);
    }
    return args;
}

function fail(message) {
    console.error(`\n❌ ${message}\n`);
    process.exit(1);
}

/**
 * Run eas with args, return trimmed stdout. Inherits stderr so progress is visible.
 * Uses the `eas` binary on PATH — pinned by expo-github-action in CI, global install
 * locally — so this script never floats to an unpinned eas-cli version on its own.
 */
function eas(args, { json = false } = {}) {
    const stdout = execFileSync('eas', args, {
        cwd: EXPO_ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'inherit'],
        shell: process.platform === 'win32',
        maxBuffer: 32 * 1024 * 1024,
    }).trim();
    if (!json) return stdout;
    // eas-cli appends upgrade notices after the JSON payload — slice to the JSON body.
    const start = Math.min(
        ...[stdout.indexOf('['), stdout.indexOf('{')].filter((i) => i >= 0),
    );
    const end = Math.max(stdout.lastIndexOf(']'), stdout.lastIndexOf('}'));
    if (!Number.isFinite(start) || end < start) fail(`Expected JSON from: eas ${args.join(' ')}`);
    return JSON.parse(stdout.slice(start, end + 1));
}

/** Append a line to the GitHub job summary when running in Actions; always echo it. */
function summary(line) {
    console.log(line);
    if (process.env.GITHUB_STEP_SUMMARY) {
        appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n`);
    }
}

/**
 * Emit a GitHub Actions warning annotation (surfaces on the run without marking
 * it failed), then exit 0. Used for "can't deliver yet" states that are
 * operational, not errors — e.g. the runtime was bumped but no full build has
 * shipped it, so there is simply nothing to publish. A red ❌ here would ping
 * the team on every push during that window and train them to ignore CI.
 */
function skip(title, message) {
    if (process.env.GITHUB_ACTIONS) {
        console.log(`::warning title=${title}::${message}`);
    } else {
        console.log(`\n⏭️  ${title}: ${message}\n`);
    }
    process.exit(0);
}

// ─── 0. Resolve profile ───────────────────────────────────────────────────────

const { profile, message, dryRun } = parseArgs(process.argv.slice(2));
if (!profile) fail('Missing --profile <name> (e.g. dev, uat, production)');

const easJson = JSON.parse(readFileSync(join(EXPO_ROOT, 'eas.json'), 'utf8'));
const profileDef = easJson.build?.[profile];
if (!profileDef) fail(`Profile "${profile}" not found in eas.json`);
if (profileDef.developmentClient) fail(`Profile "${profile}" is a dev client — it has no OTA channel.`);

const channel = profileDef.channel;
const environment = PROFILE_ENVIRONMENTS[profile];
const platforms = PROFILE_PLATFORMS[profile];
if (!channel || !environment || !platforms) {
    fail(`Profile "${profile}" is not an OTA profile (needs a channel + entries in publish-ota.mjs maps).`);
}

const profileEnv = profileDef.env ?? {};
const updateMessage = (
    message ??
    execFileSync('git', ['log', '-1', '--pretty=%s'], { cwd: EXPO_ROOT, encoding: 'utf8' }).trim()
).slice(0, MAX_MESSAGE_LENGTH);

console.log(`\n▶ OTA publish — profile "${profile}" → channel "${channel}" (environment "${environment}")\n`);

// ─── 1. Sync the eas.json profile env to the EAS environment ─────────────────
// `eas update --environment` bundles with the server environment's vars only.
// Pushing before every publish keeps eas.json the single source of truth.
//
// EAS_BUILD_PROFILE must never be pushed. EAS sets it itself on every build worker,
// but a value STORED on the environment overrides that — so every build profile
// sharing the slot then identifies as whichever profile last published through it,
// and app.config.js keys the app name, bundle identifier, package and icons off it.
// The bundle never needs it: identity fields are native-only, and the runtime
// version is the same for every profile.
//
// Note also that `eas env:push --force` overwrites but never REMOVES keys, so a
// shared environment slot accumulates whatever any profile has ever pushed to it.
const NEVER_PUSH = new Set(['EAS_BUILD_PROFILE']);
const pushedEnv = Object.fromEntries(
    Object.entries(profileEnv).filter(([key]) => !NEVER_PUSH.has(key)),
);

const tempDir = mkdtempSync(join(tmpdir(), 'ota-env-'));
const envFile = join(tempDir, '.env.ota-sync');
try {
    writeFileSync(
        envFile,
        Object.entries(pushedEnv)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n'),
    );
    if (dryRun) {
        console.log(`(dry-run) Would push ${Object.keys(pushedEnv).length} vars to environment "${environment}"`);
    } else {
        eas(['env:push', environment, '--path', envFile, '--force']);
        console.log(`✔ Synced ${Object.keys(pushedEnv).length} eas.json env vars to environment "${environment}"`);
    }
} finally {
    rmSync(tempDir, { recursive: true, force: true });
}

// ─── 2. Runtime compatibility guardrail ───────────────────────────────────────
// Publish only to platforms whose newest finished build can actually receive
// this update. A silent runtime mismatch is the #1 way OTA "doesn't work".

/**
 * Resolve the runtimeVersion this publish would carry, by evaluating
 * app.config.js exactly as the Expo CLI does (with the profile env applied).
 * The manual-semver policy makes this a plain string — deterministic on any
 * machine, unlike fingerprint hashes which differ between EAS build servers,
 * CI runners, and dev laptops (the root cause of the old broken OTA).
 */
function resolveRuntimeVersion() {
    const require = createRequire(import.meta.url);
    const savedEnv = {};
    for (const [key, value] of Object.entries(profileEnv)) {
        savedEnv[key] = process.env[key];
        process.env[key] = value;
    }
    try {
        const appJson = JSON.parse(readFileSync(join(EXPO_ROOT, 'app.json'), 'utf8'));
        const configFn = require(join(EXPO_ROOT, 'app.config.js'));
        return configFn({ config: appJson.expo }).runtimeVersion;
    } finally {
        for (const [key, value] of Object.entries(savedEnv)) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    }
}

const runtimeVersion = resolveRuntimeVersion();
if (typeof runtimeVersion !== 'string') {
    fail(
        `Profile "${profile}" resolves runtimeVersion to a policy (${JSON.stringify(runtimeVersion)}), not a string. ` +
        'OTA publishing requires the manual RUNTIME_VERSION string in app.config.js — fingerprint hashes are not ' +
        'reproducible across the environments that build binaries vs publish updates.',
    );
}

const compatible = [];
const report = [];

for (const platform of platforms) {
    const builds = eas(
        ['build:list', '--channel', channel, '--platform', platform, '--status', 'finished', '--limit', '1', '--json', '--non-interactive'],
        { json: true },
    );
    const latestBuild = builds[0];
    if (!latestBuild) {
        report.push(`⚠️ **${platform}**: no finished build on channel \`${channel}\` — skipped (nothing installed to update).`);
        continue;
    }

    const expectedRuntime = latestBuild.runtimeVersion;
    if (runtimeVersion === expectedRuntime) {
        compatible.push(platform);
        report.push(`✅ **${platform}**: runtime \`${expectedRuntime}\` matches build ${latestBuild.appBuildVersion ?? ''} — update will be delivered.`);
    } else {
        report.push(
            `❌ **${platform}**: runtime mismatch — publishing \`${runtimeVersion}\` but the newest installed build (build ${latestBuild.appBuildVersion ?? '?'}) runs \`${expectedRuntime}\`. ` +
            'The runtime was bumped (native change) since that build — cut a full EAS build for this platform first.',
        );
    }
}

summary('### OTA runtime compatibility check');
summary('');
for (const line of report) summary(line);
summary('');

if (compatible.length === 0) {
    summary(`### ⏭️ OTA update skipped (channel \`${channel}\`)`);
    summary('');
    summary('No installed build can receive this update yet. Run the **Deploy Mobile** workflow to cut a full build on this runtime, after which OTA publishing resumes automatically.');
    // Not an error — the push author did nothing wrong; a build is simply
    // pending. Skip (exit 0) with a warning annotation instead of failing red.
    skip(
        `OTA skipped for ${channel}`,
        `No installed build matches runtime ${runtimeVersion}. Cut a full EAS build (Deploy Mobile) so OTA can resume; nothing was published.`,
    );
}

// ─── 3. Publish ───────────────────────────────────────────────────────────────

const platformArg = compatible.length === platforms.length && platforms.length > 1 ? 'all' : compatible.join(',');

if (dryRun) {
    console.log(`(dry-run) Would publish: eas update --channel ${channel} --environment ${environment} --platform ${platformArg} --message "${updateMessage}"`);
    process.exit(0);
}

eas([
    'update',
    '--channel', channel,
    '--environment', environment,
    '--platform', platformArg,
    '--message', updateMessage,
    '--non-interactive',
]);

summary(`### 🚀 OTA update published to \`${channel}\` (${compatible.join(' + ')})`);
summary('');
summary(`**Message:** ${updateMessage}`);
summary('');
summary('[View on the Expo dashboard](https://expo.dev/accounts/agilebridge/projects/starterkit/updates)');

if (compatible.length < platforms.length) {
    summary('');
    summary(`⚠️ Published to **${compatible.join(', ')} only** — the other platform needs a full build (see fingerprint check above).`);
}
