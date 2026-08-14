/**
 * check-native-imports.mjs
 *
 * Scans all non-.web.ts(x) source files for top-level value imports of known
 * web-only APIs that self-execute at module evaluation time and crash the
 * Hermes runtime on iOS/Android in production builds.
 *
 * Background: in the dev client Metro lazily loads modules, so these imports
 * are harmless. In a production Hermes bundle every module's top-level code
 * runs at startup — DOM-touching code causes KERN_PROTECTION_FAILURE / SIGBUS.
 *
 * Add new banned exports to BANNED_IMPORTS as they are discovered.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXPO_ROOT = resolve(__dirname, '..');

// All directories that end up in the native bundle — not just src/.
// app/, components/, and hooks/ also ship in the Hermes bundle.
const SCAN_DIRS = ['src', 'app', 'components', 'hooks'].map((d) => resolve(EXPO_ROOT, d));

// Map of module → exports that must not be top-level value-imported in native files.
const BANNED_IMPORTS = {
    'firebase/auth': [
        'RecaptchaVerifier',           // accesses DOM during class definition
        'PhoneAuthProvider',           // instantiates DOM-dependent reCAPTCHA
        'signInWithPopup',             // requires window.open
        'signInWithRedirect',          // requires window.location
        'getRedirectResult',           // requires window.location
        'browserLocalPersistence',
        'browserSessionPersistence',
        'indexedDBLocalPersistence',
        'browserPopupRedirectResolver',
        'GoogleAuthProvider',          // web-only OAuth provider class
        'OAuthProvider',               // web-only OAuth provider class
        'signInWithPhoneNumber',       // web-only phone auth (use @react-native-firebase/auth on native)
    ],
};

const NATIVE_EXTENSIONS = ['.ts', '.tsx'];

/**
 * Returns true if `content` contains a top-level VALUE import of `exportName`
 * from `mod`. Correctly handles both type-erasure forms:
 *   - `import type { X }` — whole-statement type import, safe
 *   - `import { type X, Y }` — inline per-specifier type modifier, X is safe
 */
function hasValueImport(content, mod, exportName) {
    const modEscaped = mod.replace('/', '\\/');
    // Match non-`import type` statements from this module, capturing the specifier list.
    const importRegex = new RegExp(
        `^import\\s+(?!type\\s+)\\{([^}]*)\\}\\s+from\\s+['"]${modEscaped}['"]`,
        'gm',
    );
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        const specifiers = match[1].split(',').map((s) => s.trim()).filter(Boolean);
        for (const spec of specifiers) {
            // Strip inline `type` modifier (e.g. `type X` or `type X as Y`).
            const withoutInlineType = spec.replace(/^type\s+/, '');
            // Strip alias (e.g. `X as Alias`).
            const baseName = withoutInlineType.replace(/\s+as\s+\S+$/, '').trim();
            if (baseName === exportName) return true;
        }
    }
    return false;
}

function walkDir(dir) {
    if (!statSync(dir, { throwIfNoEntry: false })) return [];
    const files = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            files.push(...walkDir(full));
        } else {
            const ext = extname(entry);
            const isNativeFile =
                NATIVE_EXTENSIONS.includes(ext) &&
                !entry.endsWith('.web.ts') &&
                !entry.endsWith('.web.tsx');
            if (isNativeFile) files.push(full);
        }
    }
    return files;
}

const allFiles = SCAN_DIRS.flatMap(walkDir);
let violations = 0;

for (const filePath of allFiles) {
    const content = readFileSync(filePath, 'utf8');
    const rel = relative(process.cwd(), filePath);

    for (const [mod, exports] of Object.entries(BANNED_IMPORTS)) {
        for (const exportName of exports) {
            if (hasValueImport(content, mod, exportName)) {
                console.error(
                    `\n❌ ${rel}\n   Top-level value import of '${exportName}' from '${mod}' crashes Hermes on native.\n   Use \`import type\` or a dynamic import inside a Platform.OS === 'web' guard.\n`,
                );
                violations++;
            }
        }
    }
}

if (violations > 0) {
    console.error(`\n${violations} violation(s) found. Fix them before building for native.\n`);
    process.exit(1);
} else {
    console.log('✔ No banned native imports found.');
}
