#!/usr/bin/env node

/**
 * Fetches the OpenAPI JSON schema from a running backend API and saves it locally.
 *
 * Usage:
 *   node scripts/fetch-openapi.mjs                          # default: http://localhost:5002
 *   node scripts/fetch-openapi.mjs --url http://staging:5001
 *
 * The saved file (openapi/mobile-api.json) is the source of truth for proxy generation.
 * Commit it to the repo so generation works without a running backend.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const urlFlagIndex = args.indexOf('--url');
const baseUrl =
    urlFlagIndex !== -1 && args[urlFlagIndex + 1]
        ? args[urlFlagIndex + 1]
        : 'http://localhost:5001';

const schemaUrl = `${baseUrl}/openapi/v1.json`;
const outputPath = resolve(__dirname, '..', 'openapi', 'mobile-api.json');

async function main() {
    console.log(`Fetching OpenAPI schema from ${schemaUrl}...`);

    const response = await fetch(schemaUrl);

    if (!response.ok) {
        console.error(
            `Failed to fetch schema: ${response.status} ${response.statusText}`,
        );
        console.error(
            'Make sure the backend is running (e.g. docker-compose up or dotnet run).',
        );
        process.exit(1);
    }

    const schema = await response.json();

    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, JSON.stringify(schema, null, 2) + '\n', 'utf-8');

    console.log(`Schema saved to openapi/mobile-api.json`);
}

main().catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
});
