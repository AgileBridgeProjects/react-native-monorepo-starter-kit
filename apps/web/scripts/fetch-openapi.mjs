/**
 * Fetch the OpenAPI JSON document from the running WebApi and write it to disk.
 *
 * Usage:
 *   node scripts/fetch-openapi.mjs [--url http://localhost:5002]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, '..', 'openapi', 'web-api.json');

const urlArg = process.argv.indexOf('--url');
const baseUrl = urlArg !== -1 ? process.argv[urlArg + 1] : 'http://localhost:5002';

if (!baseUrl) {
    console.error('Error: --url flag requires a value (e.g. --url http://localhost:5002)');
    process.exit(1);
}
const endpoint = `${baseUrl}/openapi/v1.json`;

console.log(`Fetching OpenAPI schema from ${endpoint}...`);

const response = await fetch(endpoint);
if (!response.ok) {
    console.error(`Failed to fetch: ${response.status} ${response.statusText}`);
    process.exit(1);
}

const schema = await response.json();
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(schema, null, 2) + '\n');
console.log(`Schema saved to openapi/web-api.json`);
