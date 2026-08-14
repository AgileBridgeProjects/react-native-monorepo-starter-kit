#!/usr/bin/env node
// Pulls secrets tagged app=expo AND local=true from kv-starterkit-dev into .env.local.
// CI uses the broader app=expo tag (see deploy-mobile-dev.yml and deploy-expo-web-azure-dev.yml)
// and picks up all expo secrets. This script intentionally targets only local=true secrets so
// CI-only vars (e.g. EXPO_PUBLIC_API_URL pointing at the deployed API) are excluded.
//
// EXPO_PUBLIC_API_URL is auto-detected from the machine's LAN IP so physical device testing works
// out of the box. Existing .env.local values are preserved — Key Vault values win for matching keys.
// Run: npm run pull:env  (requires az cli authenticated — run `az login` first)

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
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

console.log(`Fetching secrets from Key Vault (${KV}, tags: app=expo local=true)...`);

const namesJson = azList(
    `keyvault secret list --vault-name ${KV} --query "[?tags.app=='expo' && tags.local=='true'].name" -o json`,
);
const names = JSON.parse(namesJson);

// Zero matches is a valid state — the expo app currently has no local-only secrets
// (Firebase client config is committed to @starterkit/shared, the API URL is auto-detected
// below). Only warn; still write the auto-detected/preserved values. A hard failure is
// reserved for real errors (az not logged in, vault unreachable) handled above.
if (!names.length) {
    console.warn(`  ⚠ No secrets tagged app=expo local=true in ${KV} — writing auto-detected values only.`);
}

// ─── Read existing .env.local (preserve keys not managed by Key Vault) ────────
/** @type {Map<string, string>} */
const existing = new Map();
if (existsSync(ENV_FILE)) {
    for (const line of readFileSync(ENV_FILE, 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        existing.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
    }
}

// ─── Fetch Key Vault secrets (KV wins for matching keys) ──────────────────────
const kvEntries = new Map();
for (const name of names) {
    const value = azSecret(
        `keyvault secret show --vault-name ${KV} --name ${name} --query value -o tsv`,
    );
    const varName = name.toUpperCase().replace(/-/g, '_');
    kvEntries.set(varName, value.trimEnd());
}

// ─── Merge: existing first, then KV overwrites matching keys ──────────────────
const merged = new Map([...existing, ...kvEntries]);

// ─── Auto-detect LAN IP for the local-stack URLs ──────────────────────────────
// A physical dev client / emulator can't reach `localhost` on this machine, so
// point both the MobileApi (:5001) and the local Supabase gateway (Kong, :8000)
// at the machine's LAN IP. Both containers publish on 0.0.0.0, so any device on
// the same WiFi can reach them. GoTrue's token issuer stays localhost:8000
// regardless of the host used to connect, so the backend still validates the
// token. Only set when absent — devs can override (e.g. 10.0.2.2 for the Android
// emulator). The anon key falls back to the committed local demo key in code.
const lanIp = getLanIp();
if (lanIp) {
    if (!merged.has('EXPO_PUBLIC_API_URL')) {
        merged.set('EXPO_PUBLIC_API_URL', `http://${lanIp}:5001`);
        console.log(`  → Auto-detected EXPO_PUBLIC_API_URL=http://${lanIp}:5001`);
    }
    if (!merged.has('EXPO_PUBLIC_SUPABASE_URL')) {
        merged.set('EXPO_PUBLIC_SUPABASE_URL', `http://${lanIp}:8000`);
        console.log(`  → Auto-detected EXPO_PUBLIC_SUPABASE_URL=http://${lanIp}:8000 (local Supabase)`);
    }
    console.log('    (physical device / emulator must share this machine\'s WiFi;');
    console.log('     Android emulator: override both hosts with 10.0.2.2)');
} else {
    console.warn('  ⚠ Could not detect LAN IP — set EXPO_PUBLIC_API_URL / EXPO_PUBLIC_SUPABASE_URL manually for device testing.');
}

const lines = [];
for (const [key, value] of merged) {
    lines.push(`${key}=${value}`);
}

writeFileSync(ENV_FILE, lines.join('\n') + '\n', 'utf8');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the first non-internal IPv4 address, or null if none found. */
function getLanIp() {
    const nets = networkInterfaces();
    for (const ifaces of Object.values(nets)) {
        for (const iface of ifaces) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return null;
}
