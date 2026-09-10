// Fixture for preflight.test.mjs — stands in for a script that imports preflight.mjs
// while carrying its own command-line arguments (e2e-affected.mjs does exactly this).
//
// preflight.mjs must not read argv at module scope: if it did, running this probe with
// `--suite=banana` would exit 2 from inside the import instead of reaching the log below.

import { parseEnvFile } from './preflight.mjs';

// Use the import so the module is genuinely evaluated, not tree-shaken away.
const parsed = parseEnvFile('PROBE=1\n');
if (parsed.PROBE !== '1') {
  console.error('probe failed: parseEnvFile did not behave as expected');
  process.exit(1);
}

console.log('probe ok');
