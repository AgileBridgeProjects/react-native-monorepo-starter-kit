#!/usr/bin/env node
/**
 * CI check: locale JSON values must be neutral sentence-case, and free of em/en dashes.
 *
 * Dashes are rejected because they read as machine-written and translate inconsistently
 * (docs/standards/frontend.md § localization).
 * Fails if any string value is fully uppercase (e.g. "REWARDS", "SIGN IN").
 * Casing is applied in components via Tailwind classes, not baked into translations.
 *
 * Usage: node scripts/check-locale-casing.mjs
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const LOCALE_DIRS = [
  'apps/expo/src/lib/i18n/locales',
  'apps/web/src/lib/i18n/locales',
];

const ALL_CAPS = /^[A-Z][A-Z\s\d!?.,'"-]+$/;
const LONG_DASH = /[—–]/;

/** Walk a directory recursively and return all .json file paths */
async function walkJson(dir) {
  const paths = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        paths.push(...(await walkJson(full)));
      } else if (entry.name.endsWith('.json')) {
        paths.push(full);
      }
    }
  } catch {
    // Directory doesn't exist — skip silently
  }
  return paths;
}

/** Flatten a nested object, collecting all leaf string values with dot-notation keys */
function collectStrings(obj, prefix = '') {
  const results = [];
  for (const [key, value] of Object.entries(obj)) {
    const dotKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      results.push({ key: dotKey, value });
    } else if (typeof value === 'object' && value !== null) {
      results.push(...collectStrings(value, dotKey));
    }
  }
  return results;
}

let violations = 0;

for (const dir of LOCALE_DIRS) {
  const files = await walkJson(dir);
  for (const file of files) {
    const raw = await readFile(file, 'utf-8');
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error(`[locale-casing] Cannot parse JSON: ${file}`);
      violations++;
      continue;
    }

    const strings = collectStrings(parsed);
    for (const { key, value } of strings) {
      // Skip very short values (e.g. single letters, abbreviations like "OK")
      if (value.length <= 3) continue;
      if (ALL_CAPS.test(value.trim())) {
        console.error(
          `[locale-casing] ALL_CAPS value in ${file}\n  ${key}: "${value}"\n  → Use sentence-case; apply uppercase via Tailwind className in the component.`,
        );
        violations++;
      }
      if (LONG_DASH.test(value)) {
        console.error(
          `[locale-casing] em/en dash in ${file}
  ${key}: "${value}"
  → Use a colon, a comma, or a second sentence.`,
        );
        violations++;
      }
    }
  }
}

if (violations > 0) {
  console.error(`\n${violations} locale casing violation(s) found.`);
  process.exit(1);
} else {
  console.log('[locale-casing] All locale values pass casing check.');
}
