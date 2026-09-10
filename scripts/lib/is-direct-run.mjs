/**
 * Was this module executed directly, rather than imported?
 *
 * Every CLI in `scripts/` needs this to decide whether to run `main()`, and the check has one
 * subtlety worth centralising: `import.meta.url` is already realpath-resolved while
 * `process.argv[1]` is not, so a checkout reached through a symlink makes a naive comparison
 * false. The script then prints nothing and exits 0, which every call site reads as a pass —
 * a silent-success failure mode, the worst kind for a gate.
 *
 * @param {string} moduleUrl  the caller's `import.meta.url`
 */
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function isDirectRun(moduleUrl) {
  if (!process.argv[1]) return false;
  try {
    return moduleUrl === pathToFileURL(realpathSync(path.resolve(process.argv[1]))).href;
  } catch {
    return false;
  }
}
