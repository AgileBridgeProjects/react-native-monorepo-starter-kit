/**
 * Shared plumbing for the store-release staging scripts
 * (asc-stage-version.mjs, play-stage-release.mjs).
 *
 * Dependency-free on purpose: these run in CI straight after `npm ci` and must not pull a
 * JWT or Google client library into the workspace for two API calls a release.
 */

import { createPrivateKey, sign as cryptoSign } from 'node:crypto';

export function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

export function base64url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Compact JWS for the two store APIs.
 *   - ES256 (App Store Connect): the signature must be the raw r||s pair (IEEE P1363),
 *     not the DER encoding Node emits by default.
 *   - RS256 (Google service account): PKCS#1 v1.5, Node's default.
 */
export function signJwt({ header, payload, privateKeyPem, algorithm }) {
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const key = createPrivateKey(privateKeyPem);
  const opts = algorithm === 'ES256' ? { key, dsaEncoding: 'ieee-p1363' } : key;
  const signature = cryptoSign('sha256', Buffer.from(signingInput), opts);
  return `${signingInput}.${base64url(signature)}`;
}

/**
 * fetch + JSON with the failure text surfaced. `allow` lists statuses that are a valid
 * answer rather than an error (e.g. 404 = "no review detail yet").
 */
export async function requestJson(url, { method = 'GET', headers = {}, body, allow = [] } = {}) {
  const res = await fetch(url, {
    method,
    headers: { Accept: 'application/json', ...(body !== undefined && { 'Content-Type': 'application/json' }), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }
  if (!res.ok && !allow.includes(res.status)) {
    const detail = json?.errors?.map((e) => `${e.title ?? e.code ?? '?'}: ${e.detail ?? ''}`).join(' | ') ?? json?.error?.message ?? text.slice(0, 400);
    throw new Error(`${method} ${url} → HTTP ${res.status} ${detail}`);
  }
  return { status: res.status, json };
}

export function requireEnv(name, hint = '') {
  const value = process.env[name];
  if (!value) fail(`${name} is required${hint ? ` — ${hint}` : ''}`);
  return value;
}

export function isDryRun() {
  return process.env.DRY_RUN === 'true';
}

/**
 * The per-language listing entries in an AppGallery `app-info` response.
 *
 * Verified against a live app on 2026-09-09: the array is **top-level**
 * (`json.languages`), NOT `json.appInfo.languages` — `appInfo` carries only release/version
 * fields and does not even include the package name for this app. Reading the wrong path
 * yields an empty list, which made the "New features" write a silent no-op. The fallback is
 * kept because AGC's own docs describe the field as nested.
 */
export function agcLanguageEntries(json) {
  const langs = json?.languages ?? json?.appInfo?.languages ?? [];
  return Array.isArray(langs) ? langs.filter((l) => l?.lang) : [];
}

/**
 * Body for `PUT /publish/v2/app-language-info`, preserving the listing text.
 *
 * AGC documents the endpoint as a per-language update but does not say whether omitted
 * optional fields are left alone or cleared, and the docs are not machine-readable to check.
 * Sending the current appName / appDesc / briefInfo back unchanged alongside the new
 * newFeatures makes the answer irrelevant: either way the listing keeps its text.
 */
export function agcLanguageInfoBody(entry, newFeatures) {
  const body = { lang: entry.lang, newFeatures };
  for (const field of ['appName', 'appDesc', 'briefInfo']) {
    const value = entry[field];
    if (typeof value === 'string' && value.length > 0) body[field] = value;
  }
  return body;
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
