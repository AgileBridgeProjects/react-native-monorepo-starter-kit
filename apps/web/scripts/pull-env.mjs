#!/usr/bin/env node
// Pulls secrets tagged app=web AND local=true from kv-starterkit-dev into .env.local.
// CI uses the broader app=web tag (see deploy-web-azure-dev.yml) and picks up all web secrets.
// This script intentionally excludes CI-only secrets (e.g. NEXT_PUBLIC_API_URL) so local
// dev keeps the code default (localhost:5002).
// Run: npm run pull:env  (requires az cli authenticated — run `az login` first)

import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_FILE = join(__dirname, '..', '.env.local');
const KV = 'kv-starterkit-dev';

function azList(args) {
    return execSync(`az ${args}`, { encoding: 'utf8' }).trimEnd();
}

function azSecret(args) {
    return execSync(`az ${args}`, { encoding: 'utf8' });
}

// Check az CLI is available
try {
    azList('version --output none');
} catch {
    console.error(
        'Error: Azure CLI (az) is not installed or not in PATH. See https://aka.ms/install-azure-cli',
    );
    process.exit(1);
}

console.log(`Fetching secrets from Key Vault (${KV}, tags: app=web local=true)...`);

const namesJson = azList(
    `keyvault secret list --vault-name ${KV} --query "[?tags.app=='web' && tags.local=='true'].name" -o json`,
);
const names = JSON.parse(namesJson);

// Zero matches is a valid state on a young vault. Leave any existing .env.local untouched
// (the app falls back to in-code defaults, e.g. NEXT_PUBLIC_API_URL=http://localhost:5002)
// rather than clobbering it with an empty file. Real errors (az/vault) are handled above.
if (!names.length) {
    console.warn(`  ⚠ No secrets tagged app=web local=true in ${KV} — leaving .env.local unchanged.`);
    process.exit(0);
}

const lines = [];
for (const name of names) {
    const value = azSecret(
        `keyvault secret show --vault-name ${KV} --name ${name} --query value -o tsv`,
    );
    const varName = name.toUpperCase().replace(/-/g, '_');
    lines.push(`${varName}=${value.trimEnd()}`);
}

writeFileSync(ENV_FILE, lines.join('\n') + '\n', 'utf8');
