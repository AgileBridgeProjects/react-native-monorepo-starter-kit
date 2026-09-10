#!/usr/bin/env node
/**
 * `eas build` wrapper that exports EAS_BUILD_PROFILE before the CLI reads app.config.js.
 *
 * app.config.js keys the app's identity off EAS_BUILD_PROFILE — name (and therefore the
 * Xcode target), bundle identifier, package name, icons, the Google sign-in URL scheme.
 * EAS resolves that config TWICE: once here, on the machine starting the build, and again
 * on the builder, which always has the variable set. When the local side does not, the two
 * disagree and the build dies partway through, with an error that names neither the cause
 * nor the profile:
 *
 *   Runtime version calculated on local machine not equal to runtime version calculated
 *   during build.                              ← Configure expo-updates (fixed in config)
 *   Could not find target 'StarterKitDev' in project.pbxproj
 *                                              ← Configure Xcode project
 *
 * Whether the profile's eas.json `env` block reaches the local evaluation has varied
 * between eas-cli versions, so it cannot be relied on: CI (pinned 20.5.1) has always been
 * fine, while a locally installed CLI has not. Setting the variable ourselves makes it
 * true everywhere, on every version. `development`, `development-device`, `uat` and every
 * `huawei-*` profile all drift without it; `preview` and `e2e` happen not to.
 *
 * Usage — always via the npm scripts, so no one has to remember this:
 *   npm run build:dev:ios -w apps/expo
 *   node scripts/eas-build.mjs --profile <profile> --platform <ios|android> [eas flags…]
 */

import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const profileIndex = args.findIndex((arg) => arg === '--profile' || arg === '-e');
const profile = profileIndex === -1 ? undefined : args[profileIndex + 1];

if (!profile) {
  console.error(
    'eas-build: --profile <name> is required — it is what this wrapper exports as\n' +
      'EAS_BUILD_PROFILE so the local app.config.js evaluation matches the builder.',
  );
  process.exit(1);
}

// An explicit, conflicting value in the environment is a mistake worth naming rather than
// silently overriding: it would build one profile's binary under another's identity.
const inherited = process.env.EAS_BUILD_PROFILE;
if (inherited && inherited !== profile) {
  console.error(
    `eas-build: EAS_BUILD_PROFILE is already set to "${inherited}" but --profile says ` +
      `"${profile}". Unset it, or run the profile it names.`,
  );
  process.exit(1);
}

// One command string through the shell: Windows needs a shell to resolve the `eas.cmd`
// shim on PATH, and Node ≥ 24 warns (DEP0190) when an args array is combined with
// `shell: true`, since it would concatenate them unescaped anyway. Quoting them
// ourselves keeps the pass-through flags intact without the warning.
const quote = (arg) => (/^[\w./:=-]+$/.test(arg) ? arg : `"${arg.replace(/"/g, '\\"')}"`);
const command = ['eas', 'build', ...args].map(quote).join(' ');

console.log(`eas-build: EAS_BUILD_PROFILE=${profile} ${command}`);

const child = spawn(command, {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, EAS_BUILD_PROFILE: profile },
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
